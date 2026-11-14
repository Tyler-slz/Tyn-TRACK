import { AppState } from './types';

export const INITIAL_APP_STATE: AppState = {
  userName: 'Yo Tyn',
  theme: 'light',
  alarmSoundEnabled: true,
  alarmVibrationEnabled: true,
  tasks: [],
  events: [],
  transactions: [],
  dailyNotes: [],
  moneyReminders: [],
  monthlyBudget: 0,
  checkInSettings: {
    morningEnabled: false,
    morningTime: '08:00',
    eveningEnabled: false,
    eveningTime: '21:00',
  },
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
      alarmSoundEnabled: parsed.alarmSoundEnabled !== undefined ? parsed.alarmSoundEnabled : true,
      alarmVibrationEnabled: parsed.alarmVibrationEnabled !== undefined ? parsed.alarmVibrationEnabled : true,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      dailyNotes: Array.isArray(parsed.dailyNotes) ? parsed.dailyNotes : [],
      moneyReminders: Array.isArray(parsed.moneyReminders) ? parsed.moneyReminders : [],
      monthlyBudget: typeof parsed.monthlyBudget === 'number' && !Number.isNaN(parsed.monthlyBudget)
        ? Math.max(0, parsed.monthlyBudget)
        : 0,
      checkInSettings: {
        ...INITIAL_APP_STATE.checkInSettings,
        ...(parsed.checkInSettings || {}),
      },
      financialSummary: {
        ...INITIAL_APP_STATE.financialSummary,
        ...(parsed.financialSummary || {}),
        totalSavings: (parsed.financialSummary && parsed.financialSummary.totalSavings !== undefined)
          ? parsed.financialSummary.totalSavings
          : 0,
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_APP_STATE));
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
