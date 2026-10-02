import { describe, it, expect } from 'vitest';
import { generateIcsContent, escapeIcsText } from '@/shared/utils/ics-generator';

describe('ics-generator', () => {
  it('escapes special characters correctly according to RFC 5545', () => {
    expect(escapeIcsText('Hello, World; test\nnewline')).toBe('Hello\\, World\\; test\\nnewline');
  });

  it('generates valid all-day event for date string', () => {
    const ics = generateIcsContent({
      id: '123',
      title: 'CS 研讨会',
      date: '2026.09.25',
      description: '探讨分布式系统',
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:CS 研讨会');
    expect(ics).toContain('DESCRIPTION:探讨分布式系统');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260925');
    expect(ics).toContain('DTEND;VALUE=DATE:20260926');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('handles empty description and fallback when date is invalid', () => {
    const ics = generateIcsContent({
      id: '456',
      title: '未定时间活动',
      date: null,
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:未定时间活动');
    expect(ics).toContain('DTSTART:');
    expect(ics).toContain('END:VCALENDAR');
  });
});
