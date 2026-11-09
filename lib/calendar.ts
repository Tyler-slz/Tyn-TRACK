import { parseTimeString } from './time';

/**
 * Generates a direct Google Calendar Web Link with pre-filled alarm reminder
 */
export function getGoogleCalendarUrl(
  title: string,
  dateStr: string,
  startTimeStr: string,
  endTimeStr: string = '',
  location: string = '',
  notes: string = ''
): string {
  const startParsed = parseTimeString(startTimeStr);
  if (!startParsed) return '';

  const endParsed = parseTimeString(endTimeStr) || {
    hours: (startParsed.hours + 1) % 24,
    minutes: startParsed.minutes,
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const cleanDate = dateStr.replace(/-/g, '');

  const startIso = `${cleanDate}T${pad(startParsed.hours)}${pad(startParsed.minutes)}00`;
  const endIso = `${cleanDate}T${pad(endParsed.hours)}${pad(endParsed.minutes)}00`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startIso}/${endIso}`,
    details: `${notes ? `${notes}\n\n` : ''}Scheduled in Tyn. Set notification reminder in your calendar.`,
    location: location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Downloads a standard .ICS calendar file that Android, Samsung Calendar, and iOS
 * will open directly to add to the phone's native system calendar with alarm reminders.
 */
export function downloadIcsFile(
  title: string,
  dateStr: string,
  startTimeStr: string,
  endTimeStr: string = '',
  location: string = '',
  notes: string = ''
) {
  if (typeof window === 'undefined') return;

  const startParsed = parseTimeString(startTimeStr);
  if (!startParsed) return;

  const endParsed = parseTimeString(endTimeStr) || {
    hours: (startParsed.hours + 1) % 24,
    minutes: startParsed.minutes,
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const cleanDate = dateStr.replace(/-/g, '');

  const startIso = `${cleanDate}T${pad(startParsed.hours)}${pad(startParsed.minutes)}00`;
  const endIso = `${cleanDate}T${pad(endParsed.hours)}${pad(endParsed.minutes)}00`;
  const nowIso = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tyn//Tyn Track PWA//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:tyn-${Date.now()}@tyn-track.vercel.app`,
    `DTSTAMP:${nowIso}`,
    `DTSTART:${startIso}`,
    `DTEND:${endIso}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${notes ? notes.replace(/\n/g, '\\n') : 'Scheduled via Tyn'}`,
    `LOCATION:${location || ''}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT10M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${title}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Starting now: ${title}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
