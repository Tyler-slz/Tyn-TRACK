export type TabType = 'dashboard' | 'todo' | 'schedule' | 'money';

export type Category = 'Work' | 'Personal' | 'Money' | 'Health';

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskRepeatType = 'none' | 'daily' | 'weekdays' | 'weekly';

export interface Task {
  id: string;
  title: string;
  details?: string;
  category: Category;
  dueDate: string; // "YYYY-MM-DD"
  dueTime: string; // "HH:MM", "h:mm AM/PM", or "Anytime"
  completed: boolean;
  completedAt?: string;
  remindMe?: boolean;
  reminderTime?: string;
  repeat?: TaskRepeatType | string;
  priority?: TaskPriority;
}

export type EventRepeatType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'custom';

export interface CalendarEvent {
  id: string;
  title: string;
  location?: string;
  date: string; // "YYYY-MM-DD" anchor/start date
  startTime: string; // "HH:MM" or "h:mm AM/PM"
  endTime: string;   // "HH:MM" or "h:mm AM/PM"
  allDay?: boolean;
  remindMe?: boolean;
  notes?: string;
  type?: 'meeting' | 'food' | 'wellness' | 'routine';
  isUpNext?: boolean;
  repeat?: EventRepeatType;
  repeatDays?: number[]; // 0 = Sun .. 6 = Sat (used when repeat === 'custom')
  repeatEndDate?: string; // Optional "YYYY-MM-DD" inclusive bound
  skippedDates?: string[]; // Individual dates skipped from a repeating series
}

export interface Transaction {
  id: string;
  type: 'expense' | 'income' | 'savings';
  merchant: string;
  category: string;
  amount: number;
  date: string; // "YYYY-MM-DD"
  note?: string;
}

export type MoneyReminderKind = 'bill' | 'owe' | 'owed';

export interface MoneyReminder {
  id: string;
  kind: MoneyReminderKind;
  title: string;
  person?: string;
  amount: number;
  dueDate: string; // "YYYY-MM-DD"
  dueTime: string; // "h:mm AM/PM" or "HH:MM"
  remindMe: boolean;
  settled: boolean;
  settledAt?: string; // "YYYY-MM-DD"
  linkedTransactionId?: string;
  note?: string;
}

export interface DailyCheckInSettings {
  morningEnabled: boolean;
  morningTime: string; // "HH:MM" 24h
  eveningEnabled: boolean;
  eveningTime: string; // "HH:MM" 24h
}

export interface DailyNote {
  date: string; // "YYYY-MM-DD"
  text: string;
}

export interface FinancialSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  totalSavings: number;
  directSavings: number;
  monthlyExtra: number;
  spentToday: number;
  weeklyBudgetLeft: number;
  weeklyBudgetTotal: number;
  currencySymbol: string;
  currencyCode: string;
}

export interface AppState {
  userName: string;
  theme: 'light' | 'dark';
  alarmSoundEnabled: boolean;
  alarmVibrationEnabled: boolean;
  tasks: Task[];
  events: CalendarEvent[];
  transactions: Transaction[];
  dailyNotes: DailyNote[];
  financialSummary: FinancialSummary;
  moneyReminders: MoneyReminder[];
  monthlyBudget: number;
  checkInSettings: DailyCheckInSettings;
}
