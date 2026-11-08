/**
 * Utilities for real-time clock, date formatting, and schedule positioning
 * Using STRICT LOCAL TIMEZONE (never UTC toISOString) to prevent timezone drift bugs.
 */

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

/**
 * Returns current week days centered around today using LOCAL calendar
 */
export function getCurrentWeekDays(baseDate: Date = new Date()) {
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const fullNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const currentDayOfWeek = baseDate.getDay(); // 0 is Sunday, 1 is Monday
  const distanceToMonday = (currentDayOfWeek + 6) % 7; // days since Monday
  
  const monday = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - distanceToMonday);

  const days = [];
  const todayStr = getLocalDateString(baseDate);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dateStr = getLocalDateString(d);
    days.push({
      day: dayNames[d.getDay()],
      date: d.getDate(),
      full: fullNames[d.getDay()],
      dateStr,
      isToday: dateStr === todayStr,
      rawDate: d,
    });
  }
  return days;
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

  return { hours, minutes };
}
