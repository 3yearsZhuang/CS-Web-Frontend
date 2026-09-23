import { describe, it, expect } from 'vitest';
import {
  parseEventDate,
  getEventTimestamp,
  compareEvents,
  getEventYear,
  groupEventsByYear,
  type SortableEvent,
} from '@/shared/utils/event-date';

describe('event-sorting and timeline grouping', () => {
  describe('getEventTimestamp', () => {
    it('parses YYYY-MM-DD, YYYY.MM.DD and YYYY/MM/DD correctly', () => {
      const tsDash = getEventTimestamp('2026-08-21');
      const tsDot = getEventTimestamp('2026.08.21');
      const tsSlash = getEventTimestamp('2026/08/21');

      expect(tsDash).toBeGreaterThan(0);
      expect(tsDash).toBe(tsDot);
      expect(tsDash).toBe(tsSlash);
    });

    it('returns -Infinity for invalid or empty dates', () => {
      expect(getEventTimestamp(null)).toBe(Number.NEGATIVE_INFINITY);
      expect(getEventTimestamp('')).toBe(Number.NEGATIVE_INFINITY);
      expect(getEventTimestamp('invalid-date')).toBe(Number.NEGATIVE_INFINITY);
    });
  });

  describe('getEventYear', () => {
    it('prefers explicit year property', () => {
      const event: SortableEvent = { year: '2025', date: '2026-08-21' };
      expect(getEventYear(event)).toBe('2025');
    });

    it('derives year from date if year is missing', () => {
      const event: SortableEvent = { date: '2026-08-21' };
      expect(getEventYear(event)).toBe('2026');
    });

    it('derives year from month if date and year are missing', () => {
      const event: SortableEvent = { month: '2024-05' };
      expect(getEventYear(event)).toBe('2024');
    });

    it('falls back to custom label when no year information is available', () => {
      const event: SortableEvent = { id: 1 };
      expect(getEventYear(event, '未分类')).toBe('未分类');
    });
  });

  describe('compareEvents', () => {
    it('places pinned events before unpinned events', () => {
      const unpinnedNewer = { id: 1, date: '2026-09-10', isPinned: false };
      const pinnedOlder = { id: 2, date: '2026-08-21', isPinned: true };

      expect(compareEvents(pinnedOlder, unpinnedNewer)).toBeLessThan(0);
      expect(compareEvents(unpinnedNewer, pinnedOlder)).toBeGreaterThan(0);
    });

    it('sorts non-pinned events by date descending', () => {
      const sept = { id: 4, date: '2026-09-10', isPinned: false };
      const aug21 = { id: 1, date: '2026-08-21', isPinned: false };
      const aug15 = { id: 2, date: '2026-08-15', isPinned: false };
      const july = { id: 3, date: '2026-07-30', isPinned: false };

      const list = [july, aug21, sept, aug15];
      list.sort(compareEvents);

      expect(list.map((e) => e.id)).toEqual([4, 1, 2, 3]);
    });

    it('sorts events with valid dates before events with missing dates', () => {
      const valid = { id: 1, date: '2026-01-01' };
      const noDate = { id: 2, date: null };

      expect(compareEvents(valid, noDate)).toBeLessThan(0);
      expect(compareEvents(noDate, valid)).toBeGreaterThan(0);
    });

    it('breaks ties on equal dates by ID descending', () => {
      const evA = { id: 10, date: '2026-08-15' };
      const evB = { id: 20, date: '2026-08-15' };

      expect(compareEvents(evA, evB)).toBeGreaterThan(0);
      expect(compareEvents(evB, evA)).toBeLessThan(0);
    });
  });

  describe('groupEventsByYear', () => {
    it('correctly resolves timeline disorder from mock data', () => {
      const mockEvents = [
        {
          id: 1,
          date: '2026-08-21',
          isPinned: true,
          title: '前端工程化实践分享',
        },
        {
          id: 2,
          date: '2026-08-15',
          isPinned: false,
          title: 'AI 辅助开发工作坊',
        },
        {
          id: 3,
          date: '2026-07-30',
          isPinned: false,
          title: '夏季算法集训营',
        },
        {
          id: 4,
          date: '2026-09-10',
          isPinned: false,
          title: '2026 秋季纳新宣讲会',
        },
      ];

      const { uncategorized, yearGroups } = groupEventsByYear(mockEvents, '未分类');

      expect(uncategorized).toHaveLength(0);
      expect(yearGroups).toHaveLength(1);
      expect(yearGroups[0].year).toBe('2026');

      // 验证顺序：置顶活动 (1) 优先，随后 9月 (4) -> 8月 (2) -> 7月 (3)
      const sortedIds = yearGroups[0].events.map((e) => e.id);
      expect(sortedIds).toEqual([1, 4, 2, 3]);
    });

    it('correctly categorizes and orders multi-year events with missing year fields', () => {
      const events = [
        { id: 1, date: '2024-05-01' }, // 没有 year 字段，推导为 2024
        { id: 2, date: '2026-01-10' }, // 2026
        { id: 3, date: '2025-12-31' }, // 2025
        { id: 4, date: null, year: null }, // 未分类
      ];

      const { uncategorized, yearGroups } = groupEventsByYear(events, '未分类');

      expect(uncategorized.map((e) => e.id)).toEqual([4]);
      expect(yearGroups.map((g) => g.year)).toEqual(['2026', '2025', '2024']);
      expect(yearGroups[0].events[0].id).toBe(2);
      expect(yearGroups[1].events[0].id).toBe(3);
      expect(yearGroups[2].events[0].id).toBe(1);
    });
  });
});
