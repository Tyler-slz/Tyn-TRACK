import { Capacitor, type PermissionState } from '@capacitor/core';
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from '@capacitor/local-notifications';
import { parseTimeString } from './time';
import { getUpcomingEventOccurrences } from './schedule';
import type { CalendarEvent, DailyCheckInSettings, MoneyReminder, Task } from './types';

export const TYN_ALARM_CHANNEL_ID = 'tyn-alarms';

const SCHEDULE_EXTRA_SOURCE = 'tyn-schedule';
const CHECKIN_EXTRA_SOURCE = 'tyn-checkin';
const TEST_NOTIFICATION_ID = 10;
const INSTANT_NOTIFICATION_ID = 11;
const SNOOZE_NOTIFICATION_ID = 12;
const MORNING_CHECKIN_ID = 20;
const EVENING_CHECKIN_ID = 21;
const MAX_SCHEDULED_ALARMS = 180;

let channelReadyPromise: Promise<void> | null = null;
let syncQueue: Promise<SyncNativeResult> = Promise.resolve({
  ok: true,
  scheduledCount: 0,
  exactAlarm: 'unsupported',
});

export interface NativeNotificationStatus {
  native: boolean;
  display: PermissionState | 'unsupported';
  exactAlarm: 'granted' | 'denied' | 'unsupported';
}

export interface SyncNativeResult {
  ok: boolean;
  scheduledCount: number;
  exactAlarm: 'granted' | 'denied' | 'unsupported';
  warning?: string;
}

export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

/**
 * Deterministic positive 32-bit signed int ID in [100, 2147480100] so Android
 * NotificationManager & AlarmManager never collide with reserved test IDs.
 */
function hashNotificationId(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 2147480000) + 100;
}

export async function ensureNativeAlarmChannel(): Promise<void> {
  if (!isNativeApp()) return;
  if (!channelReadyPromise) {
    channelReadyPromise = LocalNotifications.createChannel({
      id: TYN_ALARM_CHANNEL_ID,
      name: 'Tyn Reminders & Alarms',
      description: 'Offline task reminders and schedule alarms from Tyn',
      importance: 5,
      visibility: 1,
      lights: true,
      lightColor: '#274E3C',
      vibration: true,
    }).catch((err) => {
      channelReadyPromise = null;
      throw err;
    });
  }
  await channelReadyPromise;
}

function parseScheduleDate(dateStr?: string, timeStr?: string): Date | null {
  if (!dateStr || !timeStr) return null;
  const parsed = parseTimeString(timeStr);
  if (!parsed) return null;

  if (dateStr.trim().toLowerCase() === 'today') {
    const now = new Date();
    const target = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      parsed.hours,
      parsed.minutes,
      0,
      0
    );
    return Number.isNaN(target.getTime()) ? null : target;
  }

  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;

  const [year, month, day] = parts;
  const target = new Date(year, month - 1, day, parsed.hours, parsed.minutes, 0, 0);
  return Number.isNaN(target.getTime()) ? null : target;
}

export async function getNativeNotificationStatus(): Promise<NativeNotificationStatus> {
  if (!isNativeApp()) {
    return { native: false, display: 'unsupported', exactAlarm: 'unsupported' };
  }

  try {
    const [perm, exact] = await Promise.all([
      LocalNotifications.checkPermissions(),
      LocalNotifications.checkExactNotificationSetting(),
    ]);
    return {
      native: true,
      display: perm.display,
      exactAlarm: exact.exact_alarm === 'granted' ? 'granted' : 'denied',
    };
  } catch {
    return { native: true, display: 'prompt', exactAlarm: 'denied' };
  }
}

export async function requestNativeNotificationAccess(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    await ensureNativeAlarmChannel();
    const res = await LocalNotifications.requestPermissions();
    return res.display === 'granted';
  } catch (err) {
    console.warn('Native notification permission failed:', err);
    return false;
  }
}

export async function openNativeExactAlarmSettings(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!isNativeApp()) return 'unsupported';
  try {
    const res = await LocalNotifications.changeExactNotificationSetting();
    return res.exact_alarm === 'granted' ? 'granted' : 'denied';
  } catch (err) {
    console.warn('Could not open exact alarm settings:', err);
    return 'denied';
  }
}

