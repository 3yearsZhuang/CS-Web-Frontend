/**
 * @file iCalendar (.ics) 日历文件生成器与下载工具 (RFC 5545)
 */

import { parseEventDate } from './event-date';

export interface CalendarEventData {
  id: string | number;
  title: string;
  date: string | null;
  description?: string | null;
  location?: string | null;
}

/**
 * 格式化时间戳为 iCal 紧凑 UTC 格式 (YYYYMMDDTHHMMSSZ)
 */
function formatUtcTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

/**
 * 格式化纯日期为 YYYYMMDD
 */
function formatDateOnly(year: number, monthZeroBased: number, day: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}${pad(monthZeroBased + 1)}${pad(day)}`;
}

/**
 * 转义 iCalendar 文本字段中的特殊字符 (\, ;, ,, \n)
 */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * 生成标准 RFC 5545 iCalendar 文件内容
 */
export function generateIcsContent(event: CalendarEventData): string {
  const parsed = parseEventDate(event.date);
  const now = new Date();
  const dtstamp = formatUtcTimestamp(now);
  const uid = `event-${event.id}-${now.getTime()}@cs-web`;

  let dateLines = '';
  if (parsed) {
    const startDate = formatDateOnly(parsed.year, parsed.month, parsed.day);
    // 全天事件的 DTEND 按 RFC 5545 为排他（第二天）
    const nextDay = new Date(parsed.year, parsed.month, parsed.day + 1);
    const endDate = formatDateOnly(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate());
    dateLines = `DTSTART;VALUE=DATE:${startDate}\r\nDTEND;VALUE=DATE:${endDate}`;
  } else {
    // 未指定有效日期时，默认以当前时间作为事件起止
    const dt = formatUtcTimestamp(now);
    dateLines = `DTSTART:${dt}\r\nDTEND:${dt}`;
  }

  const summary = escapeIcsText(event.title || '活动');
  const description = event.description ? escapeIcsText(event.description) : '';
  const location = event.location ? escapeIcsText(event.location) : '';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CS-Web//Event Calendar//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    dateLines,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : '',
    location ? `LOCATION:${location}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n') + '\r\n';
}

/**
 * 触发浏览器安全下载 .ics 日历文件
 */
export function downloadIcsFile(event: CalendarEventData): void {
  const icsContent = generateIcsContent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeFilename = (event.title || 'event')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .slice(0, 30);
  a.download = `${safeFilename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
