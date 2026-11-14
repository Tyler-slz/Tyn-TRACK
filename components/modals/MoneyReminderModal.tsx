'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  addDaysToDateString,
  formatTime24To12,
  timeStringTo24hInput,
} from '@/lib/time';
import { MoneyReminderKind } from '@/lib/types';
import { Bell, Calendar, Clock, Trash2, User, X } from 'lucide-react';

export function MoneyReminderModal() {
  const {
    state,
    activeModal,
    closeModal,
    addMoneyReminder,
    updateMoneyReminder,
    deleteMoneyReminder,
    editingMoneyReminder,
    enableNotifications,
    todayLocalStr,
    theme,
  } = useApp();

  const isDark = theme === 'dark';
  const symbol = state.financialSummary.currencySymbol || '₱';
  const isEditing = activeModal === 'edit-money-reminder' && Boolean(editingMoneyReminder);

  const [kind, setKind] = useState<MoneyReminderKind>('bill');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [person, setPerson] = useState('');
  const [dueDate, setDueDate] = useState(todayLocalStr);
  const [dueTime, setDueTime] = useState('09:00');
  const [remindMe, setRemindMe] = useState(true);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (activeModal === 'edit-money-reminder' && editingMoneyReminder) {
      setKind(editingMoneyReminder.kind);
      setAmount(String(editingMoneyReminder.amount));
      setTitle(editingMoneyReminder.title || '');
      setPerson(editingMoneyReminder.person || '');
      setDueDate(editingMoneyReminder.dueDate || todayLocalStr);
      setDueTime(timeStringTo24hInput(editingMoneyReminder.dueTime || '09:00'));
      setRemindMe(editingMoneyReminder.remindMe !== false);
      setNote(editingMoneyReminder.note || '');
    } else if (activeModal === 'add-money-reminder') {
      setKind('bill');
      setAmount('');
      setTitle('');
      setPerson('');
      setDueDate(todayLocalStr);
      setDueTime('09:00');
      setRemindMe(true);
      setNote('');
    }
  }, [activeModal, editingMoneyReminder, todayLocalStr]);

  const handleToggleRemind = async () => {
    const next = !remindMe;
    setRemindMe(next);
    if (next) {
      await enableNotifications();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0 || !title.trim()) return;
    if ((kind === 'owe' || kind === 'owed') && !person.trim()) return;

    if (remindMe) {
      await enableNotifications();
    }

    const payload = {
      kind,
      title: title.trim(),
      person: kind === 'bill' ? undefined : person.trim(),
      amount: parsedAmount,
      dueDate: dueDate || todayLocalStr,
      dueTime: formatTime24To12(dueTime, '9:00 AM'),
      remindMe,
      note: note.trim() || undefined,
    };

    if (activeModal === 'edit-money-reminder' && editingMoneyReminder) {
      updateMoneyReminder(editingMoneyReminder.id, payload);
    } else {
      addMoneyReminder(payload);
    }
    closeModal();
  };

  const handleDelete = () => {
    if (!editingMoneyReminder) return;
    deleteMoneyReminder(editingMoneyReminder.id);
    closeModal();
  };

  const titlePlaceholder =
    kind === 'bill'
      ? 'e.g. Wi-Fi, Electricity, Rent, Spotify'
      : kind === 'owe'
      ? 'e.g. Dinner split, Concert ticket'
      : 'e.g. Lunch treat, Shared Grab ride';

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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-[11px] font-semibold tracking-widest uppercase ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
                Bills &amp; IOUs
              </p>
              <h2 className={`text-[24px] font-bold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                {isEditing ? 'Edit Money Reminder' : 'New Money Reminder'}
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

          {/* Kind Selector */}
          <div className={`grid grid-cols-3 gap-1.5 p-1 rounded-2xl ${isDark ? 'bg-[#1D2721]' : 'bg-[#EFEDE8]'}`}>
            {(
              [
                { id: 'bill', label: 'Bill / Pay' },
                { id: 'owe', label: 'I Owe' },
                { id: 'owed', label: 'Owed to Me' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setKind(opt.id)}
                className={`py-2 rounded-xl text-[12px] font-semibold transition-all ${
                  kind === opt.id
                    ? 'bg-[#274E3C] text-white shadow-sm'
                    : isDark
                    ? 'text-[#8EA397] hover:text-white'
                    : 'text-[#6D7D72] hover:text-[#1E2621]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div
            className={`rounded-2xl p-4 border ${
              isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
            }`}
          >
            <label className={`text-[11px] font-medium block mb-1 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
              Amount ({symbol})
            </label>
            <div className="flex items-center space-x-2">
              <span className={`text-[22px] font-bold ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
                {symbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-[24px] font-bold outline-none bg-transparent"
              />
            </div>
          </div>

          {/* What is it for */}
          <div
            className={`rounded-2xl p-4 border ${
              isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
            }`}
          >
            <label className={`text-[11px] font-medium block mb-1 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
              What is it for?
            </label>
            <input
              type="text"
              required
              placeholder={titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-[15px] font-medium outline-none bg-transparent"
            />
          </div>

          {/* Person field for IOUs */}
          {kind !== 'bill' && (
            <div
              className={`rounded-2xl p-4 border ${
                isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
              }`}
            >
              <label className={`text-[11px] font-medium flex items-center space-x-1 mb-1 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
                <User className="w-3 h-3" />
                <span>{kind === 'owe' ? 'Who did you borrow from?' : 'Who owes you?'}</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Alex, Mom, Sam"
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                className="w-full text-[15px] font-medium outline-none bg-transparent"
              />
            </div>
          )}

          {/* Quick Due Date Chips */}
          <div className="flex items-center gap-1.5">
            {(
              [
                { label: 'Today', value: todayLocalStr },
                { label: 'Tomorrow', value: addDaysToDateString(todayLocalStr, 1) },
                { label: 'Next week', value: addDaysToDateString(todayLocalStr, 7) },
              ] as const
            ).map((chip) => {
              const active = dueDate === chip.value;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setDueDate(chip.value)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                    active
                      ? 'bg-[#274E3C] border-[#274E3C] text-white shadow-sm'
                      : isDark
                      ? 'bg-[#1D2721] border-[#2A3930] text-[#8EA397] hover:text-white'
                      : 'bg-white border-[#E4E7E1] text-[#607064] hover:border-[#274E3C]/40'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`rounded-2xl p-3.5 border ${
                isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
              }`}
            >
              <label className={`text-[11px] font-medium flex items-center space-x-1 mb-1 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
                <Calendar className="w-3 h-3" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-[13px] font-medium outline-none bg-transparent"
              />
            </div>

            <div
              className={`rounded-2xl p-3.5 border ${
                isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
              }`}
            >
              <label className={`text-[11px] font-medium flex items-center space-x-1 mb-1 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
                <Clock className="w-3 h-3" />
                <span>Reminder Time</span>
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full text-[13px] font-medium outline-none bg-transparent"
              />
            </div>
          </div>

          {/* Remind Me Switch */}
          <div
            className={`rounded-2xl p-3.5 border flex items-center justify-between ${
              isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Bell className={`w-4 h-4 ${remindMe ? 'text-[#274E3C] dark:text-[#7CC79E]' : 'opacity-50'}`} />
              <div>
                <p className="text-[13px] font-semibold">Remind me on due date</p>
                <p className={`text-[11px] ${isDark ? 'text-[#8EA397]' : 'text-[#7A877E]'}`}>
                  Fires phone notification &amp; in-app alarm
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleRemind}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                remindMe ? 'bg-[#274E3C]' : 'bg-[#CBD6CC]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  remindMe ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Optional Note */}
          <div
            className={`rounded-2xl p-4 border ${
              isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
            }`}
          >
            <label className={`text-[11px] font-medium block mb-1 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
              Note (optional)
            </label>
            <input
              type="text"
              placeholder="Account ref, GCash number, or short note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-[14px] outline-none bg-transparent"
            />
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                className="py-3.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-semibold text-[14px] flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-3.5 rounded-2xl bg-[#274E3C] hover:bg-[#1E3E30] text-white font-semibold text-[15px] shadow-soft active:scale-95 transition-all"
            >
              {isEditing ? 'Save Changes' : 'Save Money Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

