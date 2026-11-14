/**
 * @file 管理端「组织 / 财务」面板容器 — 两个子视图切换
 */
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { RevealItem } from '@/components/effects/motion-primitives';
import { AdminFinanceView } from './admin-finance-view';
import { AdminOrganizationView } from './admin-organization-view';

type OpsSubTab = 'finance' | 'organization';

export function AdminOpsPanel() {
  const t = useTranslations('adminOps');
  const [subTab, setSubTab] = useState<OpsSubTab>('finance');

  return (
    <>
      <RevealItem>
        <div className="border-t border-[var(--border)] border-b border-[var(--border)] py-4 mb-0">
          <div className="flex items-center gap-1 overflow-x-auto">
            {(
              [
                { key: 'finance', num: '01', label: t('finTab') },
                { key: 'organization', num: '02', label: t('orgTab') },
              ] as const
            ).map((meta) => (
              <button
                key={meta.key}
                type="button"
                onClick={() => setSubTab(meta.key)}
                className={`tab-underline focus-ring whitespace-nowrap ${
                  subTab === meta.key ? 'tab-underline-active' : ''
                }`}
              >
                [ {meta.num} ] {meta.label}
              </button>
            ))}
          </div>
        </div>
      </RevealItem>

      <div className="pt-8">
        {subTab === 'finance' ? <AdminFinanceView /> : <AdminOrganizationView />}
      </div>
    </>
  );
}
