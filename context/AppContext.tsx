'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, CalendarEvent, TabType, Task, Transaction, Habit, DailyNote } from '@/lib/types';
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
  toggleHabit: (id: string) => void;
  addHabit: (title: string, emoji: string) => void;
  deleteHabit: (id: string) => void;
  saveDailyNote: (text: string) => void;
  updateMonthlyBudget: (limit: number) => void;
  updateUserName: (name: string) => void;
  updateCurrency: (symbol: string, code: string) => void;
  activeModal: string | null;
  openModal: (modalName: string) => void;
  openModalWithTime: (modalName: string, time24: string) => void;
  prefilledTime: string;
  closeModal: () => void;
  clearAllData: () => void;
  exportBackup: () => void;
  importBackup: (fileContent: string) => boolean;
  // Alarm & Reminders
  activeAlarm: ActiveAlarm | null;
  alarmSound: AlarmSoundType;
  setAlarmSound: (sound: AlarmSoundType) => void;
  dismissAlarm: () => void;
  snoozeAlarm: (minutes?: number) => void;
  testAlarm: (sound?: AlarmSoundType) => void;
  enableNotifications: () => Promise<boolean>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [state, setState] = useState<AppState>(INITIAL_APP_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [prefilledTime, setPrefilledTime] = useState<string>('12:00');
  const [alarmSound, setAlarmSound] = useState<AlarmSoundType>('zen');

  // Real-time Clock & Date in LOCAL timezone
  const [nowDate, setNowDate] = useState<Date>(new Date());
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('9:41');
  const [currentDateHeader, setCurrentDateHeader] = useState<string>('MONDAY, NOVEMBER 9');
  const [currentMonthYear, setCurrentMonthYear] = useState<string>('November 2026');
  const [todayLocalStr, setTodayLocalStr] = useState<string>(getLocalDateString(new Date()));

  // Alarm state
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null);
  const [notifiedAlarms, setNotifiedAlarms] = useState<Set<string>>(new Set());

  // Load from localStorage after mount & lock in persistent storage
  useEffect(() => {
    const loaded = loadStoredAppState();
    setState(loaded);
    setIsHydrated(true);
    enablePersistentStorage();
  }, []);

  // Save to localStorage whenever state updates
  useEffect(() => {
    if (isHydrated) {
      saveStoredAppState(state);
    }
  }, [state, isHydrated]);

  // Live Clock loop (updates every second)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setNowDate(now);
      setCurrentTimeStr(getCurrentTimeFormatted(now));
      setCurrentDateHeader(getCurrentDateHeader(now));
      setCurrentMonthYear(getCurrentMonthYear(now));
      setTodayLocalStr(getLocalDateString(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Alarm Monitor loop
  useEffect(() => {
    if (!isHydrated) return;

    const checkAlarms = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const todayStr = getLocalDateString(now);

      // Check tasks
      state.tasks.forEach((task) => {
        if (task.completed || !task.remindMe) return;
        // Alarm only for tasks due today or without due date
        if (task.dueDate && task.dueDate !== todayStr) return;

        const parsed = parseTimeString(task.dueTime);
        if (!parsed) return;

        if (parsed.hours === currentHours && parsed.minutes === currentMinutes) {
          const alarmKey = `task-${task.id}-${todayStr}-${currentHours}:${currentMinutes}`;
          if (!notifiedAlarms.has(alarmKey)) {
            triggerAlarm({
              id: task.id,
              title: task.title,
              time: task.dueTime,
              category: task.category,
              type: 'task',
            });
            setNotifiedAlarms((prev) => new Set(prev).add(alarmKey));
          }
        }
      });

      // Check events
      state.events.forEach((event) => {
        if (!event.remindMe) return;
        if (event.date && event.date !== todayStr) return;

        const parsed = parseTimeString(event.startTime);
        if (!parsed) return;

        if (parsed.hours === currentHours && parsed.minutes === currentMinutes) {
          const alarmKey = `event-${event.id}-${todayStr}-${currentHours}:${currentMinutes}`;
          if (!notifiedAlarms.has(alarmKey)) {
            triggerAlarm({
              id: event.id,
              title: event.title,
              time: event.startTime,
              category: event.location,
              type: 'event',
            });
            setNotifiedAlarms((prev) => new Set(prev).add(alarmKey));
          }
        }
      });
    };

    const alarmInterval = setInterval(checkAlarms, 10000);
    return () => clearInterval(alarmInterval);
  }, [isHydrated, state.tasks, state.events, notifiedAlarms, alarmSound]);

  const toggleTheme = () => {
    setState((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const triggerAlarm = (alarm: ActiveAlarm) => {
    setActiveAlarm(alarm);
    playChimeSound(alarmSound);
    triggerVibration();
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

  const testAlarm = (soundOverride?: AlarmSoundType) => {
    const selectedSound = soundOverride || alarmSound;
    playChimeSound(selectedSound);
    triggerAlarm({
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

  const addTransaction = (txData: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}`,
    };
    setState((prev) => {
      const isExpense = txData.type === 'expense';
      const updatedSpentToday = isExpense ? prev.financialSummary.spentToday + txData.amount : prev.financialSummary.spentToday;
      const updatedExpenses = isExpense ? prev.financialSummary.monthlyExpenses + txData.amount : prev.financialSummary.monthlyExpenses;
      const updatedIncome = !isExpense ? prev.financialSummary.monthlyIncome + txData.amount : prev.financialSummary.monthlyIncome;
      const updatedBalance = isExpense ? prev.financialSummary.totalBalance - txData.amount : prev.financialSummary.totalBalance + txData.amount;
      const updatedWeeklyBudget = isExpense ? Math.max(0, prev.financialSummary.weeklyBudgetLeft - txData.amount) : prev.financialSummary.weeklyBudgetLeft;

      return {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        financialSummary: {
          ...prev.financialSummary,
          totalBalance: updatedBalance,
          monthlyIncome: updatedIncome,
          monthlyExpenses: updatedExpenses,
          spentToday: updatedSpentToday,
          weeklyBudgetLeft: updatedWeeklyBudget,
        },
      };
    });
  };

  const deleteTransaction = (id: string) => {
    setState((prev) => {
      const target = prev.transactions.find((t) => t.id === id);
      if (!target) return prev;
      const isExpense = target.type === 'expense';
      return {
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== id),
        financialSummary: {
          ...prev.financialSummary,
          totalBalance: isExpense ? prev.financialSummary.totalBalance + target.amount : prev.financialSummary.totalBalance - target.amount,
          monthlyExpenses: isExpense ? Math.max(0, prev.financialSummary.monthlyExpenses - target.amount) : prev.financialSummary.monthlyExpenses,
          monthlyIncome: !isExpense ? Math.max(0, prev.financialSummary.monthlyIncome - target.amount) : prev.financialSummary.monthlyIncome,
        },
      };
    });
  };

  // Habits management
  const toggleHabit = (id: string) => {
    const todayStr = getLocalDateString(new Date());
    setState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => {
        if (h.id === id) {
          const isDoneToday = h.lastCompletedDate === todayStr;
          return {
            ...h,
            streak: isDoneToday ? Math.max(0, h.streak - 1) : h.streak + 1,
            lastCompletedDate: isDoneToday ? undefined : todayStr,
          };
        }
        return h;
      }),
    }));
  };

  const addHabit = (title: string, emoji: string) => {
    const newH: Habit = {
      id: `habit-${Date.now()}`,
      title,
      emoji: emoji || '✨',
      streak: 0,
    };
    setState((prev) => ({ ...prev, habits: [...prev.habits, newH] }));
  };

  const deleteHabit = (id: string) => {
    setState((prev) => ({ ...prev, habits: prev.habits.filter((h) => h.id !== id) }));
  };

  // Daily Micro-Journal (uses getLocalDateString)
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

  const updateMonthlyBudget = (limit: number) => {
    setState((prev) => ({
      ...prev,
      financialSummary: {
        ...prev.financialSummary,
        monthlyBudgetLimit: limit,
      },
    }));
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
      habits: [],
      dailyNotes: [],
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
          habits: parsed.habits || INITIAL_APP_STATE.habits,
          dailyNotes: parsed.dailyNotes || [],
          financialSummary: {
            ...INITIAL_APP_STATE.financialSummary,
            ...(parsed.financialSummary || {}),
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
        toggleHabit,
        addHabit,
        deleteHabit,
        saveDailyNote,
        updateMonthlyBudget,
        updateUserName,
        updateCurrency,
        activeModal,
        openModal,
        openModalWithTime,
        prefilledTime,
        closeModal,
        clearAllData,
        exportBackup,
        importBackup,
        activeAlarm,
        alarmSound,
        setAlarmSound,
        dismissAlarm,
        snoozeAlarm,
        testAlarm,
        enableNotifications,
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
