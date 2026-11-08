export type TabType = 'dashboard' | 'todo' | 'schedule' | 'money';

export type Category = 'Work' | 'Personal' | 'Money' | 'Health';

export interface Task {
  id: string;
  title: string;
  details?: string;
  category: Category;
  dueDate: string; // "YYYY-MM-DD"
  dueTime: string; // "HH:MM" (or formatted)
  completed: boolean;
  completedAt?: string;
  remindMe?: boolean;
  reminderTime?: string;
  repeat?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  location?: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  allDay?: boolean;
  remindMe?: boolean;
  notes?: string;
  type?: 'meeting' | 'food' | 'wellness' | 'routine';
  isUpNext?: boolean;
}

export interface Transaction {
  id: string;
  type: 'expense' | 'income';
  merchant: string;
  category: string;
  amount: number;
  date: string; // "YYYY-MM-DD"
  note?: string;
}

export interface Habit {
  id: string;
  title: string;
  emoji: string;
  streak: number;
  lastCompletedDate?: string; // "YYYY-MM-DD"
}

export interface DailyNote {
  date: string; // "YYYY-MM-DD"
  text: string;
}

export interface FinancialSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  spentToday: number;
  weeklyBudgetLeft: number;
  weeklyBudgetTotal: number;
  monthlyBudgetLimit: number;
  currencySymbol: string;
  currencyCode: string;
}

export interface AppState {
  userName: string;
  theme: 'light' | 'dark';
  tasks: Task[];
  events: CalendarEvent[];
  transactions: Transaction[];
  habits: Habit[];
  dailyNotes: DailyNote[];
  financialSummary: FinancialSummary;
}
