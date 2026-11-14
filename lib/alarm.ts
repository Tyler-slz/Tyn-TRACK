/**
 * On-device offline alarm chime and notifications
 */

import {
  getNativeNotificationStatus,
  isNativeApp,
  requestNativeNotificationAccess,
  sendNativeInstantNotification,
} from './nativeAlarms';

export type AlarmSoundType = 'zen' | 'marimba' | 'pulse';

export function playChimeSound(soundType: AlarmSoundType = 'zen') {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (soundType === 'marimba') {
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.35, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.85);
      });
    } else if (soundType === 'pulse') {
      const freqs = [880, 880, 1174.66];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);

        gain.gain.setValueAtTime(0, now + idx * 0.15);
        gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.15 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.4);
      });
    } else {
      const freqs = [739.99, 932.33, 1108.73];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.16);

        gain.gain.setValueAtTime(0, now + idx * 0.16);
        gain.gain.linearRampToValueAtTime(0.35, now + idx * 0.16 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.16 + 1.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.16);
        osc.stop(now + idx * 0.16 + 1.5);
      });
    }
  } catch (err) {
    console.warn('Audio chime playback error:', err);
  }
}

// Mobile vibration pattern for full phone buzz
export function triggerVibration() {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      // Long distinct pattern: buzz, pause, buzz, pause, long buzz
      navigator.vibrate([400, 150, 400, 150, 800]);
    } catch (e) {
      // Ignore if not permitted
    }
  }
}

// Request permission for native system notifications
export async function requestNotificationPermission(): Promise<boolean> {
  if (isNativeApp()) {
    return await requestNativeNotificationAccess();
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    return false;
  }
}

export interface NotificationDispatchResult {
  ok: boolean;
  method: 'capacitor-native' | 'service-worker' | 'window' | 'none';
  permission: NotificationPermission | 'unsupported';
  swState: string;
  detail: string;
}

async function resolveActiveServiceWorker(): Promise<{
  reg?: ServiceWorkerRegistration;
  swState: string;
  error?: string;
}> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return { swState: 'unsupported', error: 'Service Worker API not available in this browser.' };
  }

  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js');
    }

    if (!reg.active) {
      const readyWithTimeout = Promise.race<ServiceWorkerRegistration | undefined>([
        navigator.serviceWorker.ready,
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 3500)),
      ]);
      const readyReg = await readyWithTimeout;
      if (readyReg) {
        reg = readyReg;
      }
    }

    const swState = reg?.active
      ? reg.active.state
      : reg?.installing
      ? 'installing'
      : reg?.waiting
      ? 'waiting'
      : 'inactive';

    return { reg, swState };
  } catch (err: any) {
    return { swState: 'error', error: err?.message || String(err) };
  }
}

// Send phone-wide native notification with diagnostic status
export async function sendLocalNotificationDetailed(
  title: string,
  body: string
): Promise<NotificationDispatchResult> {
  if (typeof window === 'undefined') {
    return { ok: false, method: 'none', permission: 'unsupported', swState: 'ssr', detail: 'Not in browser.' };
  }

  if (isNativeApp()) {
    const status = await getNativeNotificationStatus();
    const ok = await sendNativeInstantNotification(title, body);
    const after = await getNativeNotificationStatus();
    const mappedPerm: NotificationPermission | 'unsupported' =
      after.display === 'granted' ? 'granted' : after.display === 'denied' ? 'denied' : 'default';
    return {
      ok,
      method: ok ? 'capacitor-native' : 'none',
      permission: mappedPerm,
      swState: `native(${after.exactAlarm === 'granted' ? 'exact' : 'inexact'})`,
      detail: ok
        ? 'Native Android notification delivered.'
        : status.display === 'denied'
        ? 'Notifications are disabled for Tyn in Android App Info.'
        : 'Enable notifications for Tyn when prompted.',
    };
  }

  if (!('Notification' in window)) {
    return {
      ok: false,
      method: 'none',
      permission: 'unsupported',
      swState: 'n/a',
      detail: 'This browser does not support Web Notifications. Open Tyn in Google Chrome.',
    };
  }

  if (Notification.permission !== 'granted') {
    if (Notification.permission === 'denied') {
      return {
        ok: false,
        method: 'none',
        permission: 'denied',
        swState: 'skipped',
        detail: 'Blocked in browser site settings.',
      };
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      return {
        ok: false,
        method: 'none',
        permission: Notification.permission,
        swState: 'skipped',
        detail: 'Permission prompt was dismissed or denied.',
      };
    }
  }

  // Primary mechanism for Android/PWA: ServiceWorkerRegistration.showNotification
  const { reg, swState, error: swResolveError } = await resolveActiveServiceWorker();
  let swShowError = swResolveError;

  if (reg && typeof reg.showNotification === 'function') {
    try {
      await reg.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        vibrate: [400, 150, 400, 150, 800],
        tag: `tyn-alarm-${Date.now()}`,
        requireInteraction: true,
        silent: false,
      } as NotificationOptions);

      return {
        ok: true,
        method: 'service-worker',
        permission: Notification.permission,
        swState,
        detail: 'Notification delivered to Android system.',
      };
    } catch (err: any) {
      swShowError = err?.message || String(err);
      console.warn('Service worker showNotification failed, trying fallback:', err);
    }
  }

  // Direct window Notification fallback (desktop browsers / non-SW contexts)
  try {
    new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      vibrate: [400, 150, 400, 150, 800],
      requireInteraction: true,
    } as NotificationOptions);

    return {
      ok: true,
      method: 'window',
      permission: Notification.permission,
      swState,
      detail: 'Sent via direct browser notification.',
    };
  } catch (directErr: any) {
    const directMsg = directErr?.message || String(directErr);
    return {
      ok: false,
      method: 'none',
      permission: Notification.permission,
      swState,
      detail: `Failed (${swShowError || directMsg}). Make sure you opened Tyn in Chrome, not an in-app browser.`,
    };
  }
}

// Send phone-wide native notification with sound and vibration
export async function sendLocalNotification(title: string, body: string): Promise<boolean> {
  const result = await sendLocalNotificationDetailed(title, body);
  return result.ok;
}
