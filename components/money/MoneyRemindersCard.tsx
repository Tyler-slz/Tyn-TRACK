'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatDateHumanLabel } from '@/lib/time';
import { MoneyReminder, MoneyReminderKind } from '@/lib/types';
import {
  Bell,
  BellOff,
  Check,
  Plus,
  Receipt,
  RotateCcw,
  Trash2,
  UserCheck,
  UserMinus,
} from 'lucide-react';

const KIND_META: Record<
  MoneyReminderKind,
  { label: string; lightClass: string; darkClass: string }
> = {
  bill: {
    label: 'Bill',
    lightClass: 'bg-amber-100 text-amber-800 border-amber-200',
    darkClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  owe: {
    label: 'I Owe',
    lightClass: 'bg-rose-100 text-rose-800 border-rose-200',
    darkClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  owed: {
    label: 'Owed to Me',
    lightClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    darkClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
};

function formatAmount(symbol: string, amount: number): string {
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function MoneyRemindersCard() {
  const {
    state,
    todayLocalStr,
    theme,
    openModal,
    openMoneyReminderEditModal,
    settleMoneyReminder,
    reopenMoneyReminder,
    deleteMoneyReminder,
  } = useApp();

  const isDark = theme === 'dark';
  const symbol = state.financialSummary.currencySymbol || '₱';
  const reminders = state.moneyReminders || [];

  const [tab, setTab] = useState<'pending' | 'settled'>('pending');
  const [kindFilter, setKindFilter] = useState<'all' | 'to-pay' | 'owed'>('all');
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const pendingItems = reminders
    .filter((r) => !r.settled)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const settledItems = reminders
    .filter((r) => r.settled)
    .sort((a, b) => (b.settledAt || b.dueDate).localeCompare(a.settledAt || a.dueDate));

  const toPayItems = pendingItems.filter((r) => r.kind === 'bill' || r.kind === 'owe');
  const owedToMeItems = pendingItems.filter((r) => r.kind === 'owed');

  const totalToPay = toPayItems.reduce((sum, r) => sum + r.amount, 0);
  const totalOwedToMe = owedToMeItems.reduce((sum, r) => sum + r.amount, 0);

  const tabItems: MoneyReminder[] = tab === 'pending' ? pendingItems : settledItems;
  const activeList: MoneyReminder[] = tabItems.filter((item) => {
    if (kindFilter === 'to-pay') return item.kind === 'bill' || item.kind === 'owe';
    if (kindFilter === 'owed') return item.kind === 'owed';
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Header Row */}
      <div className="flex items-center justify-between px-0.5">
        <div>
          <h3 className={`text-[17px] font-semibold tracking-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
            Bills &amp; IOUs
          </h3>
          <p className={`text-[11px] ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
            Reminders to pay or collect
          </p>
        </div>

        <button
          type="button"
          onClick={() => openModal('add-money-reminder')}
          className="text-[12px] font-semibold text-white bg-[#274E3C] hover:bg-[#1E3E30] py-1.5 px-3 rounded-full shadow-sm flex items-center space-x-1 active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Reminder</span>
        </button>
      </div>

      {/* Main Card */}
      <div
        className={`rounded-[26px] p-4 border shadow-soft-sm space-y-4 ${
          isDark ? 'bg-[#18211D] border-[#243028]' : 'bg-white border-[#ECECE6]'
        }`}
      >
        {/* Summary Strip (Tap to filter) */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setKindFilter((prev) => (prev === 'to-pay' ? 'all' : 'to-pay'))}
            className={`text-left p-3 rounded-2xl border transition-all active:scale-[0.98] ${
              isDark ? 'bg-[#221A1B] border-[#39282A]' : 'bg-[#FDF5F4] border-[#F6E0DD]'
            } ${kindFilter === 'to-pay' ? 'ring-2 ring-[#274E3C] dark:ring-[#7CC79E]' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
                To Pay
              </span>
              <UserMinus className={`w-3.5 h-3.5 ${isDark ? 'text-rose-300' : 'text-rose-600'}`} />
            </div>
            <p className={`text-[16px] font-bold mt-1 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
              {formatAmount(symbol, totalToPay)}
            </p>
            <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-[#8AA093]' : 'text-[#7A877E]'}`}>
              {toPayItems.length} bill{toPayItems.length === 1 ? '' : 's'} &amp; IOU{toPayItems.length === 1 ? '' : 's'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setKindFilter((prev) => (prev === 'owed' ? 'all' : 'owed'))}
            className={`text-left p-3 rounded-2xl border transition-all active:scale-[0.98] ${
              isDark ? 'bg-[#17251E] border-[#263B2F]' : 'bg-[#EFF6F0] border-[#DCEAD9]'
            } ${kindFilter === 'owed' ? 'ring-2 ring-[#274E3C] dark:ring-[#7CC79E]' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
                Owed to Me
              </span>
              <UserCheck className={`w-3.5 h-3.5 ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`} />
            </div>
            <p className={`text-[16px] font-bold mt-1 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
              {formatAmount(symbol, totalOwedToMe)}
            </p>
            <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-[#8AA093]' : 'text-[#7A877E]'}`}>
              {owedToMeItems.length} pending to collect
            </span>
          </button>
        </div>

        {/* Pending / Settled Switcher */}
        <div
          className={`grid grid-cols-2 gap-1 p-1 rounded-2xl ${
            isDark ? 'bg-[#121916]' : 'bg-[#F3F2EE]'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setTab('pending');
              setSettlingId(null);
            }}
            className={`py-1.5 rounded-xl text-[12px] font-semibold transition-all ${
              tab === 'pending'
                ? 'bg-[#274E3C] text-white shadow-sm'
                : isDark
                ? 'text-[#8EA397] hover:text-white'
                : 'text-[#6A786E] hover:text-[#1E2621]'
            }`}
          >
            Pending ({pendingItems.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('settled');
              setSettlingId(null);
            }}
            className={`py-1.5 rounded-xl text-[12px] font-semibold transition-all ${
              tab === 'settled'
                ? 'bg-[#274E3C] text-white shadow-sm'
                : isDark
                ? 'text-[#8EA397] hover:text-white'
                : 'text-[#6A786E] hover:text-[#1E2621]'
            }`}
          >
            Settled ({settledItems.length})
          </button>
        </div>

        {/* Reminders List */}
        {activeList.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <div className={`w-10 h-10 mx-auto rounded-2xl flex items-center justify-center ${isDark ? 'bg-[#222E27] text-[#7CC79E]' : 'bg-[#F0F5EE] text-[#274E3C]'}`}>
              <Receipt className="w-5 h-5 stroke-[1.8]" />
            </div>
            <p className={`text-[13px] ${isDark ? 'text-[#879B90]' : 'text-[#7A877E]'}`}>
              {kindFilter !== 'all'
                ? `No ${kindFilter === 'to-pay' ? 'To Pay' : 'Owed to Me'} items under ${tab}.`
                : tab === 'pending'
                ? 'No upcoming bills or borrowed money reminders.'
                : 'No settled reminders yet.'}
            </p>
            {kindFilter !== 'all' ? (
              <button
                type="button"
                onClick={() => setKindFilter('all')}
                className={`text-[12px] font-semibold py-1.5 px-3.5 rounded-full transition-colors ${
                  isDark ? 'bg-[#223028] text-[#7CC79E]' : 'bg-[#EAF0E8] text-[#274E3C]'
                }`}
              >
                Show all items
              </button>
            ) : (
              tab === 'pending' && (
                <button
                  type="button"
                  onClick={() => openModal('add-money-reminder')}
                  className={`text-[12px] font-semibold py-1.5 px-3.5 rounded-full transition-colors ${
                    isDark ? 'bg-[#223028] text-[#7CC79E]' : 'bg-[#EAF0E8] text-[#274E3C]'
                  }`}
                >
                  + Add Bill or IOU
                </button>
              )
            )}
          </div>
        ) : (
          <div className={`divide-y ${isDark ? 'divide-[#222E26]' : 'divide-[#F2F1ED]'}`}>
            {activeList.map((item) => {
              const kindStyle = KIND_META[item.kind];
              const isOverdue = !item.settled && item.dueDate < todayLocalStr;
              const isDueToday = !item.settled && item.dueDate === todayLocalStr;
              const isSettling = settlingId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => openMoneyReminderEditModal(item)}
                  className="py-3 first:pt-1 last:pb-1 space-y-2.5 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isDark ? kindStyle.darkClass : kindStyle.lightClass
                          }`}
                        >
                          {kindStyle.label}
                          {item.person ? ` · ${item.person}` : ''}
                        </span>

                        {isOverdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500">
                            Overdue
                          </span>
                        )}
                        {isDueToday && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            Due Today
                          </span>
                        )}
                        {item.settled && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#274E3C]/15 text-[#274E3C] dark:text-[#7CC79E]">
                            Settled {item.settledAt ? `· ${formatDateHumanLabel(item.settledAt, todayLocalStr)}` : ''}
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-[14px] font-semibold truncate ${
                          item.settled
                            ? 'line-through opacity-60'
                            : isDark
                            ? 'text-[#EDEFEA]'
                            : 'text-[#1E2621]'
                        }`}
                      >
                        {item.title}
                      </p>

                      <div className={`flex items-center space-x-2 text-[11px] ${isDark ? 'text-[#889B90]' : 'text-[#86948A]'}`}>
                        <span>
                          Due {formatDateHumanLabel(item.dueDate, todayLocalStr)}
                          {item.dueTime ? ` · ${item.dueTime}` : ''}
                        </span>
                        {!item.settled && (
                          <span className="inline-flex items-center">
                            {item.remindMe ? (
                              <Bell className="w-3 h-3 text-[#274E3C] dark:text-[#7CC79E]" />
                            ) : (
                              <BellOff className="w-3 h-3 opacity-50" />
                            )}
                          </span>
                        )}
                      </div>

                      {item.note && (
                        <p className={`text-[11px] italic ${isDark ? 'text-[#778B7E]' : 'text-[#86948A]'}`}>
                          {item.note}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end space-y-1.5 shrink-0">
                      <span
                        className={`text-[15px] font-bold ${
                          item.kind === 'owed'
                            ? 'text-[#2E7A4A] dark:text-[#7CC79E]'
                            : isDark
                            ? 'text-[#EDEFEA]'
                            : 'text-[#1E2621]'
                        }`}
                      >
                        {item.kind === 'owed' ? '+' : ''}
                        {formatAmount(symbol, item.amount)}
                      </span>

                      <div className="flex items-center space-x-1">
                        {!item.settled ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSettlingId(isSettling ? null : item.id);
                            }}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all active:scale-95 flex items-center space-x-1 ${
                              isSettling
                                ? 'bg-[#274E3C] text-white'
                                : isDark
                                ? 'bg-[#223028] text-[#7CC79E] hover:bg-[#2A3B31]'
                                : 'bg-[#EAF0E8] text-[#274E3C] hover:bg-[#DDE7DA]'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>Settle</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              reopenMoneyReminder(item.id);
                            }}
                            title="Reopen reminder"
                            className={`text-[11px] font-semibold px-2 py-1 rounded-full flex items-center space-x-1 ${
                              isDark ? 'bg-[#222E27] text-[#8EA397]' : 'bg-[#F2F1ED] text-[#647769]'
                            }`}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reopen</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMoneyReminder(item.id);
                          }}
                          aria-label="Delete reminder"
                          className="text-red-400 hover:text-red-600 p-1 opacity-60 hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline 1-Tap Settle Action Bar */}
                  {isSettling && !item.settled && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`p-3 rounded-2xl border space-y-2 animate-fade-in ${
                        isDark ? 'bg-[#121916] border-[#26382E]' : 'bg-[#F4F7F3] border-[#DCE6DA]'
                      }`}
                    >
                      <p className={`text-[11px] font-medium ${isDark ? 'text-[#B5C6BC]' : 'text-[#485C4E]'}`}>
                        {item.kind === 'owed'
                          ? `Add ${formatAmount(symbol, item.amount)} repayment to your Balance?`
                          : `Deduct ${formatAmount(symbol, item.amount)} payment from your Balance?`}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            settleMoneyReminder(item.id, true);
                            setSettlingId(null);
                          }}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-[#274E3C] hover:bg-[#1E3E30] text-white text-[11px] font-semibold shadow-sm active:scale-95 transition-all"
                        >
                          Log &amp; Settle
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            settleMoneyReminder(item.id, false);
                            setSettlingId(null);
                          }}
                          className={`flex-1 py-1.5 px-2.5 rounded-xl border text-[11px] font-semibold active:scale-95 transition-all ${
                            isDark
                              ? 'bg-[#1D2822] border-[#2D3E34] text-[#CAD8CF]'
                              : 'bg-white border-[#DDE4DC] text-[#45594B]'
                          }`}
                        >
                          Checklist Only
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSettlingId(null);
                          }}
                          className={`py-1.5 px-2.5 rounded-xl text-[11px] font-medium ${
                            isDark ? 'text-[#8EA397]' : 'text-[#7A877E]'
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

