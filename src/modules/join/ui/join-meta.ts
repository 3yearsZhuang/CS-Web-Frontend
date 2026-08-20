/**
 * @file 入社申请状态元数据（重复实现治理波次 C1a：#12）。
 * 收敛 admin-join-panel 与 join-tab 各自维护的 statusLabel/statusVariant 双套映射。
 * labelKey 为 i18n key（'statusPending' 等），由调用方用各自 namespace 的 t() 解析；
 * variant 为 Badge 颜色变体（两处原实现完全一致：pending→amber / approved→success / rejected→danger）。
 */
import type { BadgeVariant } from '@/components';
import type { JoinApplicationStatus } from '../types';

export interface JoinStatusMeta {
  labelKey: 'statusPending' | 'statusApproved' | 'statusRejected';
  variant: BadgeVariant;
}

export function joinStatusMeta(status: JoinApplicationStatus): JoinStatusMeta {
  switch (status) {
    case 'pending':
      return { labelKey: 'statusPending', variant: 'amber' };
    case 'approved':
      return { labelKey: 'statusApproved', variant: 'success' };
    case 'rejected':
      return { labelKey: 'statusRejected', variant: 'danger' };
  }
}
