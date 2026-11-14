'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  X,
  Calendar,
  Clock,
  Check,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  ShoppingBag,
  Volume2,
  Music,
  Moon,
  Sun,
  Smartphone,
} from 'lucide-react';
import { AlarmSoundType, sendLocalNotificationDetailed, triggerVibration } from '@/lib/alarm';
import { addDaysToDateString } from '@/lib/time';
import { MoneyReminderModal } from './MoneyReminderModal';
import { EventModal } from './EventModal';
import { TaskModal } from './TaskModal';
import {
  getNativeNotificationStatus,
  isNativeApp,
  openNativeExactAlarmSettings,
  scheduleNativeTestAlarm,
  syncAllNativeAlarms,
} from '@/lib/nativeAlarms';

export function ActionModals() {
  const {
    activeModal,
    closeModal,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    editingTransaction,
    state,
    updateUserName,
    updateCurrency,
    updateCheckInSettings,
    exportBackup,
    importBackup,
    clearAllData,
    testAlarm,
    enableNotifications,
    alarmSound,
    setAlarmSound,
    alarmSoundEnabled,
    toggleAlarmSound,
    alarmVibrationEnabled,
    toggleAlarmVibration,
    theme,
    toggleTheme,
    todayLocalStr,
    isInstallable,
    isStandalone,
    promptInstallApp,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  // Settings state
  const [tempName, setTempName] = useState(state.userName);
  const [tempSymbol, setTempSymbol] = useState(state.financialSummary.currencySymbol);
  const [tempCode, setTempCode] = useState(state.financialSummary.currencyCode);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const nativeMode = isNativeApp();
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [exactAlarmStatus, setExactAlarmStatus] = useState<'granted' | 'denied' | 'unsupported'>('unsupported');
  const [testNotifFeedback, setTestNotifFeedback] = useState<string | null>(null);
  const [delayedTestSeconds, setDelayedTestSeconds] = useState<number | null>(null);
  const [showPhoneGuide, setShowPhoneGuide] = useState(false);

  const refreshNotificationStatus = async () => {
    if (isNativeApp()) {
      const status = await getNativeNotificationStatus();
      setNotifPermission(status.display === 'granted' ? 'granted' : status.display === 'denied' ? 'denied' : 'default');
      setExactAlarmStatus(status.exactAlarm);
      return;
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  };

  useEffect(() => {
    void refreshNotificationStatus();
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const onFocus = () => void refreshNotificationStatus();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshNotificationStatus();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeModal]);

  useEffect(() => {
    if (delayedTestSeconds === null) return;
    if (delayedTestSeconds === 0) {
      setDelayedTestSeconds(null);
      if (!isNativeApp()) {
        triggerVibration();
        void runDiagnosticNotification('Tyn Background Test', 'Notification bar test while outside Tyn!');
      }
      return;
    }
    const timer = setTimeout(() => {
      setDelayedTestSeconds((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [delayedTestSeconds]);

  const runDiagnosticNotification = async (title: string, body: string) => {
    const res = await sendLocalNotificationDetailed(title, body);
    await refreshNotificationStatus();
    if (res.permission === 'denied') {
      setTestNotifFeedback(
        isNativeApp()
          ? '⚠️ Notifications blocked. Open Phone Settings → Apps → Tyn → Notifications → Allow.'
          : '⚠️ Blocked in Chrome site settings. Tap the 🔒/tune icon next to the URL → Permissions → Notifications → Allow.'
      );
      return res;
    }
    if (!res.ok) {
      setTestNotifFeedback(`❌ ${res.detail} (Permission: ${res.permission}, Mode: ${res.swState})`);
      return res;
    }
    setTestNotifFeedback(
      isNativeApp()
        ? `✓ Sent native Android alert (${res.swState}).`
        : `✓ Sent via ${res.method} (SW: ${res.swState}). If it did not show in your notification bar, check the Infinix/Android guide below.`
    );
    return res;
  };

  // Money form state
  const [entryType, setEntryType] = useState<'expense' | 'income' | 'savings'>('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [moneyCategory, setMoneyCategory] = useState('Food & groceries');
  const [moneyDate, setMoneyDate] = useState(todayLocalStr);
  const [moneyNote, setMoneyNote] = useState('');

  useEffect(() => {
    if (activeModal === 'edit-money' && editingTransaction) {
      setEntryType(editingTransaction.type);
      setAmount(String(editingTransaction.amount));
      setMerchant(editingTransaction.merchant || '');
      setMoneyCategory(
        editingTransaction.category ||
          (editingTransaction.type === 'income'
            ? 'Salary'
            : editingTransaction.type === 'savings'
            ? 'Savings'
            : 'Food & groceries')
      );
      setMoneyDate(editingTransaction.date || todayLocalStr);
      setMoneyNote(editingTransaction.note || '');
      return;
    }

    if (activeModal === 'add-money' || activeModal === 'add-income' || activeModal === 'add-savings') {
      setMoneyDate(todayLocalStr);
      setAmount('');
      setMoneyNote('');
      if (activeModal === 'add-savings') {
        setEntryType('savings');
        setMerchant('Piggy Bank');
        setMoneyCategory('Savings');
      } else if (activeModal === 'add-income') {
        setEntryType('income');
        setMerchant('');
        setMoneyCategory('Salary');
      } else {
        setEntryType('expense');
        setMerchant('');
        setMoneyCategory('Food & groceries');
      }
    }
  }, [activeModal, editingTransaction, todayLocalStr]);

  if (!activeModal) return null;
  if (activeModal === 'add-money-reminder' || activeModal === 'edit-money-reminder') {
    return <MoneyReminderModal />;
  }
  if (activeModal === 'add-event' || activeModal === 'edit-event') return <EventModal />;
  if (activeModal === 'add-todo' || activeModal === 'edit-todo') return <TaskModal />;

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount) || 0;
    if (!merchant.trim() || parsedAmount <= 0) return;

    const payload = {
      type: entryType,
      merchant: merchant.trim(),
      category:
        moneyCategory.trim() ||
        (entryType === 'income' ? 'Income' : entryType === 'savings' ? 'Savings' : 'General'),
      amount: parsedAmount,
      date: moneyDate || todayLocalStr,
      note: moneyNote.trim(),
    };

    if (activeModal === 'edit-money' && editingTransaction) {
      updateTransaction(editingTransaction.id, payload);
    } else {
      addTransaction(payload);
    }

    setMerchant('');
    setAmount('');
    setMoneyNote('');
    closeModal();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importBackup(content);
        if (ok) {
          setImportStatus('Backup restored successfully!');
          setTimeout(() => {
            setImportStatus(null);
            closeModal();
          }, 1200);
        } else {
          setImportStatus('Failed to parse backup file.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSaveProfile = () => {
    if (tempName.trim()) updateUserName(tempName.trim());
    if (tempSymbol.trim() && tempCode.trim()) updateCurrency(tempSymbol.trim(), tempCode.trim());
    closeModal();
  };

  return (
    <div
      onClick={closeModal}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-[36px] sm:rounded-[36px] p-6 safe-modal-bottom shadow-2xl border transition-all ${
          isDark
            ? 'bg-[#151D18] border-[#25332B] text-[#EDEFEA]'
            : 'bg-[#FAF8F5] border-[#ECECE6] text-[#1E2621]'
        }`}
      >
        {/* Modal: Settings */}
        {activeModal === 'settings' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[11px] font-semibold tracking-widest uppercase ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
                  Personal Preferences
                </p>
                <h2 className={`text-[26px] font-bold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                  Settings
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                  isDark ? 'bg-[#202C25] border-[#2F3F36] text-[#8EA397]' : 'bg-white border-[#E3E8E1] text-[#69796D]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dark Mode Switch */}
            <div
              className={`rounded-2xl p-4 border flex items-center justify-between ${
                isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-[#28382F] text-[#7CC79E]' : 'bg-[#EBF2EA] text-[#274E3C]'}`}>
                  {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <div>
                  <p className={`text-[14px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                    Dark Theme
                  </p>
                  <p className={`text-[11px] ${isDark ? 'text-[#8EA397]' : 'text-[#7A877E]'}`}>
                    {isDark ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                  isDark ? 'bg-[#274E3C]' : 'bg-[#CBD6CC]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    isDark ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Install App on Phone Banner */}
            <div
              className={`rounded-2xl p-4 border space-y-3 transition-all ${
                isDark ? 'bg-[#1B2720] border-[#27382E]' : 'bg-[#EDF4EC] border-[#D9E6D7]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                  isDark ? 'bg-[#27382D] text-[#7CC79E]' : 'bg-[#DCE9DA] text-[#274E3C]'
                }`}>
                  <Download className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <p className={`text-[14px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                    {isStandalone ? 'App is Installed' : 'Install Tyn App'}
                  </p>
                  <p className={`text-[11px] ${isDark ? 'text-[#8EA397]' : 'text-[#64796B]'}`}>
                    {isStandalone
                      ? 'Running in full-screen standalone app mode.'
                      : 'Add to home screen for 1-tap full-screen access.'}
                  </p>
                </div>
              </div>

              {!isStandalone && (
                <button
                  type="button"
                  onClick={promptInstallApp}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#274E3C] hover:bg-[#1E3F30] text-white text-[13px] font-semibold tracking-wide shadow-sm flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install App on Phone</span>
                </button>
              )}
            </div>

            {/* Offline Storage Notice */}
            <div
              className={`border rounded-2xl p-3.5 flex items-start space-x-3 text-[12px] ${
                isDark ? 'bg-[#18241E] border-[#283A30] text-[#7CC79E]' : 'bg-[#EFF5EE] border-[#DEE8DD] text-[#4F6856]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">100% Private & Stored on Device</p>
                <p className={`mt-0.5 ${isDark ? 'text-[#8EA597]' : 'text-[#647769]'}`}>
                  All tasks, events, and money entries reside exclusively in your phone's browser storage. No cloud servers, $0 cost.
                </p>
              </div>
            </div>

            {/* Reminder Alarms, Chime & Vibration Controls */}
            <div
              className={`rounded-2xl p-4 border space-y-3 ${
                isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <label className="text-[12px] font-semibold flex items-center space-x-1.5">
                  <Music className="w-3.5 h-3.5 text-[#274E3C] dark:text-[#7CC79E]" />
                  <span>Reminder Alarms & Feedback</span>
                </label>
                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={async () => {
                      if (delayedTestSeconds !== null) {
                        setDelayedTestSeconds(null);
                        setTestNotifFeedback(null);
                      } else if (nativeMode) {
                        setTestNotifFeedback('Scheduling native Android 5s AlarmManager test...');
                        const res = await scheduleNativeTestAlarm(5);
                        await refreshNotificationStatus();
                        if (res.ok) {
                          setDelayedTestSeconds(5);
                          setTestNotifFeedback(`Swipe home, lock screen, or close Tyn now — ${res.detail}`);
                        } else {
                          setTestNotifFeedback(`⚠️ ${res.detail}`);
                        }
                      } else {
                        setDelayedTestSeconds(5);
                        setTestNotifFeedback('Swipe home or lock screen now — sending phone notification in 5s...');
                      }
                    }}
                    className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1"
                  >
                    <Clock className="w-3 h-3" />
                    <span>{delayedTestSeconds !== null ? `Cancel (${delayedTestSeconds}s)` : '5s Outside Test'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      testAlarm(undefined, true);
                      setTestNotifFeedback('Testing alarm & sending notification to phone bar...');
                      await runDiagnosticNotification(
                        'Tyn Alarm Test',
                        'Phone vibration & status bar notification working!'
                      );
                    }}
                    className="text-[11px] font-semibold text-[#274E3C] dark:text-[#7CC79E] hover:underline flex items-center space-x-1"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Test Alarm</span>
                  </button>
                </div>
              </div>

              {/* Enable Phone System Notifications Button */}
              <button
                type="button"
                onClick={async () => {
                  if (typeof window === 'undefined') return;
                  if (nativeMode) {
                    setTestNotifFeedback('Checking Android notification & exact alarm permissions...');
                    const granted = await enableNotifications();
                    await refreshNotificationStatus();
                    if (!granted) {
                      setTestNotifFeedback(
                        '⚠️ Permission was not granted. Open Phone Settings → Apps → Tyn → Notifications → Allow.'
                      );
                      return;
                    }
                    const status = await getNativeNotificationStatus();
                    if (status.exactAlarm !== 'granted') {
                      await openNativeExactAlarmSettings();
                      await refreshNotificationStatus();
                    }
                    const syncRes = await syncAllNativeAlarms(
                      state.tasks,
                      state.events,
                      state.moneyReminders || [],
                      state.checkInSettings,
                      state.financialSummary?.currencySymbol || '₱'
                    );
                    await runDiagnosticNotification(
                      'Tyn Native Alarms Active',
                      `${syncRes.scheduledCount} upcoming reminder(s) synced (${syncRes.exactAlarm === 'granted' ? 'Exact timing' : 'Inexact fallback'}).`
                    );
                    return;
                  }
                  if (!('Notification' in window)) {
                    setTestNotifFeedback('Notifications are not supported in this browser. Open Tyn in Google Chrome.');
                    return;
                  }
                  if (Notification.permission === 'denied') {
                    setTestNotifFeedback(
                      '⚠️ Notifications are blocked in Chrome! Tap the 🔒 icon next to tyn-track.vercel.app → Site Settings → Notifications → Allow.'
                    );
                    return;
                  }
                  setTestNotifFeedback('Checking phone notification status...');
                  const granted = await enableNotifications();
                  setNotifPermission(Notification.permission);
                  if (granted) {
                    await runDiagnosticNotification(
                      'Tyn Notification Active',
                      'Alarms will now sound & vibrate on your phone bar.'
                    );
                  } else {
                    setTestNotifFeedback('Permission was not granted. Please tap Allow on the phone popup.');
                  }
                }}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all active:scale-[0.99] ${
                  notifPermission === 'granted' && (!nativeMode || exactAlarmStatus === 'granted')
                    ? isDark ? 'bg-[#17231D] border-[#283A2E] text-[#7CC79E]' : 'bg-[#EDF5EC] border-[#DBE9DA] text-[#274E3C]'
                    : notifPermission === 'denied'
                    ? isDark ? 'bg-[#291717] border-[#4A2626] text-rose-400' : 'bg-[#FDF2F2] border-[#F8D7DA] text-rose-700'
                    : isDark ? 'bg-[#221B1A] border-[#382624] text-amber-400' : 'bg-[#FFF7ED] border-[#FED7AA] text-amber-700'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Volume2 className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold">
                      {notifPermission === 'granted'
                        ? nativeMode && exactAlarmStatus === 'denied'
                          ? 'Allow Exact Alarms (Android 14)'
                          : nativeMode
                          ? 'Native Android Alarms Active'
                          : 'Phone Notifications Active'
                        : notifPermission === 'denied'
                        ? nativeMode
                          ? 'Notifications Disabled in Android'
                          : 'Notifications Blocked in Chrome'
                        : 'Allow Phone Notifications'}
                    </p>
                    <p className="text-[11px] opacity-85">
                      {notifPermission === 'granted'
                        ? nativeMode && exactAlarmStatus === 'denied'
                          ? 'Tap to allow "Alarms & reminders" for exact timing when closed'
                          : 'Tap to send test alert to notification bar'
                        : notifPermission === 'denied'
                        ? nativeMode
                          ? 'Phone Settings → Apps → Tyn → Notifications → Allow'
                          : 'Tap to see how to unblock in Chrome'
                        : 'Tap here to allow system alerts & vibrations'}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold py-1 px-2.5 rounded-lg bg-black/10 dark:bg-white/10 shrink-0">
                  {notifPermission === 'granted'
                    ? nativeMode && exactAlarmStatus === 'denied'
                      ? 'Fix Exact'
                      : 'Active'
                    : notifPermission === 'denied'
                    ? 'Blocked'
                    : 'Enable'}
                </span>
              </button>

              {/* Status or troubleshooting message */}
              {testNotifFeedback && (
                <div className={`p-2.5 rounded-xl text-[11px] leading-relaxed border ${
                  testNotifFeedback.includes('Blocked') || testNotifFeedback.includes('⚠️') || testNotifFeedback.includes('❌')
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 font-medium'
                    : 'bg-[#274E3C]/10 border-[#274E3C]/20 text-[#274E3C] dark:text-[#7CC79E]'
                }`}>
                  {testNotifFeedback}
                </div>
              )}

              {/* Infinix / Android 14 Notification Bar Fix Guide */}
              <div className={`rounded-xl border text-[11px] ${
                isDark ? 'bg-[#161F1A] border-[#26372D] text-[#9BB0A3]' : 'bg-[#FAFBF9] border-[#EDF1EB] text-[#55695B]'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowPhoneGuide(!showPhoneGuide)}
                  className="w-full px-3 py-2 flex items-center justify-between text-left font-semibold"
                >
                  <span>Not showing in Infinix / Android status bar?</span>
                  <span className="text-[10px] opacity-75">{showPhoneGuide ? 'Hide' : 'Fix Guide'}</span>
                </button>
                {showPhoneGuide && (
                  <div className="px-3 pb-3 pt-1 space-y-1.5 border-t border-black/5 dark:border-white/5 leading-relaxed">
                    {nativeMode ? (
                      <>
                        <p><b>1. Exact Alarms:</b> Phone Settings → Apps → <b>Tyn</b> → Alarms &amp; reminders → allow <b>Setting alarms and reminders</b>.</p>
                        <p><b>2. Tyn Notification Channel:</b> Phone Settings → Apps → <b>Tyn</b> → Notifications → <b>Tyn Reminders &amp; Alarms</b> → set <b>Importance: High/Urgent</b> &amp; turn ON <b>Floating / Lock screen / Status bar</b>.</p>
                        <p><b>3. XOS Battery &amp; Auto-start:</b> Phone Settings → Apps → <b>Tyn</b> → Battery → set <b>Unrestricted</b>, and enable <b>Auto-start</b> in Phone Master so reboot/Doze alarms stay reliable.</p>
                        <p><b>4. Offline Closed-App Test:</b> Tap <b>&quot;5s Outside Test&quot;</b> above and lock/swipe home — native AlarmManager will fire even with Tyn closed.</p>
                      </>
                    ) : (
                      <>
                        <p><b>1. Chrome &quot;Sites&quot; Channel:</b> Phone Settings → Apps → <b>Chrome</b> → Notifications → Notification categories → <b>Sites</b> → set <b>Importance: High/Alert</b> &amp; turn ON <b>Floating / Pop on screen</b> + <b>Status bar</b>.</p>
                        <p><b>2. Show Silent Icons:</b> Phone Settings → Notification Center → More settings → turn <b>OFF</b> &quot;Hide silent notifications in status bar&quot;.</p>
                        <p><b>3. XOS Battery &amp; Game Mode:</b> Set Chrome &amp; Tyn Battery to <b>Unrestricted</b>, and check Phone Master / XArena isn&apos;t blocking notifications.</p>
                        <p><b>4. Test outside app:</b> Tap <b>&quot;5s Outside Test&quot;</b> above and swipe to your Home screen.</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Alarm Chime Sound Toggle */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                  isDark ? 'bg-[#161F1A] border-[#26372D]' : 'bg-[#FAFBF9] border-[#EDF1EB]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Volume2 className={`w-4 h-4 ${alarmSoundEnabled ? 'text-[#274E3C] dark:text-[#7CC79E]' : 'text-gray-400'}`} />
                  <div>
                    <p className={`text-[13px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                      Alarm Chime Sound
                    </p>
                    <p className={`text-[11px] ${isDark ? 'text-[#8EA397]' : 'text-[#7A877E]'}`}>
                      {alarmSoundEnabled ? 'Plays melodic chime' : 'Muted (Silent)'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleAlarmSound}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                    alarmSoundEnabled ? 'bg-[#274E3C]' : 'bg-[#CBD6CC]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      alarmSoundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Device Vibration Toggle */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                  isDark ? 'bg-[#161F1A] border-[#26372D]' : 'bg-[#FAFBF9] border-[#EDF1EB]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Smartphone className={`w-4 h-4 ${alarmVibrationEnabled ? 'text-[#274E3C] dark:text-[#7CC79E]' : 'text-gray-400'}`} />
                  <div>
                    <p className={`text-[13px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                      Device Vibration
                    </p>
                    <p className={`text-[11px] ${isDark ? 'text-[#8EA397]' : 'text-[#7A877E]'}`}>
                      {alarmVibrationEnabled ? 'Vibrates phone on alarm' : 'Vibration disabled'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleAlarmVibration}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                    alarmVibrationEnabled ? 'bg-[#274E3C]' : 'bg-[#CBD6CC]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      alarmVibrationEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Melody selection when chime is enabled */}
              {alarmSoundEnabled && (
                <div className="pt-1 space-y-1.5">
                  <span className={`text-[11px] block font-medium ${isDark ? 'text-[#8EA397]' : 'text-[#7A877E]'}`}>
                    Choose Melody
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'zen', label: 'Zen Bell' },
                      { id: 'marimba', label: 'Marimba' },
                      { id: 'pulse', label: 'Pulse' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setAlarmSound(s.id as AlarmSoundType);
                          testAlarm(s.id as AlarmSoundType, true);
                        }}
                        className={`py-2 px-2 rounded-xl text-[12px] font-medium transition-all ${
                          alarmSound === s.id
                            ? 'bg-[#274E3C] text-white font-semibold shadow-sm'
                            : isDark
                            ? 'bg-[#161E19] text-[#8AA093] border border-[#2B3B32]'
                            : 'bg-[#FAFBF9] text-[#6E7D72] border border-[#ECECE6]'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Daily Check-In Reminders */}
            <div
              className={`rounded-2xl p-4 border space-y-3 ${
                isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
              }`}
            >
              <div>
                <p className={`text-[13px] font-semibold flex items-center space-x-1.5 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                  <Clock className="w-3.5 h-3.5 text-[#274E3C] dark:text-[#7CC79E]" />
                  <span>Daily Check-In Reminders</span>
                </p>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-[#8EA397]' : 'text-[#7A877E]'}`}>
                  Optional daily phone nudges to review your day &amp; money
                </p>
              </div>

              {/* Morning Kickoff */}
              <div
                className={`p-3 rounded-xl border space-y-2 ${
                  isDark ? 'bg-[#161F1A] border-[#26372D]' : 'bg-[#FAFBF9] border-[#EDF1EB]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Sun className={`w-4 h-4 ${state.checkInSettings?.morningEnabled ? 'text-amber-500' : 'text-gray-400'}`} />
                    <div>
                      <p className={`text-[13px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                        Morning Kickoff
                      </p>
                      <p className={`text-[11px] ${isDark ? 'text-[#8EA397]' : 'text-[#7A877E]'}`}>
                        Check tasks, schedule &amp; bills due
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextEnabled = !state.checkInSettings?.morningEnabled;
                      updateCheckInSettings({ morningEnabled: nextEnabled });
                      if (nextEnabled) {
                        void enableNotifications();
                      }
                    }}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                      state.checkInSettings?.morningEnabled ? 'bg-[#274E3C]' : 'bg-[#CBD6CC]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        state.checkInSettings?.morningEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {state.checkInSettings?.morningEnabled && (
                  <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                    <span className={`text-[11px] font-medium ${isDark ? 'text-[#8EA397]' : 'text-[#6A786E]'}`}>
                      Morning alert time
                    </span>
                    <input
                      type="time"
                      value={state.checkInSettings?.morningTime || '08:00'}
                      onChange={(e) => updateCheckInSettings({ morningTime: e.target.value || '08:00' })}
                      className={`text-[13px] font-semibold px-2.5 py-1 rounded-lg border outline-none ${
                        isDark ? 'bg-[#1D2822] border-[#2E4034] text-white' : 'bg-white border-[#DDE4DC] text-[#1E2621]'
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Evening Wrap-up */}
              <div
                className={`p-3 rounded-xl border space-y-2 ${
                  isDark ? 'bg-[#161F1A] border-[#26372D]' : 'bg-[#FAFBF9] border-[#EDF1EB]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Moon className={`w-4 h-4 ${state.checkInSettings?.eveningEnabled ? 'text-[#7CC79E]' : 'text-gray-400'}`} />
                    <div>
                      <p className={`text-[13px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                        Evening Wrap-up
                      </p>
                      <p className={`text-[11px] ${isDark ? 'text-[#8EA397]' : 'text-[#7A877E]'}`}>
                        Log spending &amp; One Good Thing
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextEnabled = !state.checkInSettings?.eveningEnabled;
                      updateCheckInSettings({ eveningEnabled: nextEnabled });
                      if (nextEnabled) {
                        void enableNotifications();
                      }
                    }}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                      state.checkInSettings?.eveningEnabled ? 'bg-[#274E3C]' : 'bg-[#CBD6CC]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        state.checkInSettings?.eveningEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {state.checkInSettings?.eveningEnabled && (
                  <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                    <span className={`text-[11px] font-medium ${isDark ? 'text-[#8EA397]' : 'text-[#6A786E]'}`}>
                      Evening alert time
                    </span>
                    <input
                      type="time"
                      value={state.checkInSettings?.eveningTime || '21:00'}
                      onChange={(e) => updateCheckInSettings({ eveningTime: e.target.value || '21:00' })}
                      className={`text-[13px] font-semibold px-2.5 py-1 rounded-lg border outline-none ${
                        isDark ? 'bg-[#1D2822] border-[#2E4034] text-white' : 'bg-white border-[#DDE4DC] text-[#1E2621]'
                      }`}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Profile Fields */}
            <div className="space-y-3">
              <div
                className={`rounded-2xl p-4 border ${
                  isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
                }`}
              >
                <label className={`text-[11px] font-medium block mb-1 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
                  Your Name
                </label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full text-[15px] font-medium outline-none bg-transparent"
                  placeholder="e.g. Yo Tyn"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`rounded-2xl p-4 border ${
                    isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
                  }`}
                >
                  <label className={`text-[11px] font-medium block mb-1 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={tempSymbol}
                    onChange={(e) => setTempSymbol(e.target.value)}
                    className="w-full text-[15px] font-medium outline-none bg-transparent"
                    placeholder="e.g. ₱ or $"
                  />
                </div>
                <div
                  className={`rounded-2xl p-4 border ${
                    isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
                  }`}
                >
                  <label className={`text-[11px] font-medium block mb-1 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
                    Currency Code
                  </label>
                  <input
                    type="text"
                    value={tempCode}
                    onChange={(e) => setTempCode(e.target.value)}
                    className="w-full text-[15px] font-medium outline-none bg-transparent"
                    placeholder="e.g. PHP or USD"
                  />
                </div>
              </div>
            </div>

            {/* Backup & Restore */}
            <div className="space-y-2 pt-1">
              <label className="text-[12px] font-semibold block">
                Data Backup & Transfer
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={exportBackup}
                  className={`border py-3 px-3 rounded-2xl flex items-center justify-center space-x-2 text-[13px] font-medium transition-all ${
                    isDark
                      ? 'bg-[#1D2721] border-[#2A3930] text-[#7CC79E] hover:bg-[#25332B]'
                      : 'bg-white border-[#ECECE6] text-[#274E3C] hover:bg-[#F5F8F4]'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`border py-3 px-3 rounded-2xl flex items-center justify-center space-x-2 text-[13px] font-medium transition-all ${
                    isDark
                      ? 'bg-[#1D2721] border-[#2A3930] text-[#7CC79E] hover:bg-[#25332B]'
                      : 'bg-white border-[#ECECE6] text-[#274E3C] hover:bg-[#F5F8F4]'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Restore Backup</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,application/json"
                  className="hidden"
                />
              </div>

              {importStatus && (
                <p className="text-[12px] font-medium text-center text-[#274E3C] py-1">
                  {importStatus}
                </p>
              )}
            </div>

            {/* Clear all data section */}
            <div className={`pt-3 border-t ${isDark ? 'border-[#243028]' : 'border-[#ECECE6]'}`}>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Permanently wipe ALL data from your phone storage? Everything will be erased to 0.')) {
                    clearAllData();
                    closeModal();
                    alert('All data has been completely erased from your phone storage.');
                  }
                }}
                className="w-full py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold text-[13px] flex items-center justify-center space-x-2 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All Data from Storage</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveProfile}
              className="w-full py-4 rounded-[22px] bg-[#274E3C] hover:bg-[#1E3F30] text-white text-[15px] font-semibold tracking-wide shadow-soft transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4 stroke-[2]" />
              <span>Save & Close</span>
            </button>
          </div>
        )}

        {/* Modal: Add / Edit Money Entry */}
        {(activeModal === 'add-money' ||
          activeModal === 'add-income' ||
          activeModal === 'add-savings' ||
          activeModal === 'edit-money') && (
          <form onSubmit={handleCreateTransaction} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[11px] font-semibold tracking-widest uppercase ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
                  Less guesswork, more clarity
                </p>
                <h2 className={`text-[28px] font-bold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                  {activeModal === 'edit-money'
                    ? 'Edit money entry'
                    : entryType === 'savings'
                    ? 'Add savings'
                    : entryType === 'income'
                    ? 'Add income'
                    : 'Add money entry'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className={`w-9 h-9 rounded-full border flex items-center justify-center ${
                  isDark ? 'bg-[#202C25] border-[#2F3F36] text-[#8EA397]' : 'bg-white border-[#E3E8E1] text-[#69796D]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className={`text-[12px] font-semibold ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>Entry type</span>
              <div className={`p-1 rounded-full flex items-center ${isDark ? 'bg-[#1E2822]' : 'bg-[#EAEFE8]'}`}>
                {(
                  [
                    { id: 'expense', label: 'Expense', defaultCat: 'Food & groceries' },
                    { id: 'income', label: 'Income', defaultCat: 'Salary' },
                    { id: 'savings', label: 'Savings', defaultCat: 'Savings' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setEntryType(tab.id);
                      if (tab.id === 'savings') {
                        if (activeModal !== 'edit-money' || !merchant.trim()) {
                          setMerchant('Piggy Bank');
                        }
                      } else if (activeModal !== 'edit-money' && merchant === 'Piggy Bank') {
                        setMerchant('');
                      }
                      if (activeModal !== 'edit-money') {
                        setMoneyCategory(tab.defaultCat);
                      }
                    }}
                    className={`flex-1 py-2 rounded-full text-[13px] font-semibold transition-all ${
                      entryType === tab.id
                        ? 'bg-[#274E3C] text-white shadow-sm'
                        : isDark
                        ? 'text-[#8EA397]'
                        : 'text-[#6F7E73]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`rounded-[24px] p-5 border ${isDark ? 'bg-[#18231D] border-[#25362C]' : 'bg-[#EAF0E8] border-[#DEE8DD]'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-medium ${isDark ? 'text-[#8CAD99]' : 'text-[#657569]'}`}>
                  {entryType === 'savings' ? 'Amount to Save' : 'Amount'}
                </span>
                <span className={`text-[11px] font-semibold ${isDark ? 'text-[#8CAD99]' : 'text-[#657569]'}`}>{state.financialSummary.currencyCode}</span>
              </div>
              <div className="flex items-center mt-1">
                <span className="text-[34px] font-bold">
                  {state.financialSummary.currencySymbol}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-transparent text-[34px] font-bold outline-none w-full min-w-0 pl-1 placeholder:text-[#9FB1A5] dark:placeholder:text-[#455A4C]"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-semibold">The details</label>

              <div className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
                <span className={`text-[10px] block ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
                  {entryType === 'savings' ? 'Deposit Purpose / Title' : 'Merchant / Title'}
                </span>
                <input
                  type="text"
                  placeholder={entryType === 'savings' ? 'e.g. Piggy Bank / Emergency Fund' : 'e.g. Fresh Market / Salary'}
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  required
                  className="w-full text-[15px] font-semibold outline-none bg-transparent mt-0.5"
                />
              </div>

              {/* Category: Type custom or tap suggestion */}
              <div className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
                <div className="flex items-center space-x-2.5">
                  <ShoppingBag className="w-4 h-4 text-[#7A877E] shrink-0" />
                  <div className="flex-1">
                    <span className={`text-[10px] block ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
                      Category (type your own or tap below)
                    </span>
                    <input
                      type="text"
                      placeholder={
                        entryType === 'expense'
                          ? 'e.g. Food & groceries, Shopping, Gym...'
                          : entryType === 'income'
                          ? 'e.g. Salary, Freelance, Bonus...'
                          : 'e.g. Savings, Emergency Fund...'
                      }
                      value={moneyCategory}
                      onChange={(e) => setMoneyCategory(e.target.value)}
                      className="w-full text-[14px] font-semibold bg-transparent outline-none mt-0.5"
                    />
                  </div>
                </div>

                {/* Quick suggestion pills */}
                <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-black/5 dark:border-white/5">
                  {(entryType === 'expense'
                    ? ['Food & groceries', 'Food & drinks', 'Shopping', 'Transport', 'Bills', 'Health', 'Personal']
                    : entryType === 'income'
                    ? ['Salary', 'Freelance', 'Allowance', 'Business', 'Gift']
                    : ['Savings', 'Emergency Fund', 'Piggy Bank', 'Investment', 'Vacation']
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setMoneyCategory(cat)}
                      className={`text-[11px] font-medium py-1 px-2.5 rounded-lg transition-all ${
                        moneyCategory === cat
                          ? 'bg-[#274E3C] text-white font-semibold'
                          : isDark
                          ? 'bg-[#1A251F] text-[#8AA093] hover:text-white'
                          : 'bg-[#F2F5F0] text-[#5A6D60] hover:bg-[#E5ECE3]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Native Date Picker + Quick Date Chips */}
              <div className={`rounded-2xl p-3.5 border space-y-2.5 ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                    <Calendar className="w-4 h-4 text-[#7A877E] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className={`text-[10px] block ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>Date</span>
                      <input
                        type="date"
                        value={moneyDate}
                        onChange={(e) => setMoneyDate(e.target.value)}
                        className="text-[14px] font-semibold outline-none bg-transparent w-full cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(
                      [
                        { label: 'Today', value: todayLocalStr },
                        { label: 'Yesterday', value: addDaysToDateString(todayLocalStr, -1) },
                      ] as const
                    ).map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => setMoneyDate(chip.value)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                          moneyDate === chip.value
                            ? 'bg-[#274E3C] border-[#274E3C] text-white'
                            : isDark
                            ? 'bg-[#151D18] border-[#2B3B31] text-[#8EA397] hover:text-white'
                            : 'bg-[#F5F7F4] border-[#E2E6E0] text-[#5D6E62]'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
                <span className={`text-[10px] block ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>Note (optional)</span>
                <input
                  type="text"
                  placeholder="Additional context..."
                  value={moneyNote}
                  onChange={(e) => setMoneyNote(e.target.value)}
                  className="w-full text-[13px] outline-none bg-transparent mt-0.5"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {activeModal === 'edit-money' && editingTransaction && (
                <button
                  type="button"
                  onClick={() => {
                    deleteTransaction(editingTransaction.id);
                    closeModal();
                  }}
                  className="py-4 px-4 rounded-[24px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-semibold text-[14px] flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-4 rounded-[24px] bg-[#274E3C] hover:bg-[#1E3F30] text-white text-[15px] font-semibold tracking-wide shadow-soft transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4 stroke-[2.2]" />
                <span>
                  {activeModal === 'edit-money'
                    ? 'Save changes'
                    : entryType === 'savings'
                    ? 'Save to vault'
                    : 'Save entry'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Modal: How to Install App Guide */}
        {activeModal === 'install-guide' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[11px] font-semibold tracking-widest uppercase ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
                  1-Tap Full Screen Access
                </p>
                <h2 className={`text-[26px] font-bold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                  Install App
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className={`w-9 h-9 rounded-full border flex items-center justify-center ${
                  isDark ? 'bg-[#202C25] border-[#2F3F36] text-[#8EA397]' : 'bg-white border-[#E3E8E1] text-[#69796D]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className={`text-[13px] leading-relaxed ${isDark ? 'text-[#A0B5A7]' : 'text-[#586A5E]'}`}>
              Install Tyn as a native Progressive Web App (PWA) to run in full screen without browser bars.
            </p>

            {/* iOS Instructions */}
            <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-[#1C2620] border-[#293A2F]' : 'bg-white border-[#ECECE6]'}`}>
              <div className="flex items-center space-x-2">
                <span className="text-[14px]">🍎</span>
                <h4 className="text-[14px] font-bold">On iPhone / iPad (Safari)</h4>
              </div>
              <ol className={`text-[12px] space-y-1.5 list-decimal pl-4 leading-relaxed ${isDark ? 'text-[#CAD7CE]' : 'text-[#485B4E]'}`}>
                <li>Tap the <strong>Share</strong> button at the bottom (the square with an arrow pointing up).</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong> (➕).</li>
                <li>Tap <strong>Add</strong> in the top right. An app icon will appear on your home screen!</li>
              </ol>
            </div>

            {/* Android Instructions */}
            <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-[#1C2620] border-[#293A2F]' : 'bg-white border-[#ECECE6]'}`}>
              <div className="flex items-center space-x-2">
                <span className="text-[14px]">🤖</span>
                <h4 className="text-[14px] font-bold">On Android (Chrome / Samsung)</h4>
              </div>
              <ol className={`text-[12px] space-y-1.5 list-decimal pl-4 leading-relaxed ${isDark ? 'text-[#CAD7CE]' : 'text-[#485B4E]'}`}>
                <li>Tap the <strong>three dots (⋮)</strong> menu in the top-right corner.</li>
                <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                <li>Confirm by tapping <strong>Install</strong>.</li>
              </ol>
            </div>

            <button
              type="button"
              onClick={closeModal}
              className="w-full py-3.5 rounded-2xl bg-[#274E3C] text-white text-[14px] font-semibold tracking-wide shadow-sm"
            >
              Got it, thanks!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