function parse24hTime(timeStr?: string): { hour: number; minute: number } | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function buildDesiredAlarms(
  tasks: Task[],
  events: CalendarEvent[],
  moneyReminders: MoneyReminder[],
  currencySymbol: string,
  isExact: boolean
): LocalNotificationSchema[] {
  const now = Date.now();
  const candidates: Array<{ triggerAt: number; schema: LocalNotificationSchema }> = [];

  for (const task of tasks) {
    if (task.completed || !task.remindMe || !task.dueTime || task.dueTime === 'Anytime') continue;
    const target = parseScheduleDate(task.dueDate || 'today', task.dueTime);
    if (!target || target.getTime() <= now) continue;

    const key = `task-${task.id}`;
    const body = `${task.dueTime} · ${task.category} task`;
    candidates.push({
      triggerAt: target.getTime(),
      schema: {
        id: hashNotificationId(key),
        title: `Tyn Reminder: ${task.title}`,
        body,
        largeBody: task.details ? `${body} — ${task.details}` : body,
        channelId: TYN_ALARM_CHANNEL_ID,
        smallIcon: 'ic_stat_tyn',
        iconColor: '#274E3C',
        foreground: true,
        autoCancel: true,
        isExactNotification: isExact,
        schedule: {
          at: target,
          allowWhileIdle: true,
        },
        extra: {
          source: SCHEDULE_EXTRA_SOURCE,
          key,
          kind: 'task',
          itemId: task.id,
          triggerAt: target.getTime(),
          isExact,
        },
      },
    });
  }

  const upcomingOccurrences = getUpcomingEventOccurrences(events, new Date(), 14);
  for (const { event, occurrenceDate, triggerDate } of upcomingOccurrences) {
    const key =
      !event.repeat || event.repeat === 'none'
        ? `event-${event.id}`
        : `event-${event.id}-${occurrenceDate}`;
    const body = `${event.startTime}${event.location ? ` · ${event.location}` : ''}`;
    candidates.push({
      triggerAt: triggerDate.getTime(),
      schema: {
        id: hashNotificationId(key),
        title: `Tyn Schedule: ${event.title}`,
        body,
        largeBody: event.notes ? `${body} — ${event.notes}` : body,
        channelId: TYN_ALARM_CHANNEL_ID,
        smallIcon: 'ic_stat_tyn',
        iconColor: '#274E3C',
        foreground: true,
        autoCancel: true,
        isExactNotification: isExact,
        schedule: {
          at: triggerDate,
          allowWhileIdle: true,
        },
        extra: {
          source: SCHEDULE_EXTRA_SOURCE,
          key,
          kind: 'event',
          itemId: event.id,
          occurrenceDate,
          triggerAt: triggerDate.getTime(),
          isExact,
        },
      },
    });
  }

  for (const reminder of moneyReminders) {
    if (reminder.settled || !reminder.remindMe || !reminder.dueDate || !reminder.dueTime) continue;
    const target = parseScheduleDate(reminder.dueDate, reminder.dueTime);
    if (!target || target.getTime() <= now) continue;

    const key = `money-${reminder.id}`;
    const amountStr = `${currencySymbol}${reminder.amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
    const titlePrefix =
      reminder.kind === 'bill'
        ? `Bill Due: ${reminder.title}`
        : reminder.kind === 'owe'
        ? `Pay Back ${reminder.person || reminder.title}`
        : `Collect from ${reminder.person || reminder.title}`;
    const body =
      reminder.kind === 'bill'
        ? `${amountStr} · Due at ${reminder.dueTime}`
        : `${reminder.title} · ${amountStr} · ${reminder.dueTime}`;

    candidates.push({
      triggerAt: target.getTime(),
      schema: {
        id: hashNotificationId(key),
        title: `${titlePrefix} (${amountStr})`,
        body,
        largeBody: reminder.note ? `${body} — ${reminder.note}` : body,
        channelId: TYN_ALARM_CHANNEL_ID,
        smallIcon: 'ic_stat_tyn',
        iconColor: '#274E3C',
        foreground: true,
        autoCancel: true,
        isExactNotification: isExact,
        schedule: {
          at: target,
          allowWhileIdle: true,
        },
        extra: {
          source: SCHEDULE_EXTRA_SOURCE,
          key,
          kind: 'money',
          itemId: reminder.id,
          triggerAt: target.getTime(),
          isExact,
        },
      },
    });
  }

  candidates.sort((a, b) => a.triggerAt - b.triggerAt);
  return candidates.slice(0, MAX_SCHEDULED_ALARMS).map((c) => c.schema);
}

function buildDesiredCheckIns(
  checkInSettings: DailyCheckInSettings | undefined,
  isExact: boolean
): LocalNotificationSchema[] {
  if (!checkInSettings) return [];
  const checkIns: LocalNotificationSchema[] = [];

  if (checkInSettings.morningEnabled) {
    const parsedMorning = parse24hTime(checkInSettings.morningTime) || { hour: 8, minute: 0 };
    checkIns.push({
      id: MORNING_CHECKIN_ID,
      title: 'Good morning! Ready for today?',
      body: "Check today's tasks, schedule, and any bills due.",
      channelId: TYN_ALARM_CHANNEL_ID,
      smallIcon: 'ic_stat_tyn',
      iconColor: '#274E3C',
      foreground: true,
      autoCancel: true,
      isExactNotification: isExact,
      schedule: {
        on: parsedMorning,
        allowWhileIdle: true,
      },
      extra: {
        source: CHECKIN_EXTRA_SOURCE,
        kind: 'checkin-morning',
        onHour: parsedMorning.hour,
        onMinute: parsedMorning.minute,
        isExact,
      },
    });
  }

  if (checkInSettings.eveningEnabled) {
    const parsedEvening = parse24hTime(checkInSettings.eveningTime) || { hour: 21, minute: 0 };
    checkIns.push({
      id: EVENING_CHECKIN_ID,
      title: 'Evening wrap-up',
      body: "Log today's spending and write One Good Thing.",
      channelId: TYN_ALARM_CHANNEL_ID,
      smallIcon: 'ic_stat_tyn',
      iconColor: '#274E3C',
      foreground: true,
      autoCancel: true,
      isExactNotification: isExact,
      schedule: {
        on: parsedEvening,
        allowWhileIdle: true,
      },
      extra: {
        source: CHECKIN_EXTRA_SOURCE,
        kind: 'checkin-evening',
        onHour: parsedEvening.hour,
        onMinute: parsedEvening.minute,
        isExact,
      },
    });
  }

  return checkIns;
}

async function performNativeAlarmSync(
  tasks: Task[],
  events: CalendarEvent[],
  moneyReminders: MoneyReminder[] = [],
  checkInSettings?: DailyCheckInSettings,
  currencySymbol: string = '₱',
  options?: { promptPermissions?: boolean }
): Promise<SyncNativeResult> {
  if (!isNativeApp()) {
    return { ok: false, scheduledCount: 0, exactAlarm: 'unsupported' };
  }

  try {
    await ensureNativeAlarmChannel();

    let status = await getNativeNotificationStatus();
    if (status.display !== 'granted') {
      if (!options?.promptPermissions) {
        return { ok: false, scheduledCount: 0, exactAlarm: status.exactAlarm };
      }
      const granted = await requestNativeNotificationAccess();
      if (!granted) {
        return { ok: false, scheduledCount: 0, exactAlarm: status.exactAlarm };
      }
      status = await getNativeNotificationStatus();
    }

    const canUseExact = status.exactAlarm === 'granted';
    const desired = [
      ...buildDesiredAlarms(tasks, events, moneyReminders, currencySymbol, canUseExact),
      ...buildDesiredCheckIns(checkInSettings, canUseExact),
    ];
    const desiredMap = new Map(desired.map((n) => [n.id, n]));

    const pendingRes = await LocalNotifications.getPending();
    const pendingManaged = pendingRes.notifications.filter(
      (n) =>
        !n.extra?.source ||
        n.extra.source === SCHEDULE_EXTRA_SOURCE ||
        n.extra.source === CHECKIN_EXTRA_SOURCE ||
        n.id === MORNING_CHECKIN_ID ||
        n.id === EVENING_CHECKIN_ID
    );

    const toCancel: { id: number }[] = [];
    const unchangedIds = new Set<number>();

    for (const existing of pendingManaged) {
      const target = desiredMap.get(existing.id);
      if (!target) {
        toCancel.push({ id: existing.id });
        continue;
      }
      const sameTrigger = existing.extra?.triggerAt === target.extra?.triggerAt;
      const sameOnTime =
        existing.extra?.onHour === target.extra?.onHour &&
        existing.extra?.onMinute === target.extra?.onMinute;
      const sameTitle = existing.title === target.title;
      const sameBody = existing.body === target.body;
      const sameExact = existing.extra?.isExact === target.extra?.isExact;
      if (sameTrigger && sameOnTime && sameTitle && sameBody && sameExact) {
        unchangedIds.add(existing.id);
      } else {
        toCancel.push({ id: existing.id });
      }
    }

    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel });
    }

    const toSchedule = desired.filter((n) => !unchangedIds.has(n.id));
    let warning: string | undefined;
    if (toSchedule.length > 0) {
      const result = await LocalNotifications.schedule({ notifications: toSchedule });
      warning = result.warning?.message;
    }

    return {
      ok: true,
      scheduledCount: desired.length,
      exactAlarm: status.exactAlarm,
      warning,
    };
  } catch (err) {
    console.warn('Native alarm sync error:', err);
    return { ok: false, scheduledCount: 0, exactAlarm: 'denied' };
  }
}

export function syncAllNativeAlarms(
  tasks: Task[],
  events: CalendarEvent[],
  moneyReminders: MoneyReminder[] = [],
  checkInSettings?: DailyCheckInSettings,
  currencySymbol: string = '₱',
  options?: { promptPermissions?: boolean }
): Promise<SyncNativeResult> {
  syncQueue = syncQueue
    .catch(() => ({ ok: false, scheduledCount: 0, exactAlarm: 'denied' as const }))
    .then(() =>
      performNativeAlarmSync(tasks, events, moneyReminders, checkInSettings, currencySymbol, options)
    );
  return syncQueue;
}

export async function sendNativeInstantNotification(title: string, body: string): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    await ensureNativeAlarmChannel();
    const status = await getNativeNotificationStatus();
    if (status.display !== 'granted') {
      const granted = await requestNativeNotificationAccess();
      if (!granted) return false;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: INSTANT_NOTIFICATION_ID,
          title,
          body,
          channelId: TYN_ALARM_CHANNEL_ID,
          smallIcon: 'ic_stat_tyn',
          iconColor: '#274E3C',
          foreground: true,
          autoCancel: true,
          extra: { source: 'tyn-instant' },
        },
      ],
    });
    return true;
  } catch (err) {
    console.warn('Native instant notification failed:', err);
    return false;
  }
}

export async function scheduleNativeTestAlarm(delaySeconds = 5): Promise<{
  ok: boolean;
  exact: boolean;
  detail: string;
}> {
  if (!isNativeApp()) {
    return { ok: false, exact: false, detail: 'Not running inside native app.' };
  }

  try {
    await ensureNativeAlarmChannel();
    const granted = await requestNativeNotificationAccess();
    if (!granted) {
      return {
        ok: false,
        exact: false,
        detail: 'Notifications denied. Enable Notifications for Tyn in Android App Info.',
      };
    }

    let status = await getNativeNotificationStatus();
    if (status.exactAlarm !== 'granted') {
      await openNativeExactAlarmSettings();
      status = await getNativeNotificationStatus();
    }

    const canUseExact = status.exactAlarm === 'granted';
    const triggerAt = new Date(Date.now() + delaySeconds * 1000);
    await LocalNotifications.cancel({ notifications: [{ id: TEST_NOTIFICATION_ID }] });

    const res = await LocalNotifications.schedule({
      notifications: [
        {
          id: TEST_NOTIFICATION_ID,
          title: 'Tyn Native Alarm Test',
          body: `Exact background AlarmManager fired after ${delaySeconds}s!`,
          channelId: TYN_ALARM_CHANNEL_ID,
          smallIcon: 'ic_stat_tyn',
          iconColor: '#274E3C',
          foreground: true,
          autoCancel: true,
          isExactNotification: canUseExact,
          schedule: {
            at: triggerAt,
            allowWhileIdle: true,
          },
          extra: { source: 'tyn-test' },
        },
      ],
    });

    if (res.warning) {
      return { ok: true, exact: false, detail: res.warning.message };
    }
    return {
      ok: true,
      exact: canUseExact,
      detail: canUseExact
        ? `Scheduled exact AlarmManager test for ${delaySeconds}s.`
        : `Scheduled fallback alarm for ${delaySeconds}s (grant "Alarms & reminders" for exact timing).`,
    };
  } catch (err) {
    return {
      ok: false,
      exact: false,
      detail: err instanceof Error ? err.message : 'Failed to schedule native test alarm.',
    };
  }
}

export async function scheduleNativeSnooze(
  title: string,
  body: string,
  minutes = 5
): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    await ensureNativeAlarmChannel();
    const status = await getNativeNotificationStatus();
    if (status.display !== 'granted') return false;

    const triggerAt = new Date(Date.now() + minutes * 60_000);
    await LocalNotifications.cancel({ notifications: [{ id: SNOOZE_NOTIFICATION_ID }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: SNOOZE_NOTIFICATION_ID,
          title,
          body,
          channelId: TYN_ALARM_CHANNEL_ID,
          smallIcon: 'ic_stat_tyn',
          iconColor: '#274E3C',
          foreground: true,
          autoCancel: true,
          isExactNotification: status.exactAlarm === 'granted',
          schedule: {
            at: triggerAt,
            allowWhileIdle: true,
          },
          extra: { source: 'tyn-snooze' },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelAllNativeAlarms(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await LocalNotifications.cancelAll();
  } catch {
    // Ignore cleanup errors on unsupported states
  }
}

export function addNativeNotificationTapListener(
  onNavigate: (kind: string) => void
): () => void {
  if (!isNativeApp()) return () => {};
  let removed = false;
  let handle: { remove: () => Promise<void> } | null = null;

  void LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    const kind = event.notification?.extra?.kind;
    if (typeof kind === 'string' && kind) {
      onNavigate(kind);
    }
  })
    .then((h) => {
      if (removed) {
        void h.remove();
      } else {
        handle = h;
      }
    })
    .catch(() => {
      // Ignore listener errors outside native Android shell
    });

  return () => {
    removed = true;
    if (handle) {
      void handle.remove();
      handle = null;
    }
  };
}

