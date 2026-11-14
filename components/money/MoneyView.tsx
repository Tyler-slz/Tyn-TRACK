'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatDateHumanLabel } from '@/lib/time';
import { MoneyRemindersCard } from './MoneyRemindersCard';
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  Coffee,
  Banknote,
  CreditCard,
  Wallet,
  Trash2,
  PiggyBank,
  Sparkles,
  SlidersHorizontal,
  X,
  AlertTriangle,
  Check,
  ShieldCheck,
  Target,
  Search,
  Car,
  Heart,
  Receipt,
} from 'lucide-react';

function formatMoneyAmount(symbol: string, amount: number): string {
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function MoneyView() {
  const {
    state,
    openModal,
    openTransactionEditModal,
    currentMonthYear,
    todayLocalStr,
    deleteTransaction,
    clearMoneyData,
    updateMonthlyBudget,
    theme,
  } = useApp();
  const { financialSummary, transactions } = state;
  const monthlyBudget = state.monthlyBudget || 0;
  const isDark = theme === 'dark';

  const [showMoneySettings, setShowMoneySettings] = useState(false);
  const [confirmClearMoney, setConfirmClearMoney] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  const [budgetInput, setBudgetInput] = useState(monthlyBudget > 0 ? String(monthlyBudget) : '');
  const [budgetSaved, setBudgetSaved] = useState(false);

  const [txFilter, setTxFilter] = useState<'all' | 'expense' | 'income' | 'savings'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showTxSearch, setShowTxSearch] = useState(false);
  const [txSearchQuery, setTxSearchQuery] = useState('');

  const openMoneySettingsModal = () => {
    setConfirmClearMoney(false);
    setBudgetSaved(false);
    setBudgetInput(monthlyBudget > 0 ? String(monthlyBudget) : '');
    setShowMoneySettings(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(budgetInput);
    updateMonthlyBudget(Number.isNaN(parsed) ? 0 : parsed);
    setBudgetSaved(true);
    setTimeout(() => setBudgetSaved(false), 1800);
  };

  const handleClearMoney = () => {
    clearMoneyData();
    setClearSuccess(true);
    setTimeout(() => {
      setClearSuccess(false);
      setConfirmClearMoney(false);
      setShowMoneySettings(false);
    }, 1200);
  };

  const getActivityIcon = (category: string) => {
    const iconClass = `w-4 h-4 stroke-[1.8] ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`;
    const lower = (category || '').toLowerCase();
    if (lower.includes('saving') || lower.includes('vault') || lower.includes('piggy')) {
      return <PiggyBank className={iconClass} />;
    }
    if (lower.includes('transport') || lower.includes('commute') || lower.includes('gas') || lower.includes('grab')) {
      return <Car className={iconClass} />;
    }
    if (lower.includes('health') || lower.includes('medical') || lower.includes('gym')) {
      return <Heart className={iconClass} />;
    }
    if (lower.includes('bill') || lower.includes('util') || lower.includes('debt') || lower.includes('repay')) {
      return <Receipt className={iconClass} />;
    }
    if (lower.includes('entertain') || lower.includes('movie') || lower.includes('game')) {
      return <Sparkles className={iconClass} />;
    }
    if (lower.includes('food') || lower.includes('grocer')) {
      return <ShoppingBag className={iconClass} />;
    }
    if (lower.includes('drink') || lower.includes('coffee')) {
      return <Coffee className={iconClass} />;
    }
    if (lower.includes('income') || lower.includes('salary') || lower.includes('bonus') || lower.includes('allowance')) {
      return <Banknote className={iconClass} />;
    }
    return <CreditCard className={iconClass} />;
  };

  const expenses = transactions.filter((t) => t.type === 'expense');
  const totalExpenseAmount = expenses.reduce((acc, t) => acc + t.amount, 0);

  // Dynamically group all expenses by category (including user-typed custom categories)
  const categoryMap: { [cat: string]: number } = {};
  expenses.forEach((tx) => {
    const cat = tx.category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + tx.amount;
  });

  const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
  const palette = isDark
    ? ['#7CC79E', '#52B788', '#4EA8DE', '#F4A261', '#E76F51', '#A8C7B5']
    : ['#274E3C', '#4B735E', '#7AA08A', '#C88A4B', '#C86D51', '#8F9E94'];

  const filteredTransactions = useMemo(() => {
    const q = txSearchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (txFilter !== 'all' && tx.type !== txFilter) return false;
      if (selectedCategory && (tx.category || 'Other') !== selectedCategory) return false;
      if (q) {
        const hay = `${tx.merchant} ${tx.category} ${tx.note || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, txFilter, selectedCategory, txSearchQuery]);

  return (
    <div className="flex flex-col space-y-5 pb-28 pt-2 px-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className={`text-[11px] font-semibold tracking-widest uppercase ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
            Less guesswork, more clarity
          </p>
          <h1 className={`text-[34px] font-bold tracking-tight leading-tight mt-0.5 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
            Your money
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          {/* Little settings button for Money */}
          <button
            onClick={openMoneySettingsModal}
            aria-label="Money settings"
            title="Money settings"
            className={`w-10 h-10 rounded-full border shadow-soft-sm flex items-center justify-center transition-all active:scale-95 ${
              isDark
                ? 'bg-[#1E2722] border-[#2A3730] text-[#8EA397] hover:bg-[#25332B]'
                : 'bg-white/80 border-[#E3E8E1] text-[#637367] hover:bg-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 stroke-[1.8]" />
          </button>

          {/* Add transaction button */}
          <button
            type="button"
            onClick={() => openModal('add-money')}
            aria-label="Add transaction"
            className="w-10 h-10 rounded-full bg-[#274E3C] hover:bg-[#1E3F30] text-white shadow-soft-sm flex items-center justify-center transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Month & Currency header */}
      <div className="flex items-center justify-between px-1">
        <span className={`text-[15px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
          {currentMonthYear}
        </span>
        <span className={`text-[12px] font-semibold tracking-wider ${isDark ? 'text-[#879B90]' : 'text-[#7A877E]'}`}>
          {financialSummary.currencyCode}
        </span>
      </div>

      {/* Main Balance Hero Card */}
      <div className="bg-[#264D3B] text-white rounded-[28px] p-5 shadow-soft relative overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-medium text-[#A7C2B2]">Total balance</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-[#DCE9E1]">
              Spent today: {formatMoneyAmount(financialSummary.currencySymbol, financialSummary.spentToday)}
            </span>
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/90 shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <p className="text-[34px] font-bold tracking-tight text-white mt-1.5">
          {formatMoneyAmount(financialSummary.currencySymbol, financialSummary.totalBalance)}
        </p>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/10">
          <div className="bg-[#2F5945] rounded-2xl p-2.5 flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-[#3D6953] flex items-center justify-center text-[#A7C2B2]">
              <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-[10px] text-[#A7C2B2] uppercase font-semibold">Income</p>
              <p className="text-[13px] font-semibold text-white">
                {formatMoneyAmount(financialSummary.currencySymbol, financialSummary.monthlyIncome)}
              </p>
            </div>
          </div>

          <div className="bg-[#2F5945] rounded-2xl p-2.5 flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-[#3D6953] flex items-center justify-center text-[#A7C2B2]">
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-[10px] text-[#A7C2B2] uppercase font-semibold">Expenses</p>
              <p className="text-[13px] font-semibold text-white">
                {formatMoneyAmount(financialSummary.currencySymbol, financialSummary.monthlyExpenses)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Log Strip */}
      <div className="grid grid-cols-4 gap-2">
        {(
          [
            { label: 'Expense', modal: 'add-money' },
            { label: 'Income', modal: 'add-income' },
            { label: 'Savings', modal: 'add-savings' },
            { label: 'Bill / IOU', modal: 'add-money-reminder' },
          ] as const
        ).map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => openModal(action.modal)}
            className={`py-2 px-1.5 rounded-2xl border text-[11px] font-semibold flex items-center justify-center gap-1 shadow-soft-sm transition-all active:scale-95 ${
              isDark
                ? 'bg-[#18211D] border-[#26352C] text-[#EDEFEA] hover:bg-[#1E2B24]'
                : 'bg-white border-[#ECECE6] text-[#1E2621] hover:bg-[#F3F6F1]'
            }`}
          >
            <Plus className="w-3 h-3 text-[#274E3C] dark:text-[#7CC79E] stroke-[2.5] shrink-0" />
            <span className="truncate">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Savings & Extra Money Card */}
      <div
        className={`rounded-[26px] p-5 border shadow-soft space-y-4 transition-all ${
          isDark
            ? 'bg-[#18231C] border-[#25362B]'
            : 'bg-[#EFF5EE] border-[#DEE8DD]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-[#223327] text-[#7CC79E]' : 'bg-[#DDE9DC] text-[#274E3C]'
              }`}
            >
              <PiggyBank className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 className={`text-[15px] font-semibold leading-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                Savings
              </h3>
              <p className={`text-[11px] ${isDark ? 'text-[#879B90]' : 'text-[#708074]'}`}>
                All your extra money automatically goes here
              </p>
            </div>
          </div>

          <button
            onClick={() => openModal('add-savings')}
            className="text-[12px] font-semibold text-white bg-[#274E3C] hover:bg-[#1E3E30] py-1.5 px-3 rounded-full shadow-sm flex items-center space-x-1 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Savings</span>
          </button>
        </div>

        {/* Total Savings Big Display */}
        <div>
          <span className={`text-[11px] font-medium block uppercase tracking-wider ${isDark ? 'text-[#8AA093]' : 'text-[#6C7E72]'}`}>
            Total Saved
          </span>
          <p className={`text-[32px] font-bold tracking-tight leading-none mt-1 ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
            {financialSummary.currencySymbol}
            {financialSummary.totalSavings.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        {/* Crystal Clear Breakdown of where Savings comes from */}
        <div className={`pt-3 border-t grid grid-cols-2 gap-2.5 text-[12px] ${isDark ? 'border-[#223327]' : 'border-[#D9E5D7]'}`}>
          <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#1D2B22] border-[#293B30]' : 'bg-white/80 border-[#E0EBE0]'}`}>
            <div className="flex items-center space-x-1 text-amber-500">
              <Sparkles className="w-3.5 h-3.5" />
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-[#8AA093]' : 'text-[#586A5E]'}`}>
                Extra from Income
              </span>
            </div>
            <p className={`text-[15px] font-bold mt-1 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
              +{financialSummary.currencySymbol}
              {financialSummary.monthlyExtra.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-[#778B7E]' : 'text-[#839486]'}`}>
              Income − Expenses
            </span>
          </div>

          <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#1D2B22] border-[#293B30]' : 'bg-white/80 border-[#E0EBE0]'}`}>
            <div className="flex items-center space-x-1 text-[#274E3C] dark:text-[#7CC79E]">
              <PiggyBank className="w-3.5 h-3.5" />
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-[#8AA093]' : 'text-[#586A5E]'}`}>
                Direct Savings
              </span>
            </div>
            <p className={`text-[15px] font-bold mt-1 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
              +{financialSummary.currencySymbol}
              {financialSummary.directSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-[#778B7E]' : 'text-[#839486]'}`}>
              Piggy bank deposits
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Budget Bar */}
      {monthlyBudget > 0 ? (
        (() => {
          const spent = financialSummary.monthlyExpenses;
          const pct = Math.min(100, Math.round((spent / monthlyBudget) * 100));
          const remaining = Math.max(0, monthlyBudget - spent);
          const overBudget = spent > monthlyBudget;
          const barColor =
            overBudget || pct >= 100
              ? 'bg-rose-500'
              : pct >= 75
              ? 'bg-amber-500'
              : 'bg-[#274E3C] dark:bg-[#7CC79E]';

          return (
            <div
              className={`rounded-[24px] p-4 border shadow-soft-sm space-y-2.5 ${
                isDark ? 'bg-[#18211D] border-[#243028]' : 'bg-white border-[#ECECE6]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className={`w-4 h-4 ${overBudget ? 'text-rose-500' : isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`} />
                  <span className={`text-[14px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                    Monthly Budget
                  </span>
                </div>
                <button
                  type="button"
                  onClick={openMoneySettingsModal}
                  className={`text-[11px] font-semibold hover:underline ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}
                >
                  Edit target
                </button>
              </div>

              <div className="flex items-baseline justify-between text-[13px]">
                <span className={`font-bold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                  {financialSummary.currencySymbol}
                  {spent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className={`font-normal text-[12px] ${isDark ? 'text-[#879B90]' : 'text-[#7A877E]'}`}>
                    {' '}/ {financialSummary.currencySymbol}
                    {monthlyBudget.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </span>
                <span className={`text-[12px] font-semibold ${overBudget ? 'text-rose-500' : pct >= 75 ? 'text-amber-500' : isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
                  {Math.round((spent / monthlyBudget) * 100)}%
                </span>
              </div>

              <div className={`h-2.5 rounded-full overflow-hidden w-full ${isDark ? 'bg-[#25322B]' : 'bg-[#EAEFE8]'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <p className={`text-[11px] ${overBudget ? 'text-rose-500 font-medium' : isDark ? 'text-[#879B90]' : 'text-[#7A877E]'}`}>
                {overBudget
                  ? `Over budget by ${financialSummary.currencySymbol}${(spent - monthlyBudget).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `${financialSummary.currencySymbol}${remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining this month`}
              </p>
            </div>
          );
        })()
      ) : (
        <button
          type="button"
          onClick={openMoneySettingsModal}
          className={`w-full rounded-[22px] p-3.5 border border-dashed flex items-center justify-between transition-all active:scale-[0.99] ${
            isDark
              ? 'bg-[#17201B] border-[#29382F] text-[#9EB2A6] hover:bg-[#1C2721]'
              : 'bg-[#F5F7F3] border-[#D5DFD3] text-[#4C6152] hover:bg-[#EDF2EA]'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Target className={`w-4 h-4 ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`} />
            <span className="text-[13px] font-medium">Set a monthly spending budget</span>
          </div>
          <span className={`text-[12px] font-semibold ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
            Set target &rarr;
          </span>
        </button>
      )}

      {/* Money Reminders (Bills, I Owe, Owed to Me) */}
      <MoneyRemindersCard />

      {/* Where it's going breakdown (Dynamic Custom Categories) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h3 className={`text-[17px] font-semibold tracking-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
            Where it's going
          </h3>
          <span className={`text-[12px] font-medium ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>
            {formatMoneyAmount(financialSummary.currencySymbol, totalExpenseAmount)} this month
          </span>
        </div>

        <div
          className={`rounded-[26px] p-4 border shadow-soft-sm space-y-4 ${
            isDark ? 'bg-[#18211D] border-[#243028]' : 'bg-white border-[#ECECE6]'
          }`}
        >
          {totalExpenseAmount > 0 && categoryEntries.length > 0 ? (
            <div className={`h-2.5 rounded-full overflow-hidden flex w-full ${isDark ? 'bg-[#25322B]' : 'bg-[#E5EDE5]'}`}>
              {categoryEntries.map(([cat, amt], idx) => {
                const widthPercent = (amt / totalExpenseAmount) * 100;
                const color = palette[idx % palette.length];
                return (
                  <div
                    key={cat}
                    className="h-full transition-all"
                    style={{ width: `${widthPercent}%`, backgroundColor: color }}
                    title={`${cat}: ${formatMoneyAmount(financialSummary.currencySymbol, amt)}`}
                  />
                );
              })}
            </div>
          ) : (
            <div className={`h-2.5 rounded-full w-full ${isDark ? 'bg-[#25322B]' : 'bg-[#EAEFE8]'}`} />
          )}

          {categoryEntries.length === 0 ? (
            <p className={`text-[13px] text-center py-2 ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>
              No expenses recorded this month yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {categoryEntries.map(([cat, amt], idx) => {
                const color = palette[idx % palette.length];
                const sharePct = totalExpenseAmount > 0 ? Math.round((amt / totalExpenseAmount) * 100) : 0;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setSelectedCategory((prev) => {
                        const next = prev === cat ? null : cat;
                        if (next) setTxFilter('all');
                        return next;
                      })
                    }
                    className={`text-left p-2.5 rounded-2xl border transition-all active:scale-[0.98] ${
                      isSelected
                        ? isDark
                          ? 'bg-[#213128] border-[#7CC79E]/60'
                          : 'bg-[#EEF4EC] border-[#274E3C]/50'
                        : isDark
                        ? 'bg-[#141C18]/60 border-transparent hover:border-[#293830]'
                        : 'bg-[#F9FAF8] border-transparent hover:border-[#DFE6DD]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className={`text-[12px] truncate ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>
                          {cat}
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold shrink-0 ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
                        {sharePct}%
                      </span>
                    </div>
                    <p className={`text-[15px] font-bold mt-1 pl-3.5 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                      {formatMoneyAmount(financialSummary.currencySymbol, amt)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <h3 className={`text-[17px] font-semibold tracking-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
              Recent activity
            </h3>
            <span className={`text-[12px] font-medium ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>
              ({filteredTransactions.length})
            </span>
          </div>

          {transactions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowTxSearch((prev) => {
                  if (prev) setTxSearchQuery('');
                  return !prev;
                });
              }}
              aria-label="Search transactions"
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all active:scale-95 ${
                showTxSearch
                  ? 'bg-[#274E3C] border-[#274E3C] text-white'
                  : isDark
                  ? 'bg-[#1E2722] border-[#2A3730] text-[#8EA397] hover:bg-[#25332B]'
                  : 'bg-white border-[#E3E8E1] text-[#637367] hover:bg-[#F4F7F3]'
              }`}
            >
              <Search className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          )}
        </div>

        {/* Filter Pills & Active Category Filter */}
        {transactions.length > 0 && (
          <div className="space-y-2">
            <div className={`p-1 rounded-full flex items-center ${isDark ? 'bg-[#1E2822]' : 'bg-[#EAEFE8]'}`}>
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'expense', label: 'Expenses' },
                  { id: 'income', label: 'Income' },
                  { id: 'savings', label: 'Savings' },
                ] as const
              ).map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setTxFilter(pill.id)}
                  className={`flex-1 py-1.5 px-2 rounded-full text-[11px] font-medium transition-all ${
                    txFilter === pill.id
                      ? isDark
                        ? 'bg-[#274E3C] text-white font-semibold shadow-sm'
                        : 'bg-white text-[#1E2621] font-semibold shadow-sm'
                      : isDark
                      ? 'text-[#8EA397] hover:text-[#EDEFEA]'
                      : 'text-[#6F7E73] hover:text-[#1E2621]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {showTxSearch && (
              <div
                className={`rounded-2xl px-3.5 py-2 border flex items-center gap-2 animate-fade-in ${
                  isDark ? 'bg-[#18211D] border-[#26352C]' : 'bg-white border-[#ECECE6]'
                }`}
              >
                <Search className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`} />
                <input
                  type="text"
                  autoFocus
                  value={txSearchQuery}
                  onChange={(e) => setTxSearchQuery(e.target.value)}
                  placeholder="Search merchant, category, or note..."
                  className="flex-1 text-[13px] outline-none bg-transparent"
                />
                {txSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTxSearchQuery('')}
                    aria-label="Clear search"
                    className="p-0.5 opacity-60 hover:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {selectedCategory && (
              <div className="flex items-center justify-between px-1">
                <span className={`text-[11px] font-medium ${isDark ? 'text-[#879B90]' : 'text-[#6A786E]'}`}>
                  Filtered by category:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    isDark ? 'bg-[#223028] text-[#7CC79E]' : 'bg-[#EAF0E8] text-[#274E3C]'
                  }`}
                >
                  <span>{selectedCategory}</span>
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        <div
          className={`rounded-[26px] p-4 border shadow-soft-sm divide-y ${
            isDark ? 'bg-[#18211D] border-[#243028] divide-[#222E26]' : 'bg-white border-[#ECECE6] divide-[#F2F1ED]'
          }`}
        >
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 space-y-2.5">
              <p className={`text-[14px] ${isDark ? 'text-[#879B90]' : 'text-[#7A877E]'}`}>
                {transactions.length === 0
                  ? 'No financial entries yet.'
                  : 'No entries match your active filters.'}
              </p>
              {transactions.length === 0 ? (
                <button
                  type="button"
                  onClick={() => openModal('add-money')}
                  className="text-[12px] font-semibold text-white bg-[#274E3C] py-1.5 px-3.5 rounded-full shadow-sm"
                >
                  + Add Entry
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTxFilter('all');
                    setSelectedCategory(null);
                    setTxSearchQuery('');
                  }}
                  className={`text-[12px] font-semibold py-1.5 px-3.5 rounded-full ${
                    isDark ? 'bg-[#223028] text-[#7CC79E]' : 'bg-[#EAF0E8] text-[#274E3C]'
                  }`}
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => openTransactionEditModal(tx)}
                className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-2 group cursor-pointer"
              >
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-soft-sm shrink-0 mt-0.5 ${isDark ? 'bg-[#223028]' : 'bg-[#F0F5EE]'}`}>
                    {getActivityIcon(tx.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-[14px] font-semibold truncate ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                        {tx.merchant}
                      </p>
                      {tx.type === 'savings' && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#274E3C]/15 text-[#274E3C] dark:bg-[#7CC79E]/15 dark:text-[#7CC79E] shrink-0">
                          Saved
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] truncate ${isDark ? 'text-[#889B90]' : 'text-[#86948A]'}`}>
                      {tx.category} · {formatDateHumanLabel(tx.date, todayLocalStr)}
                    </p>
                    {tx.note && tx.note.trim() && (
                      <p className={`text-[11px] italic truncate mt-0.5 ${isDark ? 'text-[#778B7E]' : 'text-[#86948A]'}`}>
                        {tx.note}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0 pt-1">
                  <span
                    className={`text-[15px] font-semibold ${
                      tx.type === 'income'
                        ? 'text-[#2E7A4A] dark:text-[#7CC79E]'
                        : tx.type === 'savings'
                        ? 'text-[#274E3C] dark:text-[#7CC79E] font-bold'
                        : isDark
                        ? 'text-[#EDEFEA]'
                        : 'text-[#1E2621]'
                    }`}
                  >
                    {tx.type === 'income' || tx.type === 'savings' ? '+' : '-'}
                    {formatMoneyAmount(financialSummary.currencySymbol, tx.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTransaction(tx.id);
                    }}
                    aria-label="Delete entry"
                    className="text-red-400 hover:text-red-600 p-1 opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Subtle footer shortcut to clear money data */}
      <div className="text-center pt-2">
        <button
          onClick={openMoneySettingsModal}
          className={`text-[12px] font-medium transition-colors hover:underline ${
            isDark ? 'text-[#75887C]' : 'text-[#829286]'
          }`}
        >
          Money Settings &amp; Reset
        </button>
      </div>

      {/* Little Settings Modal for Money */}
      {showMoneySettings && (
        <div
          onClick={() => setShowMoneySettings(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] p-6 safe-modal-bottom shadow-2xl border space-y-4 ${
              isDark
                ? 'bg-[#151D18] border-[#25332B] text-[#EDEFEA]'
                : 'bg-[#FAF8F5] border-[#ECECE6] text-[#1E2621]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[11px] font-semibold tracking-widest uppercase ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
                  Preferences
                </p>
                <h2 className={`text-[24px] font-bold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                  Money Settings
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowMoneySettings(false)}
                className={`w-9 h-9 rounded-full border flex items-center justify-center ${
                  isDark ? 'bg-[#202C25] border-[#2F3F36] text-[#8EA397]' : 'bg-white border-[#E3E8E1] text-[#69796D]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success message */}
            {clearSuccess && (
              <div className="bg-[#274E3C] text-white p-3.5 rounded-2xl flex items-center space-x-2 text-[13px] font-semibold animate-fade-in">
                <Check className="w-4 h-4" />
                <span>Money data cleared! All tasks and schedules were kept safe.</span>
              </div>
            )}

            {/* Monthly Spending Target */}
            <form
              onSubmit={handleSaveBudget}
              className={`rounded-2xl p-4 border space-y-3 ${
                isDark ? 'bg-[#1C2620] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-[#25362C] text-[#7CC79E]' : 'bg-[#EAF0E8] text-[#274E3C]'}`}>
                    <Target className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div>
                    <h4 className={`text-[14px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                      Monthly Spending Budget
                    </h4>
                    <p className={`text-[11px] ${isDark ? 'text-[#8EA397]' : 'text-[#7A877E]'}`}>
                      Set to 0 to hide budget progress bar
                    </p>
                  </div>
                </div>
                {budgetSaved && (
                  <span className="text-[11px] font-semibold text-[#2E7A4A] dark:text-[#7CC79E] flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <div
                  className={`flex-1 flex items-center space-x-2 px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-[#141C17] border-[#2B3B31]' : 'bg-[#FAFBF9] border-[#E4E8E2]'
                  }`}
                >
                  <span className={`text-[15px] font-bold ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
                    {financialSummary.currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0 (No limit)"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="w-full text-[15px] font-semibold outline-none bg-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-[#274E3C] hover:bg-[#1E3E30] text-white text-[13px] font-semibold shadow-sm active:scale-95 transition-all"
                >
                  Save
                </button>
              </div>
            </form>

            {/* Clear Money Data Option */}
            <div
              className={`rounded-2xl p-4 border space-y-3 ${
                isDark ? 'bg-[#1C2620] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold text-red-500">
                    Clear Money Data
                  </h4>
                  <p className={`text-[12px] mt-0.5 leading-relaxed ${isDark ? 'text-[#8EA397]' : 'text-[#7A877E]'}`}>
                    Resets your balance, transactions, and money reminders to 0. <strong>Your monthly budget, tasks, schedule, and daily reflections stay untouched.</strong>
                  </p>
                </div>
              </div>

              {confirmClearMoney ? (
                <div className={`pt-3 border-t space-y-2.5 ${isDark ? 'border-[#28372F]' : 'border-[#F0EFEB]'}`}>
                  <div className="flex items-center space-x-1.5 text-amber-500 text-[12px] font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Are you sure? This cannot be undone.</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setConfirmClearMoney(false)}
                      className={`flex-1 py-2 rounded-xl text-[13px] font-semibold border ${
                        isDark ? 'bg-[#222E27] border-[#2E3F35] text-[#CAD8CF]' : 'bg-white border-[#E1E5E0] text-[#55695B]'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleClearMoney}
                      className="flex-1 py-2 rounded-xl text-[13px] font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm active:scale-95 transition-all"
                    >
                      Yes, Clear Money
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearMoney(true)}
                  className="w-full py-2.5 px-3 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-[13px] font-semibold transition-all active:scale-95"
                >
                  Clear Money Data
                </button>
              )}
            </div>

            {/* Offline storage note */}
            <div
              className={`rounded-2xl p-3 border flex items-start space-x-2.5 text-[11px] ${
                isDark ? 'bg-[#18231D] border-[#25352A] text-[#869E90]' : 'bg-[#F2F7F1] border-[#E0EBE0] text-[#586D5F]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#274E3C] dark:text-[#7CC79E] shrink-0 mt-0.5" />
              <span>
                Independent storage: clearing money data resets only the financial ledger without touching tasks or schedule events.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
