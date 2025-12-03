import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory, AppAbility } from '../casl-ability.factory.js';
import { CHECK_POLICIES_KEY, PolicyHandler } from '../decorators/check-policies.decorator.js';
import { UserRole } from '../../users/entities/user.entity.js';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  parentResellerId?: string;
}

interface AuthenticatedRequest {
  user?: AuthenticatedUser;
}

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers =
      this.reflector.get<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || [];

    if (policyHandlers.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const ability = this.caslAbilityFactory.createForUser({
      id: user.id,
      role: user.role,
      parentResellerId: user.parentResellerId,
    });

    const isAllowed = policyHandlers.every((handler) =>
      this.execPolicyHandler(handler, ability),
    );

    if (!isAllowed) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  private execPolicyHandler(
    handler: PolicyHandler,
    ability: AppAbility,
  ): boolean {
    if (typeof handler === 'function') {
      return handler(ability);
    }
    return handler.handle(ability);
  }
}
