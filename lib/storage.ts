import { AppState } from './types';

export const INITIAL_APP_STATE: AppState = {
  userName: 'Yo Tyn',
  theme: 'light',
  tasks: [],
  events: [],
  transactions: [],
  habits: [
    { id: 'habit-1', title: 'Drink 2L Water', emoji: '💧', streak: 0 },
    { id: 'habit-2', title: 'Morning Stretch', emoji: '🧘', streak: 0 },
    { id: 'habit-3', title: 'Read 10 mins', emoji: '📖', streak: 0 },
  ],
  dailyNotes: [],
  financialSummary: {
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    spentToday: 0,
    weeklyBudgetLeft: 0,
    weeklyBudgetTotal: 0,
    monthlyBudgetLimit: 10000,
    currencySymbol: '₱',
    currencyCode: 'PHP',
  },
};

const STORAGE_KEY = 'lifeflow_pwa_data_v1';

export function loadStoredAppState(): AppState {
  if (typeof window === 'undefined') {
    return INITIAL_APP_STATE;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_APP_STATE));
      return INITIAL_APP_STATE;
    }
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_APP_STATE,
      ...parsed,
      habits: parsed.habits || INITIAL_APP_STATE.habits,
      dailyNotes: parsed.dailyNotes || [],
      financialSummary: {
        ...INITIAL_APP_STATE.financialSummary,
        ...(parsed.financialSummary || {}),
      },
    };
  } catch (err) {
    console.error('Failed to parse localStorage data:', err);
    return INITIAL_APP_STATE;
  }
}

export function saveStoredAppState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

export function completelyWipeLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...INITIAL_APP_STATE,
      habits: [],
      dailyNotes: [],
    }));
  } catch (err) {
    console.error('Failed to clear localStorage:', err);
  }
}

export async function enablePersistentStorage(): Promise<boolean> {
  if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    } catch (e) {
      console.warn('Persistent storage request failed:', e);
    }
  }
  return false;
}

export function exportDataToFile(state: AppState) {
  if (typeof window === 'undefined') return;
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(state, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('download', `lifeflow-backup-${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
