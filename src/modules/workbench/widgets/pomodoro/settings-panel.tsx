/**
 * @file 番茄钟配置面板：时长设置 + 各阶段音源选择（复用项目 Input 组件）。
 */
'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/primitives/input';
import type { PomodoroSettings, SoundSource } from '../../types';
import { AMBIENT_KINDS, DURATION_FIELDS } from './constants';

interface Props {
  settings: PomodoroSettings;
  musicItems: { id: string; name: string }[];
  onChangeDuration: (key: keyof PomodoroSettings, value: number) => void;
  onChangeSound: (phaseKey: 'focusSound' | 'breakSound' | 'longBreakSound', source: SoundSource) => void;
}

export function SettingsPanel({ settings, musicItems, onChangeDuration, onChangeSound }: Props) {
  const t = useTranslations('workbench');

  const soundOptions = (
    <>
      {AMBIENT_KINDS.map((k) => (
        <option key={k.value} value={k.value}>
          {t(k.labelKey as Parameters<typeof t>[0])}
        </option>
      ))}
      {musicItems.map((m) => (
        <option key={m.id} value={`upload:${m.id}`}>
          {t('myMusic')} · {m.name}
        </option>
      ))}
    </>
  );

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3">
      <div className="grid grid-cols-4 gap-2">
        {DURATION_FIELDS.map((field) => (
          <label
            key={field.key}
            className="flex flex-col gap-1 text-[11px] text-[var(--muted-foreground)]"
          >
            <span className="truncate">{field.key}</span>
            <Input
              type="number"
              min={field.min}
              max={field.max}
              value={settings[field.key]}
              onChange={(e) => {
                const num = Math.max(
                  field.min,
                  Math.min(field.max, Number(e.target.value) || field.min),
                );
                onChangeDuration(field.key as keyof PomodoroSettings, num);
              }}
            />
          </label>
        ))}
      </div>
      {(
        [
          ['focusSound', t('focusPhase')],
          ['breakSound', t('shortBreakPhase')],
          ['longBreakSound', t('longBreakPhase')],
        ] as const
      ).map(([phaseKey, label]) => (
        <label
          key={phaseKey}
          className="flex items-center justify-between gap-2 text-[13px] text-[var(--muted-foreground)]"
        >
          <span>{label}</span>
          <Input
            as="select"
            className="w-auto"
            value={settings[phaseKey]}
            onChange={(e) => onChangeSound(phaseKey, e.target.value as SoundSource)}
          >
            {soundOptions}
          </Input>
        </label>
      ))}
    </div>
  );
}
