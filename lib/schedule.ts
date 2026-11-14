import { CalendarEvent } from './types';
import {
  addDaysToDateString,
  getLocalDateString,
  parseLocalDateString,
  parseTimeString,
} from './time';

export type EventTypeKey = 'routine' | 'meeting' | 'food' | 'wellness';

export interface EventTypeStyle {
  label: string;
  dotColor: string;
  accentBar: string;
  lightBg: string;
  lightBorder: string;
  lightText: string;
  darkBg: string;
  darkBorder: string;
  darkText: string;
}

export const EVENT_TYPE_META: Record<EventTypeKey, EventTypeStyle> = {
  routine: {
    label: 'Routine',
    dotColor: '#274E3C',
    accentBar: 'bg-[#274E3C]',
    lightBg: 'bg-[#EFF5ED]',
    lightBorder: 'border-[#D5E3D2]',
    lightText: 'text-[#1E2621]',
    darkBg: 'bg-[#1D2B23]',
    darkBorder: 'border-[#2D4236]',
    darkText: 'text-[#EDEFEA]',
  },
  meeting: {
    label: 'Meeting',
    dotColor: '#2E6B8A',
    accentBar: 'bg-[#2E6B8A]',
    lightBg: 'bg-[#ECF4F8]',
    lightBorder: 'border-[#CDE0EA]',
    lightText: 'text-[#1B323E]',
    darkBg: 'bg-[#192830]',
    darkBorder: 'border-[#29414E]',
    darkText: 'text-[#E5F0F5]',
  },
  food: {
    label: 'Food',
    dotColor: '#C27832',
    accentBar: 'bg-[#C27832]',
    lightBg: 'bg-[#FDF4EA]',
    lightBorder: 'border-[#F0DEC6]',
    lightText: 'text-[#3D2712]',
    darkBg: 'bg-[#2B2118]',
    darkBorder: 'border-[#453424]',
    darkText: 'text-[#F7E8D8]',
  },
  wellness: {
    label: 'Wellness',
    dotColor: '#2E8B63',
    accentBar: 'bg-[#2E8B63]',
    lightBg: 'bg-[#EBF7F1]',
    lightBorder: 'border-[#CBE8DA]',
    lightText: 'text-[#18382B]',
    darkBg: 'bg-[#182B23]',
    darkBorder: 'border-[#274739]',
    darkText: 'text-[#E3F5EC]',
  },
};

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getEventStartMinutes(event: CalendarEvent): number {
  const parsed = parseTimeString(event.startTime);
  if (!parsed) return 9 * 60;
  return parsed.hours * 60 + parsed.minutes;
}

export function getEventEndMinutes(event: CalendarEvent): number {
  const startMin = getEventStartMinutes(event);
  const parsedEnd = parseTimeString(event.endTime);
  if (!parsedEnd) return Math.min(1440, startMin + 60);
  const endMin = parsedEnd.hours * 60 + parsedEnd.minutes;
  return endMin > startMin ? Math.min(1440, endMin) : Math.min(1440, startMin + 60);
}

export function eventOccursOnDate(event: CalendarEvent, targetDateStr: string): boolean {
  if (!event.date || !targetDateStr) return false;
  if (targetDateStr < event.date) return false;
  if (event.skippedDates?.includes(targetDateStr)) return false;
  if (event.repeatEndDate && targetDateStr > event.repeatEndDate) return false;

  const repeat = event.repeat || 'none';
  if (repeat === 'none') {
    return event.date === targetDateStr;
  }

  const targetDate = parseLocalDateString(targetDateStr);
  const anchorDate = parseLocalDateString(event.date);
  if (!targetDate || !anchorDate) return event.date === targetDateStr;

  const targetDay = targetDate.getDay();
  if (repeat === 'daily') return true;
  if (repeat === 'weekdays') return targetDay >= 1 && targetDay <= 5;
  if (repeat === 'weekly') return targetDay === anchorDate.getDay();
  if (repeat === 'custom') {
    return Array.isArray(event.repeatDays) && event.repeatDays.includes(targetDay);
  }
  return event.date === targetDateStr;
}

export function getEventsForDate(events: CalendarEvent[], dateStr: string): CalendarEvent[] {
  return events
    .filter((e) => eventOccursOnDate(e, dateStr))
    .sort((a, b) => {
      const aAllDay = Boolean(a.allDay);
      const bAllDay = Boolean(b.allDay);
      if (aAllDay !== bAllDay) return aAllDay ? -1 : 1;
      const diff = getEventStartMinutes(a) - getEventStartMinutes(b);
      if (diff !== 0) return diff;
      return a.title.localeCompare(b.title);
    });
}

