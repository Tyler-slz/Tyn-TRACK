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
  PiggyBank
} from 'lucide-react';
import { Category } from '@/lib/types';
import { AlarmSoundType } from '@/lib/alarm';

export function ActionModals() {
  const {
    activeModal,
    closeModal,
    addTask,
    addEvent,
    addTransaction,
    state,
    updateUserName,
    updateCurrency,
    exportBackup,
    importBackup,
    clearAllData,
    testAlarm,
    alarmSound,
    setAlarmSound,
    alarmSoundEnabled,
    toggleAlarmSound,
    alarmVibrationEnabled,
    toggleAlarmVibration,
    theme,
    toggleTheme,
    todayLocalStr,
    prefilledTime,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  // Settings state
  const [tempName, setTempName] = useState(state.userName);
  const [tempSymbol, setTempSymbol] = useState(state.financialSummary.currencySymbol);
  const [tempCode, setTempCode] = useState(state.financialSummary.currencyCode);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDetails, setTaskDetails] = useState('');
  const [taskCategory, setTaskCategory] = useState<Category>('Work');
  const [taskDueDate, setTaskDueDate] = useState(todayLocalStr);
  const [taskDueTime, setTaskDueTime] = useState('11:00');
  const [taskRemindMe, setTaskRemindMe] = useState(true);

  // Event form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDate, setEventDate] = useState(todayLocalStr);
  const [eventStartTime, setEventStartTime] = useState(prefilledTime || '12:00');
  const [eventEndTime, setEventEndTime] = useState('13:00');
  const [eventRemindMe, setEventRemindMe] = useState(true);
  const [eventNotes, setEventNotes] = useState('');

  // Money form state
  const [entryType, setEntryType] = useState<'expense' | 'income' | 'savings'>('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [moneyCategory, setMoneyCategory] = useState('Food & groceries');
  const [moneyDate, setMoneyDate] = useState(todayLocalStr);
  const [moneyNote, setMoneyNote] = useState('');

  useEffect(() => {
    if (activeModal === 'add-event' && prefilledTime) {
      setEventStartTime(prefilledTime);
      const [hStr, mStr] = prefilledTime.split(':');
      const nextH = (parseInt(hStr, 10) + 1) % 24;
      const nextHStr = nextH < 10 ? `0${nextH}` : `${nextH}`;
      setEventEndTime(`${nextHStr}:${mStr || '00'}`);
      setEventDate(todayLocalStr);
    }
    if (activeModal === 'add-todo') {
      setTaskDueDate(todayLocalStr);
    }
    if (activeModal === 'add-money' || activeModal === 'add-savings') {
      setMoneyDate(todayLocalStr);
      setAmount('');
      if (activeModal === 'add-savings') {
        setEntryType('savings');
        setMerchant('Piggy Bank');
        setMoneyCategory('Savings');
      } else {
        setMerchant('');
        setMoneyCategory(entryType === 'income' ? 'Salary' : 'Food & groceries');
      }
    }
  }, [activeModal, prefilledTime, todayLocalStr]);

  if (!activeModal) return null;

  // Format 24h time to 12h display
  const formatTimeDisplay = (time24: string) => {
    if (!time24) return '12:00 PM';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    addTask({
      title: taskTitle.trim(),
      details: taskDetails.trim(),
      category: taskCategory,
      dueDate: taskDueDate,
      dueTime: formatTimeDisplay(taskDueTime),
      completed: false,
      remindMe: taskRemindMe,
    });
    setTaskTitle('');
    setTaskDetails('');
    closeModal();
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    addEvent({
      title: eventTitle.trim(),
      location: eventLocation.trim(),
      date: eventDate,
      startTime: formatTimeDisplay(eventStartTime),
      endTime: formatTimeDisplay(eventEndTime),
      notes: eventNotes.trim(),
      type: 'routine',
      remindMe: eventRemindMe,
    });
    setEventTitle('');
    setEventLocation('');
    setEventNotes('');
    closeModal();
  };

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount) || 0;
    if (!merchant.trim() || parsedAmount <= 0) return;
    addTransaction({
      type: entryType,
      merchant: merchant.trim(),
      category: moneyCategory.trim() || (entryType === 'income' ? 'Income' : entryType === 'savings' ? 'Savings' : 'General'),
      amount: parsedAmount,
      date: moneyDate,
      note: moneyNote.trim(),
    });
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-[36px] sm:rounded-[36px] p-6 shadow-2xl border transition-all ${
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
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-semibold flex items-center space-x-1.5">
                  <Music className="w-3.5 h-3.5 text-[#274E3C]" />
                  <span>Reminder Alarms & Feedback</span>
                </label>
                <button
                  type="button"
                  onClick={() => testAlarm()}
                  className="text-[11px] font-semibold text-[#274E3C] hover:underline flex items-center space-x-1"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Test Alarm</span>
                </button>
              </div>

              {/* Alarm Chime Sound Toggle */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                  isDark ? 'bg-[#161F1A] border-[#26372D]' : 'bg-[#FAFBF9] border-[#EDF1EB]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Volume2 className={`w-4 h-4 ${alarmSoundEnabled ? 'text-[#274E3C]' : 'text-gray-400'}`} />
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
                  <Smartphone className={`w-4 h-4 ${alarmVibrationEnabled ? 'text-[#274E3C]' : 'text-gray-400'}`} />
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
                          testAlarm(s.id as AlarmSoundType);
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

        {/* Modal: Add To-Do */}
        {activeModal === 'add-todo' && (
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[11px] font-semibold tracking-widest uppercase ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
                  One thing at a time
                </p>
                <h2 className={`text-[28px] font-bold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                  Add to-do
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

            <div className="space-y-2 pt-1">
              <label className="text-[14px] font-semibold">What's on your list?</label>

              <div className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
                <span className={`text-[11px] block mb-0.5 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>Task title</span>
                <input
                  type="text"
                  placeholder="e.g. Call dentist or buy supplies"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  className="w-full text-[15px] font-medium outline-none bg-transparent"
                />
              </div>

              <div className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
                <span className={`text-[11px] block mb-0.5 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>Details (optional)</span>
                <textarea
                  rows={2}
                  placeholder="Add notes or subtasks..."
                  value={taskDetails}
                  onChange={(e) => setTaskDetails(e.target.value)}
                  className="w-full text-[13px] outline-none resize-none leading-relaxed bg-transparent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-semibold">Category</label>
              <div className="flex space-x-2">
                {(['Work', 'Personal', 'Money'] as Category[]).map((cat) => {
                  const isSelected = taskCategory === cat;
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setTaskCategory(cat)}
                      className={`flex-1 py-2.5 rounded-2xl text-[13px] font-medium flex items-center justify-center space-x-1.5 transition-all ${
                        isSelected
                          ? 'bg-[#274E3C] text-white font-semibold shadow-sm'
                          : isDark
                          ? 'bg-[#1B2520] text-[#8AA093] border border-[#2A3930]'
                          : 'bg-white text-[#6F7E73] border border-[#ECECE6]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date & Time Pickers */}
            <div className="space-y-2">
              <label className="text-[13px] font-semibold">Choose Date & Time</label>

              <div className={`rounded-2xl p-3.5 border flex items-center justify-between ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
                <div className="flex items-center space-x-3 flex-1">
                  <Calendar className="w-4 h-4 text-[#7A877E]" />
                  <div className="flex-1">
                    <span className={`text-[10px] block ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>Due date</span>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="text-[14px] font-semibold outline-none bg-transparent w-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl p-3.5 border flex items-center justify-between ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
                <div className="flex items-center space-x-3 flex-1">
                  <Clock className="w-4 h-4 text-[#7A877E]" />
                  <div className="flex-1">
                    <span className={`text-[10px] block ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>Due time</span>
                    <input
                      type="time"
                      value={taskDueTime}
                      onChange={(e) => setTaskDueTime(e.target.value)}
                      className="text-[14px] font-semibold outline-none bg-transparent w-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Remind me toggle */}
            <div className={`rounded-2xl p-4 space-y-1.5 border ${isDark ? 'bg-[#1A2620] border-[#26372D]' : 'bg-[#EAF0E8] border-[#DEE8DD]'}`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center space-x-2 text-[14px] font-semibold ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
                  <Clock className="w-4 h-4" />
                  <span>Remind me with alarm chime</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTaskRemindMe(!taskRemindMe)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                    taskRemindMe ? 'bg-[#274E3C]' : 'bg-[#CBD6CC]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      taskRemindMe ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-[#8EA597]' : 'text-[#69796D]'}`}>
                Alarm rings at {formatTimeDisplay(taskDueTime)}.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-[24px] bg-[#274E3C] hover:bg-[#1E3F30] text-white text-[15px] font-semibold tracking-wide shadow-soft transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4 stroke-[2.2]" />
              <span>Save to-do</span>
            </button>
          </form>
        )}

        {/* Modal: Add Schedule Event */}
        {activeModal === 'add-event' && (
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[11px] font-semibold tracking-widest uppercase ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
                  A little space for everything
                </p>
                <h2 className={`text-[28px] font-bold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                  Add event
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

            <div className="space-y-2 pt-1">
              <label className="text-[14px] font-semibold">What's the plan?</label>

              <div className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
                <span className={`text-[11px] block mb-0.5 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>Event title</span>
                <input
                  type="text"
                  placeholder="e.g. Lunch with Maya or Team meeting"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  required
                  className="w-full text-[15px] font-medium outline-none bg-transparent"
                />
              </div>

              <div className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
                <span className={`text-[11px] block mb-0.5 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>Location / Note</span>
                <input
                  type="text"
                  placeholder="e.g. Olive & Rye / Zoom"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full text-[14px] outline-none bg-transparent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-semibold">Event Timing</label>

              <div className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
                <span className={`text-[10px] block mb-1 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>Date</span>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full text-[14px] font-semibold outline-none bg-transparent cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
                  <span className={`text-[10px] block mb-1 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>Starts</span>
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="w-full text-[14px] font-semibold outline-none bg-transparent cursor-pointer"
                  />
                </div>

                <div className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
                  <span className={`text-[10px] block mb-1 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>Ends</span>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="w-full text-[14px] font-semibold outline-none bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className={`rounded-2xl p-4 space-y-1.5 border ${isDark ? 'bg-[#1A2620] border-[#26372D]' : 'bg-[#EAF0E8] border-[#DEE8DD]'}`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center space-x-2 text-[14px] font-semibold ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
                  <Clock className="w-4 h-4" />
                  <span>Remind me</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEventRemindMe(!eventRemindMe)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                    eventRemindMe ? 'bg-[#274E3C]' : 'bg-[#CBD6CC]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      eventRemindMe ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-[#8EA597]' : 'text-[#69796D]'}`}>
                Alarm will ring at event start time ({formatTimeDisplay(eventStartTime)}).
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-[24px] bg-[#274E3C] hover:bg-[#1E3F30] text-white text-[15px] font-semibold tracking-wide shadow-soft transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4 stroke-[2.2]" />
              <span>Save event</span>
            </button>
          </form>
        )}

        {/* Modal: Add Money Entry */}
        {(activeModal === 'add-money' || activeModal === 'add-savings') && (
          <form onSubmit={handleCreateTransaction} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[11px] font-semibold tracking-widest uppercase ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
                  Less guesswork, more clarity
                </p>
                <h2 className={`text-[28px] font-bold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                  {entryType === 'savings' ? 'Add savings' : 'Add money entry'}
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
                <button
                  type="button"
                  onClick={() => {
                    setEntryType('expense');
                    setMerchant('');
                    setMoneyCategory('Food & groceries');
                  }}
                  className={`flex-1 py-2 rounded-full text-[13px] font-semibold transition-all ${
                    entryType === 'expense'
                      ? 'bg-[#274E3C] text-white shadow-sm'
                      : isDark ? 'text-[#8EA397]' : 'text-[#6F7E73]'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntryType('income');
                    setMerchant('');
                    setMoneyCategory('Salary');
                  }}
                  className={`flex-1 py-2 rounded-full text-[13px] font-semibold transition-all ${
                    entryType === 'income'
                      ? 'bg-[#274E3C] text-white shadow-sm'
                      : isDark ? 'text-[#8EA397]' : 'text-[#6F7E73]'
                  }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntryType('savings');
                    setMerchant('Piggy Bank');
                    setMoneyCategory('Savings');
                  }}
                  className={`flex-1 py-2 rounded-full text-[13px] font-semibold transition-all ${
                    entryType === 'savings'
                      ? 'bg-[#274E3C] text-white shadow-sm'
                      : isDark ? 'text-[#8EA397]' : 'text-[#6F7E73]'
                  }`}
                >
                  Savings
                </button>
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
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-transparent text-[34px] font-bold outline-none max-w-[200px] pl-1 placeholder:text-[#9FB1A5] dark:placeholder:text-[#455A4C]"
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

              {/* Native Date Picker */}
              <div className={`rounded-2xl p-3.5 border flex items-center justify-between ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
                <div className="flex items-center space-x-2.5 flex-1">
                  <Calendar className="w-4 h-4 text-[#7A877E]" />
                  <div className="flex-1">
                    <span className={`text-[10px] block ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>Date</span>
                    <input
                      type="date"
                      value={moneyDate}
                      onChange={(e) => setMoneyDate(e.target.value)}
                      className="text-[14px] font-semibold outline-none bg-transparent w-full cursor-pointer"
                    />
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

            <button
              type="submit"
              className="w-full py-4 rounded-[24px] bg-[#274E3C] hover:bg-[#1E3F30] text-white text-[15px] font-semibold tracking-wide shadow-soft transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4 stroke-[2.2]" />
              <span>{entryType === 'savings' ? 'Save to vault' : 'Save entry'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
