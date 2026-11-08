/**
 * On-device offline alarm chime and notifications
 */

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

// Send phone-wide native notification with sound and vibration
export async function sendLocalNotification(title: string, body: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (!('Notification' in window)) {
    console.warn('Notification API not supported by this browser.');
    return false;
  }

  // If permission not yet granted, request it
  if (Notification.permission !== 'granted') {
    if (Notification.permission === 'denied') {
      console.warn('Notification permission is denied in browser settings.');
      return false;
    }
    const granted = await requestNotificationPermission();
    if (!granted) return false;
  }

  // Primary mechanism for mobile Android PWA: ServiceWorkerRegistration.showNotification
  if ('serviceWorker' in navigator) {
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js');
      }
      
      // Wait for active service worker if ready
      if (!reg.active) {
        reg = await navigator.serviceWorker.ready;
      }

      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          vibrate: [400, 150, 400, 150, 800],
          tag: `tyn-alarm-${Date.now()}`,
          renotify: true,
          requireInteraction: true,
          silent: false,
        } as any);
        return true;
      }
    } catch (swErr) {
      console.warn('Service worker showNotification failed, trying fallback:', swErr);
    }
  }

  // Direct window Notification fallback
  try {
    new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [400, 150, 400, 150, 800],
      requireInteraction: true,
    } as any);
    return true;
  } catch (directErr) {
    console.warn('Direct notification construction failed:', directErr);
    return false;
  }
}
