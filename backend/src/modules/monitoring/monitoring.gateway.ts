import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { MetricsService } from './metrics.service';
import type { AlertInstance } from './entities/alert-instance.entity';
import type { AlertRule } from './entities/alert-rule.entity';

@WebSocketGateway({
  namespace: '/monitoring',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class MonitoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MonitoringGateway.name);
  private subscribedClients: Set<string> = new Set();

  constructor(private metricsService: MetricsService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.subscribedClients.delete(client.id);
  }

  @SubscribeMessage('subscribe:metrics')
  handleSubscribeMetrics(client: Socket) {
    this.subscribedClients.add(client.id);
    this.logger.log(`Client ${client.id} subscribed to metrics`);
    return { subscribed: true };
  }

  @SubscribeMessage('unsubscribe:metrics')
  handleUnsubscribeMetrics(client: Socket) {
    this.subscribedClients.delete(client.id);
    this.logger.log(`Client ${client.id} unsubscribed from metrics`);
    return { subscribed: false };
  }

  @Interval(5000)
  async broadcastMetrics() {
    if (this.subscribedClients.size === 0) {
      return;
    }

    try {
      const metrics = await this.metricsService.getCurrentMetrics();
      this.server.emit('metrics:update', metrics);
    } catch (error) {
      this.logger.error(`Failed to broadcast metrics: ${error}`);
    }
  }

  @OnEvent('alert.fired')
  handleAlertFired(payload: { alert: AlertInstance; rule: AlertRule }) {
    this.server.emit('alert:fired', {
      id: payload.alert.id,
      ruleName: payload.rule.name,
      severity: payload.rule.severity,
      value: payload.alert.value,
      threshold: payload.alert.threshold,
      firedAt: payload.alert.firedAt,
      context: payload.alert.context,
    });
  }

  @OnEvent('alert.resolved')
  handleAlertResolved(payload: { alert: AlertInstance; rule: AlertRule }) {
    this.server.emit('alert:resolved', {
      id: payload.alert.id,
      ruleName: payload.rule.name,
      resolvedAt: payload.alert.resolvedAt,
    });
  }
}
