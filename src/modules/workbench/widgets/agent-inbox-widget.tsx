/**
 * @file Agent 收件箱 widget（AG-P3-01）——工作台统一展示 pending 建议，
 * 接受 / 忽略 / 稍后处理全程可追踪（处理后本地移除，后端状态机记痕）。
 */
'use client';

import { useTranslations } from 'next-intl';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/primitives/button';
// 深路径导入：绕开 @/components barrel（其 feedback/fallback → server-only monitoring 链）
import { EmptyState } from '@/components/feedback/empty-state';
import { WorkbenchCard } from '../workbench-card';
import { useAgentInbox } from '../../agent/hooks/use-agent-inbox';
import type { AgentInboxItem, InboxAction } from '../../agent/types';

/** 建议类型 → i18n 词条 key（未注册类型回退原值，防 Agent 扩枚举时 UI 失明） */
const TYPE_KEYS: Record<string, string> = {
  review_due: 'inboxTypeReviewDue',
  resource_recommend: 'inboxTypeResourceRecommend',
  goal_nudge: 'inboxTypeGoalNudge',
  community_digest: 'inboxTypeCommunityDigest',
  system_hint: 'inboxTypeSystemHint',
};

function ItemRow({
  item,
  acting,
  onAct,
}: {
  item: AgentInboxItem;
  acting: boolean;
  onAct: (id: number, action: InboxAction, snoozeMinutes?: number) => void;
}) {
  const t = useTranslations('workbench');
  const typeLabel = t(TYPE_KEYS[item.type] ?? (item.type as never));
  return (
    <li className="border-b border-[var(--border)] py-3 last:border-b-0" data-testid={`inbox-item-${item.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="meta-mono text-[10px] uppercase tracking-[0.14em] text-[var(--primary)]">
              {typeLabel}
            </span>
            {item.estimatedMinutes != null && (
              <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                ~{item.estimatedMinutes} {t('agentInboxMinutesUnit')}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-[14px] font-medium text-[var(--foreground)]" title={item.title}>
            {item.title}
          </p>
          {item.reason && (
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-[1.6] text-[var(--muted-foreground)]">
              {item.reason}
            </p>
          )}
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <Button size="xs" disabled={acting} onClick={() => onAct(item.id, 'accept')}>
          {t('agentInboxAccept')}
        </Button>
        <Button size="xs" variant="ghost" disabled={acting} onClick={() => onAct(item.id, 'snooze', 30)}>
          {t('agentInboxSnooze')}
        </Button>
        <Button size="xs" variant="ghost" disabled={acting} onClick={() => onAct(item.id, 'dismiss')}>
          {t('agentInboxDismiss')}
        </Button>
      </div>
    </li>
  );
}

/** 工作台 · Agent 收件箱卡片 */
export default function AgentInboxWidget() {
  const t = useTranslations('workbench');
  const { items, loading, error, actingId, act, reload } = useAgentInbox();

  return (
    <WorkbenchCard corner="AGT" title={t('agentInboxTitle')}>
      <div aria-busy={loading}>
        {error && (
          <p className="py-2 text-[12px] text-[var(--muted-foreground)]" role="alert">
            {error}
            <button type="button" className="ml-2 underline" onClick={() => void reload()}>
              {t('agentInboxRetry')}
            </button>
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <EmptyState
            label={t('agentInboxEmpty')}
            message={t('agentInboxEmptyHint')}
            className="py-8"
          />
        )}
        {items.length > 0 && (
          <>
            <ul className="mt-1">
              {items.map((it) => (
                <ItemRow key={it.id} item={it} acting={actingId === it.id} onAct={(id, a, m) => void act(id, a, m)} />
              ))}
            </ul>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
              <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
              {t('agentInboxFooterHint')}
            </p>
          </>
        )}
      </div>
    </WorkbenchCard>
  );
}
