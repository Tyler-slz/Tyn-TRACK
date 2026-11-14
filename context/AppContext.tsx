'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, CalendarEvent, DailyCheckInSettings, MoneyReminder, TabType, Task, Transaction, DailyNote } from '@/lib/types';
import {
  INITIAL_APP_STATE,
  loadStoredAppState,
  saveStoredAppState,
  completelyWipeLocalStorage,
  enablePersistentStorage,
  exportDataToFile,
} from '@/lib/storage';
import {
  getCurrentTimeFormatted,
  getCurrentDateHeader,
  getCurrentMonthYear,
  getLocalDateString,
  getNextTaskRepeatDate,
  parseTimeString,
} from '@/lib/time';
import { eventOccursOnDate } from '@/lib/schedule';
import {
  playChimeSound,
  triggerVibration,
  requestNotificationPermission,
  sendLocalNotification,
  AlarmSoundType,
} from '@/lib/alarm';
import {
  addNativeNotificationTapListener,
  cancelAllNativeAlarms,
  ensureNativeAlarmChannel,
  isNativeApp,
  scheduleNativeSnooze,
  syncAllNativeAlarms,
} from '@/lib/nativeAlarms';

export interface ActiveAlarm {
  id: string;
  title: string;
  time: string;
  category?: string;
  type: 'task' | 'event' | 'money';
}

