import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { MailDomain } from './mail-domain.entity.js';

export enum AliasType {
  FORWARD = 'FORWARD',
  LOCAL = 'LOCAL',
  CATCH_ALL = 'CATCH_ALL',
  GROUP = 'GROUP',
}

@Entity('mail_aliases')
@Index(['mailDomainId', 'source'], { unique: true })
@Index(['source'])
export class MailAlias extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  source!: string;

  @Column({ type: 'simple-array' })
  destinations!: string[];

  @Column({
    type: 'enum',
    enum: AliasType,
    default: AliasType.FORWARD,
  })
  type!: AliasType;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'uuid' })
  mailDomainId!: string;

  @ManyToOne(() => MailDomain, (domain) => domain.aliases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mailDomainId' })
  mailDomain!: MailDomain;
}