export function formatRepeatSummary(event: CalendarEvent): string | null {
  const repeat = event.repeat || 'none';
  if (repeat === 'none') return null;
  if (repeat === 'daily') return 'Repeats daily';
  if (repeat === 'weekdays') return 'Weekdays (Mon–Fri)';
  if (repeat === 'weekly') return 'Repeats weekly';
  if (repeat === 'custom') {
    const days = Array.isArray(event.repeatDays) ? [...event.repeatDays].sort((a, b) => a - b) : [];
    if (days.length === 0) return 'Custom repeat';
    return `Every ${days.map((d) => SHORT_WEEKDAYS[d] || '').filter(Boolean).join(', ')}`;
  }
  return null;
}

export interface UpcomingEventOccurrence {
  event: CalendarEvent;
  occurrenceDate: string;
  triggerDate: Date;
}

export function getUpcomingEventOccurrences(
  events: CalendarEvent[],
  fromDate: Date = new Date(),
  horizonDays = 14
): UpcomingEventOccurrence[] {
  const startDateStr = getLocalDateString(fromDate);
  const nowMs = fromDate.getTime();
  const results: UpcomingEventOccurrence[] = [];

  for (const event of events) {
    if (!event.remindMe || event.allDay || !event.startTime) continue;
    const parsedTime = parseTimeString(event.startTime);
    if (!parsedTime) continue;

    const repeat = event.repeat || 'none';
    if (repeat === 'none') {
      if (!event.date || event.skippedDates?.includes(event.date)) continue;
      const d = parseLocalDateString(event.date);
      if (!d) continue;
      const triggerDate = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        parsedTime.hours,
        parsedTime.minutes,
        0,
        0
      );
      if (triggerDate.getTime() > nowMs) {
        results.push({ event, occurrenceDate: event.date, triggerDate });
      }
      continue;
    }

    for (let offset = 0; offset <= horizonDays; offset++) {
      const occurrenceDate = addDaysToDateString(startDateStr, offset);
      if (!eventOccursOnDate(event, occurrenceDate)) continue;
      const d = parseLocalDateString(occurrenceDate);
      if (!d) continue;
      const triggerDate = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        parsedTime.hours,
        parsedTime.minutes,
        0,
        0
      );
      if (triggerDate.getTime() > nowMs) {
        results.push({ event, occurrenceDate, triggerDate });
      }
    }
  }

  return results;
}

export interface PositionedTimedEvent {
  event: CalendarEvent;
  startMin: number;
  endMin: number;
  topPx: number;
  heightPx: number;
  colIndex: number;
  totalCols: number;
}

/**
 * Computes non-overlapping column positions for timed events in an hourly day grid.
 */
export function computeTimedEventLayout(
  timedEvents: CalendarEvent[],
  startHour: number,
  hourHeightPx: number
): PositionedTimedEvent[] {
  if (timedEvents.length === 0) return [];

  const gridStartMin = startHour * 60;
  const normalized = timedEvents
    .map((event) => {
      const startMin = getEventStartMinutes(event);
      const endMin = getEventEndMinutes(event);
      const visualEndMin = Math.min(1440, Math.max(endMin, startMin + 30));
      return { event, startMin, endMin, visualEndMin };
    })
    .sort((a, b) => {
      if (a.startMin !== b.startMin) return a.startMin - b.startMin;
      return b.visualEndMin - a.visualEndMin;
    });

  // Group into connected collision clusters
  const clusters: Array<typeof normalized> = [];
  let currentCluster: typeof normalized = [];
  let clusterMaxEnd = -1;

  for (const item of normalized) {
    if (currentCluster.length === 0 || item.startMin < clusterMaxEnd) {
      currentCluster.push(item);
      clusterMaxEnd = Math.max(clusterMaxEnd, item.visualEndMin);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterMaxEnd = item.visualEndMin;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const positioned: PositionedTimedEvent[] = [];

  for (const cluster of clusters) {
    const colEndTimes: number[] = [];
    const assigned: Array<(typeof normalized)[number] & { colIndex: number }> = [];

    for (const item of cluster) {
      let assignedCol = colEndTimes.findIndex((lastEnd) => lastEnd <= item.startMin);
      if (assignedCol === -1) {
        assignedCol = colEndTimes.length;
        colEndTimes.push(item.visualEndMin);
      } else {
        colEndTimes[assignedCol] = item.visualEndMin;
      }
      assigned.push({ ...item, colIndex: assignedCol });
    }

    const totalCols = Math.max(1, colEndTimes.length);
    for (const item of assigned) {
      const clampedStart = Math.max(item.startMin, gridStartMin);
      const topPx = ((clampedStart - gridStartMin) / 60) * hourHeightPx;
      const rawHeightPx = ((item.visualEndMin - clampedStart) / 60) * hourHeightPx;
      const heightPx = Math.max(28, rawHeightPx);

      positioned.push({
        event: item.event,
        startMin: item.startMin,
        endMin: item.endMin,
        topPx,
        heightPx,
        colIndex: item.colIndex,
        totalCols,
      });
    }
  }

  return positioned;
}