interface AppContextValue {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  state: AppState;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentTimeStr: string;
  currentDateHeader: string;
  currentMonthYear: string;
  todayLocalStr: string;
  nowDate: Date;
  toggleTask: (id: string) => void;
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  clearCompletedTasks: () => void;
  rescheduleOverdueTasksToday: () => void;
  editingTask: Task | null;
  openTaskEditModal: (task: Task) => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  skipEventDate: (id: string, dateStr: string) => void;
  deleteEvent: (id: string) => void;
  editingEvent: CalendarEvent | null;
  openEventEditModal: (event: CalendarEvent, dateStr?: string) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void;
  deleteTransaction: (id: string) => void;
  editingTransaction: Transaction | null;
  openTransactionEditModal: (tx: Transaction) => void;
  addMoneyReminder: (reminder: Omit<MoneyReminder, 'id' | 'settled'>) => void;
  updateMoneyReminder: (id: string, patch: Partial<Omit<MoneyReminder, 'id'>>) => void;
  settleMoneyReminder: (id: string, recordTransaction: boolean) => void;
  reopenMoneyReminder: (id: string) => void;
  deleteMoneyReminder: (id: string) => void;
  editingMoneyReminder: MoneyReminder | null;
  openMoneyReminderEditModal: (reminder: MoneyReminder) => void;
  updateMonthlyBudget: (amount: number) => void;
  updateCheckInSettings: (patch: Partial<DailyCheckInSettings>) => void;
  depositToSavings: (amount: number, note?: string) => void;
  transferSurplusToSavings: (customAmount?: number) => void;
  saveDailyNote: (text: string) => void;
  updateUserName: (name: string) => void;
  updateCurrency: (symbol: string, code: string) => void;
  activeModal: string | null;
  openModal: (modalName: string) => void;
  openModalWithTime: (modalName: string, time24: string, dateStr?: string) => void;
  prefilledTime: string;
  prefilledDate: string;
  closeModal: () => void;
  clearAllData: () => void;
  clearMoneyData: () => void;
  exportBackup: () => void;
  importBackup: (fileContent: string) => boolean;
  // Alarm & Reminders
  activeAlarm: ActiveAlarm | null;
  alarmSound: AlarmSoundType;
  setAlarmSound: (sound: AlarmSoundType) => void;
  alarmSoundEnabled: boolean;
  toggleAlarmSound: () => void;
  alarmVibrationEnabled: boolean;
  toggleAlarmVibration: () => void;
  dismissAlarm: () => void;
  snoozeAlarm: (minutes?: number) => void;
  testAlarm: (sound?: AlarmSoundType, skipNotification?: boolean) => void;
  enableNotifications: () => Promise<boolean>;
  isInstallable: boolean;
  isStandalone: boolean;
  promptInstallApp: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [state, setState] = useState<AppState>(INITIAL_APP_STATE);
  const latestStateRef = useRef<AppState>(state);
  latestStateRef.current = state;
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [prefilledTime, setPrefilledTime] = useState<string>('12:00');
  const [prefilledDate, setPrefilledDate] = useState<string>(() => getLocalDateString(new Date()));
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingMoneyReminder, setEditingMoneyReminder] = useState<MoneyReminder | null>(null);
  const [alarmSound, setAlarmSound] = useState<AlarmSoundType>('zen');

  // Sync Tailwind dark class, native date/time picker color-scheme, and PWA status bar tint
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isDarkMode = state.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDarkMode ? '#141A17' : '#FAF8F5');
    }
  }, [state.theme]);

  // Date state in LOCAL timezone (updates only on day rollover; minute clock ticks locally in leaf components)
  const [nowDate, setNowDate] = useState<Date>(() => new Date());
  const [todayLocalStr, setTodayLocalStr] = useState<string>(() => getLocalDateString(new Date()));
  const [currentDateHeader, setCurrentDateHeader] = useState<string>(() => getCurrentDateHeader(new Date()));
  const [currentMonthYear, setCurrentMonthYear] = useState<string>(() => getCurrentMonthYear(new Date()));
  const currentTimeStr = getCurrentTimeFormatted(nowDate);

  // Alarm state
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null);
  const [notifiedAlarms, setNotifiedAlarms] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('tyn_notified_alarms_v1');
        if (stored) {
          return new Set(JSON.parse(stored));
        }
      } catch (e) {
        // Ignore JSON error
      }
    }
    return new Set();
  });

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isRunningStandalone =
        isNativeApp() ||
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isRunningStandalone);

      const handleBeforeInstall = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      };

      const handleAppInstalled = () => {
        setIsStandalone(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const promptInstallApp = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
        setIsInstallable(false);
      } catch (err) {
        openModal('install-guide');
      }
    } else {
      openModal('install-guide');
    }
  };

  // Load from localStorage after mount & lock in persistent storage
  useEffect(() => {
    const loaded = loadStoredAppState();
    const todayStr = getLocalDateString(new Date());
    const refreshedFinancials = calculateFinancials(
      loaded.transactions || [],
      loaded.financialSummary?.currencySymbol || '₱',
      loaded.financialSummary?.currencyCode || 'PHP',
      todayStr,
      loaded.monthlyBudget || 0
    );
    setState({
      ...loaded,
      financialSummary: refreshedFinancials,
    });
    setIsHydrated(true);
    enablePersistentStorage();
  }, []);

  // Save to localStorage whenever state updates
  useEffect(() => {
    if (isHydrated) {
      saveStoredAppState(state);
    }
  }, [state, isHydrated]);

  // Date rollover sync (only updates global context once per day at midnight or phone wake)
  useEffect(() => {
    const syncDateIfChanged = () => {
      const now = new Date();
      const nextToday = getLocalDateString(now);
      setTodayLocalStr((prevToday) => {
        if (prevToday === nextToday) return prevToday;
        setNowDate(now);
        setCurrentDateHeader(getCurrentDateHeader(now));
        setCurrentMonthYear(getCurrentMonthYear(now));
        return nextToday;
      });
    };

    syncDateIfChanged();
    const interval = setInterval(syncDateIfChanged, 30000);
    document.addEventListener('visibilitychange', syncDateIfChanged);
    window.addEventListener('focus', syncDateIfChanged);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', syncDateIfChanged);
      window.removeEventListener('focus', syncDateIfChanged);
    };
  }, []);

  // Alarm Monitor loop with background wake catch
  useEffect(() => {
    if (!isHydrated) return;

    const checkAlarms = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const nowTotalMinutes = currentHours * 60 + currentMinutes;
      const todayStr = getLocalDateString(now);

      let updatedKeys: string[] = [];

      // Check tasks
      state.tasks.forEach((task) => {
        if (task.completed || !task.remindMe || !task.dueTime || task.dueTime === 'Anytime') return;
        if (task.dueDate && task.dueDate.toLowerCase() !== 'today' && task.dueDate !== todayStr) return;

        const parsed = parseTimeString(task.dueTime);
        if (!parsed) return;

        const taskTotalMinutes = parsed.hours * 60 + parsed.minutes;
        const diff = nowTotalMinutes - taskTotalMinutes;

        // Trigger if:
        // 1. Current minute (diff === 0)
        // 2. OR phone was asleep / locked and woke up within the last 180 mins
        if (diff >= 0 && diff <= 180) {
          const alarmKey = `task-${task.id}-${todayStr}-${task.dueTime}`;
          if (!notifiedAlarms.has(alarmKey)) {
            triggerAlarm({
              id: task.id,
              title: diff <= 1 ? task.title : `[Reminder] ${task.title}`,
              time: task.dueTime,
              category: diff > 1 ? `Due ${diff}m ago · ${task.category || ''}` : task.category,
              type: 'task',
            });
            updatedKeys.push(alarmKey);
          }
        }
      });

      // Check events (including repeating occurrences)
      state.events.forEach((event) => {
        if (!event.remindMe || event.allDay) return;
        if (!eventOccursOnDate(event, todayStr)) return;

        const parsed = parseTimeString(event.startTime);
        if (!parsed) return;

        const eventTotalMinutes = parsed.hours * 60 + parsed.minutes;
        const diff = nowTotalMinutes - eventTotalMinutes;

        // Trigger if:
        // 1. Current minute (diff === 0)
        // 2. OR phone was asleep / locked and woke up within the last 180 mins
        if (diff >= 0 && diff <= 180) {
          const alarmKey = `event-${event.id}-${todayStr}-${event.startTime}`;
          if (!notifiedAlarms.has(alarmKey)) {
            triggerAlarm({
              id: event.id,
              title: diff <= 1 ? event.title : `[Reminder] ${event.title}`,
              time: event.startTime,
              category: diff > 1 ? `Started ${diff}m ago · ${event.location || ''}` : event.location,
              type: 'event',
            });
            updatedKeys.push(alarmKey);
          }
        }
      });

      // Check money reminders
      (state.moneyReminders || []).forEach((reminder) => {
        if (reminder.settled || !reminder.remindMe || !reminder.dueTime) return;
        if (reminder.dueDate !== todayStr) return;

        const parsed = parseTimeString(reminder.dueTime);
        if (!parsed) return;

        const reminderTotalMinutes = parsed.hours * 60 + parsed.minutes;
        const diff = nowTotalMinutes - reminderTotalMinutes;

        if (diff >= 0 && diff <= 180) {
          const alarmKey = `money-${reminder.id}-${todayStr}-${reminder.dueTime}`;
          if (!notifiedAlarms.has(alarmKey)) {
            const sym = state.financialSummary?.currencySymbol || '₱';
            const amt = `${sym}${reminder.amount.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}`;
            const alarmTitle =
              reminder.kind === 'bill'
                ? `Bill Due: ${reminder.title} (${amt})`
                : reminder.kind === 'owe'
                ? `Pay Back ${reminder.person || reminder.title} (${amt})`
                : `Collect from ${reminder.person || reminder.title} (${amt})`;
            const baseCat =
              reminder.kind === 'bill'
                ? 'Bill Reminder'
                : reminder.kind === 'owe'
                ? `I Owe${reminder.person ? ` · ${reminder.person}` : ''}`
                : `Owed to Me${reminder.person ? ` · ${reminder.person}` : ''}`;

            triggerAlarm({
              id: reminder.id,
              title: diff <= 1 ? alarmTitle : `[Reminder] ${alarmTitle}`,
              time: reminder.dueTime,
              category: diff > 1 ? `Due ${diff}m ago · ${baseCat}` : baseCat,
              type: 'money',
            });
            updatedKeys.push(alarmKey);
          }
        }
      });

      // Check daily check-ins (morning kickoff & evening wrap-up)
      const checkIn = state.checkInSettings;
      if (checkIn?.morningEnabled) {
        const morningTime = checkIn.morningTime || '08:00';
        const parsed = parseTimeString(morningTime);
        if (parsed) {
          const targetMinutes = parsed.hours * 60 + parsed.minutes;
          const diff = nowTotalMinutes - targetMinutes;
          if (diff >= 0 && diff <= 180) {
            const alarmKey = `checkin-morning-${todayStr}-${morningTime}`;
            if (!notifiedAlarms.has(alarmKey)) {
              triggerAlarm({
                id: 'checkin-morning',
                title: 'Good morning! Ready for today?',
                time: morningTime,
                category:
                  diff > 1
                    ? `Morning Kickoff (${diff}m ago) · Check today's tasks & bills`
                    : "Morning Kickoff · Check today's tasks, schedule, and bills due",
                type: 'task',
              });
              updatedKeys.push(alarmKey);
            }
          }
        }
      }

      if (checkIn?.eveningEnabled) {
        const eveningTime = checkIn.eveningTime || '21:00';
        const parsed = parseTimeString(eveningTime);
        if (parsed) {
          const targetMinutes = parsed.hours * 60 + parsed.minutes;
          const diff = nowTotalMinutes - targetMinutes;
          if (diff >= 0 && diff <= 180) {
            const alarmKey = `checkin-evening-${todayStr}-${eveningTime}`;
            if (!notifiedAlarms.has(alarmKey)) {
              triggerAlarm({
                id: 'checkin-evening',
                title: 'Evening wrap-up',
                time: eveningTime,
                category:
                  diff > 1
                    ? `Evening Check-In (${diff}m ago) · Log spending & One Good Thing`
                    : "Evening Check-In · Log today's spending and write One Good Thing",
                type: 'event',
              });
              updatedKeys.push(alarmKey);
            }
          }
        }
      }

      if (updatedKeys.length > 0) {
        setNotifiedAlarms((prev) => {
          const next = new Set(Array.from(prev).filter((k) => k.includes(todayStr)));
          updatedKeys.forEach((k) => next.add(k));
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('tyn_notified_alarms_v1', JSON.stringify(Array.from(next)));
            }
          } catch (e) {}
          return next;
        });
      }
    };

    // Run immediately when mounted or when user wakes up phone
    checkAlarms();

    const handleWake = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        checkAlarms();
      }
    };

    document.addEventListener('visibilitychange', handleWake);
    window.addEventListener('focus', handleWake);

    const alarmInterval = setInterval(checkAlarms, 10000);
    return () => {
      clearInterval(alarmInterval);
      document.removeEventListener('visibilitychange', handleWake);
      window.removeEventListener('focus', handleWake);
    };
  }, [
    isHydrated,
    state.tasks,
    state.events,
    state.moneyReminders,
    state.checkInSettings,
    state.financialSummary.currencySymbol,
    notifiedAlarms,
    state.alarmSoundEnabled,
    state.alarmVibrationEnabled,
    alarmSound,
  ]);

  // Keep native Android AlarmManager schedules synced cleanly whenever tasks/events/money/check-ins change
  useEffect(() => {
    if (!isHydrated || !isNativeApp()) return;
    void ensureNativeAlarmChannel();
    void syncAllNativeAlarms(
      state.tasks,
      state.events,
      state.moneyReminders || [],
      state.checkInSettings,
      state.financialSummary?.currencySymbol || '₱'
    );
  }, [
    isHydrated,
    state.tasks,
    state.events,
    state.moneyReminders,
    state.checkInSettings,
    state.financialSummary?.currencySymbol,
  ]);

  // Re-sync native alarms when app returns to foreground (e.g., after granting Android permissions)
  useEffect(() => {
    if (!isHydrated || !isNativeApp()) return;
    const handleForegroundSync = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        const cur = latestStateRef.current;
        void syncAllNativeAlarms(
          cur.tasks,
          cur.events,
          cur.moneyReminders || [],
          cur.checkInSettings,
          cur.financialSummary?.currencySymbol || '₱'
        );
      }
    };
    document.addEventListener('visibilitychange', handleForegroundSync);
    window.addEventListener('focus', handleForegroundSync);
    return () => {
      document.removeEventListener('visibilitychange', handleForegroundSync);
      window.removeEventListener('focus', handleForegroundSync);
    };
  }, [isHydrated]);

  // Route user to the relevant tab when tapping a native Android notification
  useEffect(() => {
    if (!isHydrated || !isNativeApp()) return;
    return addNativeNotificationTapListener((kind) => {
      if (kind === 'task' || kind === 'checkin-morning') {
        setActiveTab('todo');
      } else if (kind === 'event') {
        setActiveTab('schedule');
      } else if (kind === 'money') {
        setActiveTab('money');
      } else if (kind === 'checkin-evening') {
        setActiveTab('dashboard');
      }
    });
  }, [isHydrated]);

  const toggleTheme = () => {
    setState((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const toggleAlarmSound = () => {
    setState((prev) => ({
      ...prev,
      alarmSoundEnabled: !prev.alarmSoundEnabled,
    }));
  };

  const toggleAlarmVibration = () => {
    setState((prev) => ({
      ...prev,
      alarmVibrationEnabled: !prev.alarmVibrationEnabled,
    }));
  };

  const triggerAlarm = (alarm: ActiveAlarm) => {
    setActiveAlarm(alarm);

    if (state.alarmSoundEnabled !== false) {
      playChimeSound(alarmSound);
    }
    if (state.alarmVibrationEnabled !== false) {
      triggerVibration();
    }
    if (!isNativeApp()) {
      sendLocalNotification(
        `Reminder: ${alarm.title}`,
        `Scheduled for ${alarm.time}${alarm.category ? ` · ${alarm.category}` : ''}`
      );
    }
  };

  const dismissAlarm = () => {
    setActiveAlarm(null);
  };

  const snoozeAlarm = (minutes: number = 5) => {
    if (!activeAlarm) return;
    const current = activeAlarm;
    setActiveAlarm(null);

    if (isNativeApp()) {
      void scheduleNativeSnooze(
        `Snooze: ${current.title}`,
        `Snoozed reminder from ${current.time}`,
        minutes
      );
    }

    setTimeout(() => {
      triggerAlarm(current);
    }, minutes * 60 * 1000);
  };

  const testAlarm = (soundOverride?: AlarmSoundType, skipNotification: boolean = false) => {
    const selectedSound = soundOverride || alarmSound;
    if (state.alarmSoundEnabled !== false) {
      playChimeSound(selectedSound);
    }
    if (state.alarmVibrationEnabled !== false) {
      triggerVibration();
    }
    if (!skipNotification) {
      sendLocalNotification(
        'Tyn Alarm Test',
        'Phone vibration and system alerts are working properly.'
      );
    }
    setActiveAlarm({
      id: 'test-alarm',
      title: 'Reminder preview',
      time: getCurrentTimeFormatted(new Date()),
      category: 'Notification check',
      type: 'event',
    });
  };

  const enableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted && isNativeApp()) {
      const cur = latestStateRef.current;
      await syncAllNativeAlarms(
        cur.tasks,
        cur.events,
        cur.moneyReminders || [],
        cur.checkInSettings,
        cur.financialSummary?.currencySymbol || '₱'
      );
    }
    return granted;
  };

  const toggleTask = (id: string) => {
    const todayStr = getLocalDateString(new Date());
    setState((prev) => {
      let nextRecurringTask: Task | null = null;
      const updated = prev.tasks.map((task) => {
        if (task.id !== id) return task;
        const nextCompleted = !task.completed;
        const repeatMode =
          task.repeat === 'daily' || task.repeat === 'weekdays' || task.repeat === 'weekly'
            ? task.repeat
            : null;

        if (nextCompleted && repeatMode) {
          nextRecurringTask = {
            ...task,
            id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            dueDate: getNextTaskRepeatDate(task.dueDate || todayStr, repeatMode, todayStr),
            completed: false,
            completedAt: undefined,
            repeat: repeatMode,
          };
        }

        return {
          ...task,
          completed: nextCompleted,
          completedAt: nextCompleted ? todayStr : undefined,
          repeat: nextCompleted && repeatMode ? 'none' : task.repeat,
        };
      });
      return {
        ...prev,
        tasks: nextRecurringTask ? [nextRecurringTask, ...updated] : updated,
      };
    });
  };

  const addTask = (taskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));
  };

  const updateTask = (id: string, patch: Partial<Task>) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  };

  const deleteTask = (id: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
  };

  const clearCompletedTasks = () => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => !t.completed),
    }));
  };

  const rescheduleOverdueTasksToday = () => {
    const todayStr = getLocalDateString(new Date());
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        !t.completed && t.dueDate && t.dueDate.toLowerCase() !== 'today' && t.dueDate < todayStr
          ? { ...t, dueDate: todayStr }
          : t
      ),
    }));
  };

  const addEvent = (eventData: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: `event-${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      events: [...prev.events, newEvent],
    }));
  };

  const updateEvent = (id: string, patch: Partial<CalendarEvent>) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  };

  const skipEventDate = (id: string, dateStr: string) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) => {
        if (e.id !== id) return e;
        const existing = Array.isArray(e.skippedDates) ? e.skippedDates : [];
        if (existing.includes(dateStr)) return e;
        return {
          ...e,
          skippedDates: [...existing, dateStr],
        };
      }),
    }));
  };

  const deleteEvent = (id: string) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== id),
    }));
  };

function calculateFinancials(
  transactions: Transaction[],
  symbol: string = '₱',
  code: string = 'PHP',
  todayStr: string = '',
  monthlyBudget: number = 0
) {
  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  let directSavings = 0;
  let spentToday = 0;

  for (const tx of transactions) {
    if (tx.type === 'income') {
      monthlyIncome += tx.amount;
    } else if (tx.type === 'expense') {
      monthlyExpenses += tx.amount;
      if (todayStr && tx.date === todayStr) {
        spentToday += tx.amount;
      }
    } else if (tx.type === 'savings') {
      directSavings += tx.amount;
    }
  }

  // Core rule: all extra money (Income - Expenses) automatically counts as savings!
  const monthlyExtra = Math.max(0, monthlyIncome - monthlyExpenses);
  const totalSavings = monthlyExtra + directSavings;
  const totalBalance = monthlyIncome - monthlyExpenses + directSavings;
  const budgetTotal = Math.max(0, Number(monthlyBudget) || 0);

  return {
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    totalSavings,
    directSavings,
    monthlyExtra,
    spentToday,
    weeklyBudgetLeft: budgetTotal > 0 ? Math.max(0, budgetTotal - monthlyExpenses) : 0,
    weeklyBudgetTotal: budgetTotal,
    currencySymbol: symbol || '₱',
    currencyCode: code || 'PHP',
  };
}

  const addTransaction = (txData: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}`,
    };
    setState((prev) => {
      const nextTransactions = [newTx, ...prev.transactions];
      const nextFinancials = calculateFinancials(
        nextTransactions,
        prev.financialSummary.currencySymbol,
        prev.financialSummary.currencyCode,
        todayLocalStr,
        prev.monthlyBudget || 0
      );

      return {
        ...prev,
        transactions: nextTransactions,
        financialSummary: nextFinancials,
      };
    });
  };

  const updateTransaction = (id: string, patch: Partial<Omit<Transaction, 'id'>>) => {
    setState((prev) => {
      const nextTransactions = prev.transactions.map((t) =>
        t.id === id ? { ...t, ...patch } : t
      );
      const nextFinancials = calculateFinancials(
        nextTransactions,
        prev.financialSummary.currencySymbol,
        prev.financialSummary.currencyCode,
        todayLocalStr,
        prev.monthlyBudget || 0
      );

      return {
        ...prev,
        transactions: nextTransactions,
        financialSummary: nextFinancials,
      };
    });
  };

  const deleteTransaction = (id: string) => {
    setState((prev) => {
      const nextTransactions = prev.transactions.filter((t) => t.id !== id);
      const nextFinancials = calculateFinancials(
        nextTransactions,
        prev.financialSummary.currencySymbol,
        prev.financialSummary.currencyCode,
        todayLocalStr,
        prev.monthlyBudget || 0
      );

      return {
        ...prev,
        transactions: nextTransactions,
        financialSummary: nextFinancials,
      };
    });
  };

  const addMoneyReminder = (reminder: Omit<MoneyReminder, 'id' | 'settled'>) => {
    const newReminder: MoneyReminder = {
      ...reminder,
      id: `mr-${Date.now()}`,
      settled: false,
    };
    setState((prev) => ({
      ...prev,
      moneyReminders: [newReminder, ...(prev.moneyReminders || [])],
    }));
  };

  const updateMoneyReminder = (id: string, patch: Partial<Omit<MoneyReminder, 'id'>>) => {
    setState((prev) => ({
      ...prev,
      moneyReminders: (prev.moneyReminders || []).map((r) =>
        r.id === id ? { ...r, ...patch } : r
      ),
    }));
  };

  const settleMoneyReminder = (id: string, recordTransaction: boolean) => {
    setState((prev) => {
      const target = (prev.moneyReminders || []).find((r) => r.id === id);
      if (!target || target.settled) return prev;

      let updatedTransactions = prev.transactions;
      let linkedTxId: string | undefined = undefined;

      if (recordTransaction && target.amount > 0) {
        linkedTxId = `tx-${Date.now()}`;
        const isIncome = target.kind === 'owed';
        const merchantLabel = target.person
          ? isIncome
            ? `${target.person} — ${target.title}`
            : `${target.title} (${target.person})`
          : target.title;
        const categoryLabel =
          target.kind === 'bill'
            ? 'Bills'
            : target.kind === 'owe'
            ? 'Debt repayment'
            : 'Repayment received';

        const newTx: Transaction = {
          id: linkedTxId,
          merchant: merchantLabel,
          category: categoryLabel,
          amount: target.amount,
          type: isIncome ? 'income' : 'expense',
          date: todayLocalStr,
        };
        updatedTransactions = [newTx, ...prev.transactions];
      }

      const updatedReminders = (prev.moneyReminders || []).map((r) =>
        r.id === id
          ? {
              ...r,
              settled: true,
              settledAt: todayLocalStr,
              linkedTransactionId: linkedTxId,
            }
          : r
      );

      return {
        ...prev,
        transactions: updatedTransactions,
        moneyReminders: updatedReminders,
        financialSummary: calculateFinancials(
          updatedTransactions,
          prev.financialSummary.currencySymbol,
          prev.financialSummary.currencyCode,
          todayLocalStr,
          prev.monthlyBudget || 0
        ),
      };
    });
  };

  const reopenMoneyReminder = (id: string) => {
    setState((prev) => ({
      ...prev,
      moneyReminders: (prev.moneyReminders || []).map((r) =>
        r.id === id ? { ...r, settled: false, settledAt: undefined } : r
      ),
    }));
  };

  const deleteMoneyReminder = (id: string) => {
    setState((prev) => ({
      ...prev,
      moneyReminders: (prev.moneyReminders || []).filter((r) => r.id !== id),
    }));
  };

  const updateMonthlyBudget = (amount: number) => {
    const cleanBudget = Math.max(0, Number(amount) || 0);
    setState((prev) => ({
      ...prev,
      monthlyBudget: cleanBudget,
      financialSummary: calculateFinancials(
        prev.transactions,
        prev.financialSummary.currencySymbol,
        prev.financialSummary.currencyCode,
        todayLocalStr,
        cleanBudget
      ),
    }));
  };

  const updateCheckInSettings = (patch: Partial<DailyCheckInSettings>) => {
    setState((prev) => ({
      ...prev,
      checkInSettings: {
        ...prev.checkInSettings,
        ...patch,
      },
    }));
  };

  // Direct deposit into Savings
  const depositToSavings = (amount: number, note: string = 'Added to Savings') => {
    if (amount <= 0) return;
    const todayStr = getLocalDateString(new Date());
    addTransaction({
      type: 'savings',
      merchant: note || 'Savings Vault',
      category: 'Savings',
      amount,
      date: todayStr,
      note,
    });
  };

  const transferSurplusToSavings = (customAmount?: number) => {
    // Leftover money is already automatically counted in savings
    if (customAmount && customAmount > 0) {
      depositToSavings(customAmount, 'Dedicated Savings');
    }
  };

  // Daily Micro-Journal
  const saveDailyNote = (text: string) => {
    const todayStr = getLocalDateString(new Date());
    setState((prev) => {
      const existing = prev.dailyNotes.filter((n) => n.date !== todayStr);
      return {
        ...prev,
        dailyNotes: text.trim() ? [{ date: todayStr, text: text.trim() }, ...existing] : existing,
      };
    });
  };

  const updateUserName = (name: string) => {
    setState((prev) => ({ ...prev, userName: name }));
  };

  const updateCurrency = (symbol: string, code: string) => {
    setState((prev) => ({
      ...prev,
      financialSummary: {
        ...prev.financialSummary,
        currencySymbol: symbol,
        currencyCode: code,
      },
    }));
  };

  const openModal = (modalName: string) => {
    setEditingEvent(null);
    setEditingTask(null);
    setEditingTransaction(null);
    setEditingMoneyReminder(null);
    setPrefilledTime('12:00');
    setPrefilledDate(todayLocalStr);
    setActiveModal(modalName);
  };

  const openModalWithTime = (modalName: string, time24: string, dateStr?: string) => {
    setEditingEvent(null);
    setEditingTask(null);
    setEditingTransaction(null);
    setEditingMoneyReminder(null);
    setPrefilledTime(time24);
    setPrefilledDate(dateStr || todayLocalStr);
    setActiveModal(modalName);
  };

  const openEventEditModal = (event: CalendarEvent, dateStr?: string) => {
    setEditingEvent(event);
    setEditingTask(null);
    setEditingTransaction(null);
    setEditingMoneyReminder(null);
    setPrefilledDate(dateStr || event.date || todayLocalStr);
    setActiveModal('edit-event');
  };

  const openTaskEditModal = (task: Task) => {
    setEditingEvent(null);
    setEditingTask(task);
    setEditingTransaction(null);
    setEditingMoneyReminder(null);
    setActiveModal('edit-todo');
  };

  const openTransactionEditModal = (tx: Transaction) => {
    setEditingEvent(null);
    setEditingTask(null);
    setEditingMoneyReminder(null);
    setEditingTransaction(tx);
    setActiveModal('edit-money');
  };

  const openMoneyReminderEditModal = (reminder: MoneyReminder) => {
    setEditingEvent(null);
    setEditingTask(null);
    setEditingTransaction(null);
    setEditingMoneyReminder(reminder);
    setActiveModal('edit-money-reminder');
  };

  const closeModal = () => {
    setEditingEvent(null);
    setEditingTask(null);
    setEditingTransaction(null);
    setEditingMoneyReminder(null);
    setActiveModal(null);
  };

  const clearAllData = () => {
    completelyWipeLocalStorage();
    setNotifiedAlarms(new Set());
    setActiveAlarm(null);
    setEditingEvent(null);
    setEditingTask(null);
    setEditingTransaction(null);
    setEditingMoneyReminder(null);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tyn_notified_alarms_v1');
      }
    } catch (e) {}
    void cancelAllNativeAlarms();
    setState({
      ...INITIAL_APP_STATE,
      userName: state.userName || 'Yo Tyn',
      theme: state.theme || 'light',
      alarmSoundEnabled: state.alarmSoundEnabled !== undefined ? state.alarmSoundEnabled : true,
      alarmVibrationEnabled: state.alarmVibrationEnabled !== undefined ? state.alarmVibrationEnabled : true,
      dailyNotes: [],
      financialSummary: {
        totalBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        totalSavings: 0,
        directSavings: 0,
        monthlyExtra: 0,
        spentToday: 0,
        weeklyBudgetLeft: 0,
        weeklyBudgetTotal: 0,
        currencySymbol: state.financialSummary?.currencySymbol || '₱',
        currencyCode: state.financialSummary?.currencyCode || 'PHP',
      },
    });
  };

  const clearMoneyData = () => {
    setEditingTransaction(null);
    setEditingMoneyReminder(null);
    setState((prev) => {
      const symbol = prev.financialSummary?.currencySymbol || '₱';
      const code = prev.financialSummary?.currencyCode || 'PHP';
      const budget = prev.monthlyBudget || 0;
      const next: AppState = {
        ...prev,
        transactions: [],
        moneyReminders: [],
        financialSummary: {
          totalBalance: 0,
          monthlyIncome: 0,
          monthlyExpenses: 0,
          totalSavings: 0,
          directSavings: 0,
          monthlyExtra: 0,
          spentToday: 0,
          weeklyBudgetLeft: budget,
          weeklyBudgetTotal: budget,
          currencySymbol: symbol,
          currencyCode: code,
        },
      };
      saveStoredAppState(next);
      return next;
    });
  };

  const exportBackup = () => {
    exportDataToFile(state);
  };

  const importBackup = (fileContent: string): boolean => {
    try {
      const parsed = JSON.parse(fileContent);
      if (parsed && typeof parsed === 'object') {
        const mergedTransactions: Transaction[] = Array.isArray(parsed.transactions)
          ? parsed.transactions
          : [];
        const mergedBudget =
          typeof parsed.monthlyBudget === 'number' && !Number.isNaN(parsed.monthlyBudget)
            ? Math.max(0, parsed.monthlyBudget)
            : 0;
        const sym = parsed.financialSummary?.currencySymbol || '₱';
        const code = parsed.financialSummary?.currencyCode || 'PHP';
        const computedFinancials = calculateFinancials(
          mergedTransactions,
          sym,
          code,
          todayLocalStr,
          mergedBudget
        );

        const merged: AppState = {
          ...INITIAL_APP_STATE,
          ...parsed,
          alarmSoundEnabled: parsed.alarmSoundEnabled !== undefined ? parsed.alarmSoundEnabled : true,
          alarmVibrationEnabled: parsed.alarmVibrationEnabled !== undefined ? parsed.alarmVibrationEnabled : true,
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
          events: Array.isArray(parsed.events) ? parsed.events : [],
          transactions: mergedTransactions,
          dailyNotes: Array.isArray(parsed.dailyNotes) ? parsed.dailyNotes : [],
          moneyReminders: Array.isArray(parsed.moneyReminders) ? parsed.moneyReminders : [],
          monthlyBudget: mergedBudget,
          checkInSettings: {
            ...INITIAL_APP_STATE.checkInSettings,
            ...(parsed.checkInSettings || {}),
          },
          financialSummary: {
            ...computedFinancials,
            ...(parsed.financialSummary || {}),
            weeklyBudgetTotal: mergedBudget,
            weeklyBudgetLeft: mergedBudget > 0 ? Math.max(0, mergedBudget - computedFinancials.monthlyExpenses) : 0,
            totalSavings: (parsed.financialSummary && parsed.financialSummary.totalSavings !== undefined)
              ? parsed.financialSummary.totalSavings
              : computedFinancials.totalSavings,
          },
        };
        setState(merged);
        saveStoredAppState(merged);
        return true;
      }
    } catch (e) {
      console.error('Invalid backup file:', e);
    }
    return false;
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        state,
        theme: state.theme || 'light',
        toggleTheme,
        currentTimeStr,
        currentDateHeader,
        currentMonthYear,
        todayLocalStr,
        nowDate,
        toggleTask,
        addTask,
        updateTask,
        deleteTask,
        clearCompletedTasks,
        rescheduleOverdueTasksToday,
        editingTask,
        openTaskEditModal,
        addEvent,
        updateEvent,
        skipEventDate,
        deleteEvent,
        editingEvent,
        openEventEditModal,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        editingTransaction,
        openTransactionEditModal,
        addMoneyReminder,
        updateMoneyReminder,
        settleMoneyReminder,
        reopenMoneyReminder,
        deleteMoneyReminder,
        editingMoneyReminder,
        openMoneyReminderEditModal,
        updateMonthlyBudget,
        updateCheckInSettings,
        depositToSavings,
        transferSurplusToSavings,
        saveDailyNote,
        updateUserName,
        updateCurrency,
        activeModal,
        openModal,
        openModalWithTime,
        prefilledTime,
        prefilledDate,
        closeModal,
        clearAllData,
        clearMoneyData,
        exportBackup,
        importBackup,
        activeAlarm,
        alarmSound,
        setAlarmSound,
        alarmSoundEnabled: state.alarmSoundEnabled !== false,
        toggleAlarmSound,
        alarmVibrationEnabled: state.alarmVibrationEnabled !== false,
        toggleAlarmVibration,
        dismissAlarm,
        snoozeAlarm,
        testAlarm,
        enableNotifications,
        isInstallable,
        isStandalone,
        promptInstallApp,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
