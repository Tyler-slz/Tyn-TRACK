/**
 * Utilities for real-time clock, date formatting, and schedule positioning
 * Using STRICT LOCAL TIMEZONE (never UTC toISOString) to prevent timezone drift bugs.
 */
import type { Task } from './types';

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeFormatted(date: Date = new Date()): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 -> 12
  const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours}:${minStr}`;
}

export function getCurrentTimeWithPeriod(date: Date = new Date()): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours}:${minStr} ${ampm}`;
}

export function getCurrentDateHeader(date: Date = new Date()): string {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

export function getCurrentMonthYear(date: Date = new Date()): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function getTodayShort(date: Date = new Date()): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Today, ${months[date.getMonth()]} ${date.getDate()}`;
}

export function parseLocalDateString(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addDaysToDateString(dateStr: string, deltaDays: number): string {
  const base = parseLocalDateString(dateStr) || new Date();
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + deltaDays);
  return getLocalDateString(next);
}

/**
 * Returns the Monday-Sunday week containing anchorDateStr using LOCAL calendar
 */
export function getWeekDaysForDate(anchorDateStr: string, todayStr?: string) {
  const baseDate = parseLocalDateString(anchorDateStr) || new Date();
  const effectiveToday = todayStr || getLocalDateString(new Date());
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const fullNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const currentDayOfWeek = baseDate.getDay(); // 0 is Sunday, 1 is Monday
  const distanceToMonday = (currentDayOfWeek + 6) % 7;

  const monday = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() - distanceToMonday
  );

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dateStr = getLocalDateString(d);
    days.push({
      day: dayNames[d.getDay()],
      date: d.getDate(),
      full: fullNames[d.getDay()],
      dateStr,
      isToday: dateStr === effectiveToday,
      rawDate: d,
    });
  }
  return days;
}

/**
 * Returns current week days centered around today using LOCAL calendar
 */
export function getCurrentWeekDays(baseDate: Date = new Date()) {
  return getWeekDaysForDate(getLocalDateString(baseDate), getLocalDateString(baseDate));
}

export function getMonthCalendarGrid(year: number, monthIndex: number, todayStr?: string) {
  const effectiveToday = todayStr || getLocalDateString(new Date());
  const firstOfMonth = new Date(year, monthIndex, 1);
  const distanceToMonday = (firstOfMonth.getDay() + 6) % 7;
  const startCell = new Date(year, monthIndex, 1 - distanceToMonday);

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startCell.getFullYear(), startCell.getMonth(), startCell.getDate() + i);
    const dateStr = getLocalDateString(d);
    cells.push({
      date: d.getDate(),
      dateStr,
      inCurrentMonth: d.getMonth() === monthIndex,
      isToday: dateStr === effectiveToday,
    });
  }
  return cells;
}

export function getMonthYearFromDateStr(dateStr: string): string {
  const parsed = parseLocalDateString(dateStr);
  return parsed ? getCurrentMonthYear(parsed) : getCurrentMonthYear(new Date());
}

export function formatDateHumanLabel(dateStr: string, todayStr: string): string {
  const parsed = parseLocalDateString(dateStr);
  if (!parsed) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const shortMd = `${months[parsed.getMonth()]} ${parsed.getDate()}`;

  if (dateStr === todayStr) return `Today, ${shortMd}`;
  if (dateStr === addDaysToDateString(todayStr, 1)) return `Tomorrow, ${shortMd}`;
  if (dateStr === addDaysToDateString(todayStr, -1)) return `Yesterday, ${shortMd}`;
  return `${days[parsed.getDay()]}, ${shortMd}`;
}

export function formatMinutesTo12h(totalMinutes: number): string {
  const clamped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(clamped / 60);
  const m = clamped % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function timeStringTo24hInput(timeStr?: string, fallback = '09:00'): string {
  if (!timeStr) return fallback;
  const parsed = parseTimeString(timeStr);
  if (!parsed) return fallback;
  return `${String(parsed.hours).padStart(2, '0')}:${String(parsed.minutes).padStart(2, '0')}`;
}

export function formatTime24To12(time24?: string, fallback = '12:00 PM'): string {
  if (!time24 || !time24.includes(':')) return fallback;
  const parsed = parseTimeString(time24);
  if (!parsed) return fallback;
  return formatMinutesTo12h(parsed.hours * 60 + parsed.minutes);
}

/**
 * Computes the next YYYY-MM-DD occurrence for a repeating task using local calendar arithmetic.
 */
export function getNextTaskRepeatDate(
  baseDateStr: string,
  repeat: 'daily' | 'weekdays' | 'weekly',
  todayStr: string
): string {
  const anchor = baseDateStr && baseDateStr > todayStr ? baseDateStr : todayStr;
  if (repeat === 'weekly') {
    return addDaysToDateString(anchor, 7);
  }
  if (repeat === 'weekdays') {
    for (let offset = 1; offset <= 4; offset++) {
      const candidateStr = addDaysToDateString(anchor, offset);
      const parsed = parseLocalDateString(candidateStr);
      const day = parsed ? parsed.getDay() : 1;
      if (day !== 0 && day !== 6) {
        return candidateStr;
      }
    }
  }
  return addDaysToDateString(anchor, 1);
}

/**
 * Normalizes time string like "11:00 AM", "3:15 pm", or "11:00" into { hours, minutes }
 */
export function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return { hours, minutes };
}

function normalizeTaskDate(dueDate: string | undefined, todayStr: string): string {
  if (!dueDate || dueDate.trim().toLowerCase() === 'today') return todayStr;
  return dueDate;
}

export function compareTasksByUrgency(a: Task, b: Task, todayStr: string): number {
  const dateA = normalizeTaskDate(a.dueDate, todayStr);
  const dateB = normalizeTaskDate(b.dueDate, todayStr);

  const bucket = (d: string) => (d < todayStr ? 0 : d === todayStr ? 1 : 2);
  const bucketDiff = bucket(dateA) - bucket(dateB);
  if (bucketDiff !== 0) return bucketDiff;

  const priorityRank = (p?: Task['priority']) => (p === 'high' ? 0 : p === 'low' ? 2 : 1);
  const prioDiff = priorityRank(a.priority) - priorityRank(b.priority);
  if (prioDiff !== 0) return prioDiff;

  if (dateA !== dateB) return dateA.localeCompare(dateB);

  const timeMinutes = (t: string | undefined) => {
    if (!t || t === 'Anytime') return 9999;
    const parsed = parseTimeString(t);
    return parsed ? parsed.hours * 60 + parsed.minutes : 9999;
  };
  return timeMinutes(a.dueTime) - timeMinutes(b.dueTime);
}
