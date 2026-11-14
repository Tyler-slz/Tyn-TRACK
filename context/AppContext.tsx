'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, CalendarEvent, TabType, Task, Transaction, DailyNote } from '@/lib/types';
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
  parseTimeString,
} from '@/lib/time';
import {
  playChimeSound,
  triggerVibration,
  requestNotificationPermission,
  sendLocalNotification,
  AlarmSoundType,
} from '@/lib/alarm';

export interface ActiveAlarm {
  id: string;
  title: string;
  time: string;
  category?: string;
  type: 'task' | 'event';
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
  deleteTask: (id: string) => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  deleteEvent: (id: string) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  depositToSavings: (amount: number, note?: string) => void;
  transferSurplusToSavings: (customAmount?: number) => void;
  saveDailyNote: (text: string) => void;
  updateUserName: (name: string) => void;
  updateCurrency: (symbol: string, code: string) => void;
  activeModal: string | null;
  openModal: (modalName: string) => void;
  openModalWithTime: (modalName: string, time24: string) => void;
  prefilledTime: string;
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
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [prefilledTime, setPrefilledTime] = useState<string>('12:00');
  const [alarmSound, setAlarmSound] = useState<AlarmSoundType>('zen');

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
      todayStr
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
    window.addEventListener('visibilitychange', syncDateIfChanged);
    window.addEventListener('focus', syncDateIfChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', syncDateIfChanged);
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
        if (task.completed || !task.remindMe) return;
        if (task.dueDate && task.dueDate !== todayStr) return;

        const parsed = parseTimeString(task.dueTime);
        if (!parsed) return;

        const taskTotalMinutes = parsed.hours * 60 + parsed.minutes;
        const diff = nowTotalMinutes - taskTotalMinutes;

        // Trigger if:
        // 1. Current minute (diff === 0)
        // 2. OR phone was asleep / locked and woke up within the last 180 mins
        if (diff >= 0 && diff <= 180) {
          const alarmKey = `task-${task.id}-${todayStr}`;
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

      // Check events
      state.events.forEach((event) => {
        if (!event.remindMe) return;
        if (event.date && event.date !== todayStr) return;

        const parsed = parseTimeString(event.startTime);
        if (!parsed) return;

        const eventTotalMinutes = parsed.hours * 60 + parsed.minutes;
        const diff = nowTotalMinutes - eventTotalMinutes;

        // Trigger if:
        // 1. Current minute (diff === 0)
        // 2. OR phone was asleep / locked and woke up within the last 180 mins
        if (diff >= 0 && diff <= 180) {
          const alarmKey = `event-${event.id}-${todayStr}`;
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

      if (updatedKeys.length > 0) {
        setNotifiedAlarms((prev) => {
          const next = new Set(prev);
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
      checkAlarms();
    };

    window.addEventListener('visibilitychange', handleWake);
    window.addEventListener('focus', handleWake);

    const alarmInterval = setInterval(checkAlarms, 10000);
    return () => {
      clearInterval(alarmInterval);
      window.removeEventListener('visibilitychange', handleWake);
      window.removeEventListener('focus', handleWake);
    };
  }, [isHydrated, state.tasks, state.events, notifiedAlarms, state.alarmSoundEnabled, state.alarmVibrationEnabled, alarmSound]);

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
    sendLocalNotification(
      `Reminder: ${alarm.title}`,
      `Scheduled for ${alarm.time}${alarm.category ? ` · ${alarm.category}` : ''}`
    );
  };

  const dismissAlarm = () => {
    setActiveAlarm(null);
  };

  const snoozeAlarm = (minutes: number = 5) => {
    if (!activeAlarm) return;
    const current = activeAlarm;
    setActiveAlarm(null);

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
    return await requestNotificationPermission();
  };

  const toggleTask = (id: string) => {
    setState((prev) => {
      const updated = prev.tasks.map((task) => {
        if (task.id === id) {
          const nextCompleted = !task.completed;
          return {
            ...task,
            completed: nextCompleted,
            completedAt: nextCompleted ? 'Just now' : undefined,
          };
        }
        return task;
      });
      return {
        ...prev,
        tasks: updated,
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

  const deleteTask = (id: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
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
  todayStr: string = ''
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

  return {
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    totalSavings,
    directSavings,
    monthlyExtra,
    spentToday,
    weeklyBudgetLeft: Math.max(0, 5000 - monthlyExpenses),
    weeklyBudgetTotal: 5000,
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
        todayLocalStr
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
        todayLocalStr
      );

      return {
        ...prev,
        transactions: nextTransactions,
        financialSummary: nextFinancials,
      };
    });
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
    setPrefilledTime('12:00');
    setActiveModal(modalName);
  };

  const openModalWithTime = (modalName: string, time24: string) => {
    setPrefilledTime(time24);
    setActiveModal(modalName);
  };

  const closeModal = () => setActiveModal(null);

  const clearAllData = () => {
    completelyWipeLocalStorage();
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
    setState((prev) => {
      const next: AppState = {
        ...prev,
        transactions: [],
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
          currencySymbol: prev.financialSummary?.currencySymbol || '₱',
          currencyCode: prev.financialSummary?.currencyCode || 'PHP',
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
        const merged: AppState = {
          ...INITIAL_APP_STATE,
          ...parsed,
          alarmSoundEnabled: parsed.alarmSoundEnabled !== undefined ? parsed.alarmSoundEnabled : true,
          alarmVibrationEnabled: parsed.alarmVibrationEnabled !== undefined ? parsed.alarmVibrationEnabled : true,
          dailyNotes: parsed.dailyNotes || [],
          financialSummary: {
            ...INITIAL_APP_STATE.financialSummary,
            ...(parsed.financialSummary || {}),
            totalSavings: (parsed.financialSummary && parsed.financialSummary.totalSavings !== undefined)
              ? parsed.financialSummary.totalSavings
              : 0,
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
        deleteTask,
        addEvent,
        deleteEvent,
        addTransaction,
        deleteTransaction,
        depositToSavings,
        transferSurplusToSavings,
        saveDailyNote,
        updateUserName,
        updateCurrency,
        activeModal,
        openModal,
        openModalWithTime,
        prefilledTime,
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
