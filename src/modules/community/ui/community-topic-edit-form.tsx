/**
 * @file 主题编辑表单 — 标题 + 正文 Markdown 编辑器 + 保存/取消
 */
'use client';

import { useState } from 'react';
import { RevealItem } from '@/components/effects/motion-primitives';
import { MarkdownEditor } from './community-markdown-editor';
import { Button } from '@/components';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import type { CommunityPostDetail } from '@/modules/community/types';
import { useTranslations } from 'next-intl';

interface TopicEditFormProps {
  topic: CommunityPostDetail;
  onCancel: () => void;
  onSaved: (topic: CommunityPostDetail) => void;
}

export function TopicEditForm({ topic, onCancel, onSaved }: TopicEditFormProps) {
  const t = useTranslations('communityCommon');
  const [editTitle, setEditTitle] = useState(topic.title);
  const [editContent, setEditContent] = useState(topic.contentMarkdown);
  const [savingTopic, setSavingTopic] = useState(false);
  const [topicEditError, setTopicEditError] = useState<string | null>(null);

  const handleSave = async () => {
    setSavingTopic(true);
    setTopicEditError(null);
    try {
      const res = await fetch(`/api/community/topics/${topic.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          contentMarkdown: editContent,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? t('saveFailed'));
      }
      const data = (await res.json()) as { topic: CommunityPostDetail };
      onSaved(data.topic);
    } catch (err) {
      setTopicEditError(err instanceof Error ? err.message : t('saveFailed'));
    } finally {
      setSavingTopic(false);
    }
  };

  return (
    <RevealItem>
      <div className="space-y-4">
        <div>
          <div className="meta-mono mb-2">Title</div>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            maxLength={120}
            className={`${INPUT_CLASS} w-full px-4 py-3 text-[16px]`}
          />
        </div>
        <div>
          <div className="meta-mono mb-2">Content</div>
          <MarkdownEditor
            value={editContent}
            onChange={setEditContent}
            minHeight={300}
          />
        </div>
        {topicEditError && (
          <div className="meta-mono text-[var(--destructive)]">
            {topicEditError}
          </div>
        )}
        <div className="flex gap-3">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={savingTopic}
          >
            {savingTopic ? 'Saving...' : 'Save'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onCancel}
            disabled={savingTopic}
          >
            Cancel
          </Button>
        </div>
      </div>
    </RevealItem>
  );
}
