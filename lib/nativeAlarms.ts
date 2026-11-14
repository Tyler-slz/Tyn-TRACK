import { Capacitor, type PermissionState } from '@capacitor/core';
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from '@capacitor/local-notifications';
import { parseTimeString } from './time';
import type { CalendarEvent, Task } from './types';

export const TYN_ALARM_CHANNEL_ID = 'tyn-alarms';

const SCHEDULE_EXTRA_SOURCE = 'tyn-schedule';
const TEST_NOTIFICATION_ID = 10;
const INSTANT_NOTIFICATION_ID = 11;
const SNOOZE_NOTIFICATION_ID = 12;
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
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const parsed = parseTimeString(timeStr);
  if (!parsed) return null;

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

function buildDesiredAlarms(
  tasks: Task[],
  events: CalendarEvent[],
  isExact: boolean
): LocalNotificationSchema[] {
  const now = Date.now();
  const candidates: Array<{ triggerAt: number; schema: LocalNotificationSchema }> = [];

  for (const task of tasks) {
    if (task.completed || !task.remindMe || !task.dueDate || !task.dueTime) continue;
    const target = parseScheduleDate(task.dueDate, task.dueTime);
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

  for (const event of events) {
    if (!event.remindMe || !event.date || !event.startTime) continue;
    const target = parseScheduleDate(event.date, event.startTime);
    if (!target || target.getTime() <= now) continue;

    const key = `event-${event.id}`;
    const body = `${event.startTime}${event.location ? ` · ${event.location}` : ''}`;
    candidates.push({
      triggerAt: target.getTime(),
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
          at: target,
          allowWhileIdle: true,
        },
        extra: {
          source: SCHEDULE_EXTRA_SOURCE,
          key,
          kind: 'event',
          itemId: event.id,
          triggerAt: target.getTime(),
          isExact,
        },
      },
    });
  }

  candidates.sort((a, b) => a.triggerAt - b.triggerAt);
  return candidates.slice(0, MAX_SCHEDULED_ALARMS).map((c) => c.schema);
}

async function performNativeAlarmSync(
  tasks: Task[],
  events: CalendarEvent[],
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
    const desired = buildDesiredAlarms(tasks, events, canUseExact);
    const desiredMap = new Map(desired.map((n) => [n.id, n]));

    const pendingRes = await LocalNotifications.getPending();
    const pendingManaged = pendingRes.notifications.filter(
      (n) => !n.extra?.source || n.extra.source === SCHEDULE_EXTRA_SOURCE
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
      const sameTitle = existing.title === target.title;
      const sameBody = existing.body === target.body;
      const sameExact = existing.extra?.isExact === canUseExact;
      if (sameTrigger && sameTitle && sameBody && sameExact) {
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
  options?: { promptPermissions?: boolean }
): Promise<SyncNativeResult> {
  syncQueue = syncQueue
    .catch(() => ({ ok: false, scheduledCount: 0, exactAlarm: 'denied' as const }))
    .then(() => performNativeAlarmSync(tasks, events, options));
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

