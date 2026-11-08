'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  Coffee,
  Music,
  Banknote,
  CreditCard,
  Wallet,
  Trash2,
  PiggyBank,
  Sparkles,
} from 'lucide-react';

export function MoneyView() {
  const {
    state,
    openModal,
    currentMonthYear,
    deleteTransaction,
    theme,
  } = useApp();
  const { financialSummary, transactions } = state;
  const isDark = theme === 'dark';

  const getActivityIcon = (category: string) => {
    const lower = (category || '').toLowerCase();
    if (lower.includes('saving') || lower.includes('vault') || lower.includes('piggy')) {
      return <PiggyBank className="w-4 h-4 stroke-[1.8] text-[#274E3C]" />;
    }
    if (lower.includes('food') || lower.includes('grocer')) {
      return <ShoppingBag className="w-4 h-4 stroke-[1.8] text-[#274E3C]" />;
    }
    if (lower.includes('drink') || lower.includes('coffee')) {
      return <Coffee className="w-4 h-4 stroke-[1.8] text-[#274E3C]" />;
    }
    if (lower.includes('bill') || lower.includes('util')) {
      return <Music className="w-4 h-4 stroke-[1.8] text-[#274E3C]" />;
    }
    if (lower.includes('income') || lower.includes('salary')) {
      return <Banknote className="w-4 h-4 stroke-[1.8] text-[#274E3C]" />;
    }
    return <CreditCard className="w-4 h-4 stroke-[1.8] text-[#274E3C]" />;
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
  const palette = ['#274E3C', '#4B735E', '#7AA08A', '#A8C7B5', '#D2E2D6', '#8F9E94'];

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
        <button
          onClick={() => openModal('add-money')}
          aria-label="Add transaction"
          className={`w-10 h-10 rounded-full border shadow-soft-sm flex items-center justify-center transition-all active:scale-95 ${
            isDark
              ? 'bg-[#1E2722] border-[#2A3730] text-[#7CC79E] hover:bg-[#25332B]'
              : 'bg-white/80 border-[#E3E8E1] text-[#274E3C] hover:bg-white'
          }`}
        >
          <Plus className="w-5 h-5 stroke-[2]" />
        </button>
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
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-[#A7C2B2]">Total balance</span>
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/90">
            <Wallet className="w-3.5 h-3.5" />
          </div>
        </div>

        <p className="text-[34px] font-bold tracking-tight text-white mt-1.5">
          {financialSummary.currencySymbol}
          {financialSummary.totalBalance.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/10">
          <div className="bg-[#2F5945] rounded-2xl p-2.5 flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-[#3D6953] flex items-center justify-center text-[#A7C2B2]">
              <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-[10px] text-[#A7C2B2] uppercase font-semibold">Income</p>
              <p className="text-[13px] font-semibold text-white">
                {financialSummary.currencySymbol}
                {financialSummary.monthlyIncome.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
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
                {financialSummary.currencySymbol}
                {financialSummary.monthlyExpenses.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>
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

      {/* Where it's going breakdown (Dynamic Custom Categories) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h3 className={`text-[17px] font-semibold tracking-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
            Where it's going
          </h3>
          <span className={`text-[12px] font-medium ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>
            {financialSummary.currencySymbol}
            {totalExpenseAmount.toFixed(2)} this month
          </span>
        </div>

        <div
          className={`rounded-[26px] p-4 border shadow-soft-sm space-y-4 ${
            isDark ? 'bg-[#18211D] border-[#243028]' : 'bg-white border-[#ECECE6]'
          }`}
        >
          {totalExpenseAmount > 0 && categoryEntries.length > 0 ? (
            <div className="h-2.5 rounded-full overflow-hidden flex w-full bg-[#E5EDE5]">
              {categoryEntries.map(([cat, amt], idx) => {
                const widthPercent = (amt / totalExpenseAmount) * 100;
                const color = palette[idx % palette.length];
                return (
                  <div
                    key={cat}
                    className="h-full transition-all"
                    style={{ width: `${widthPercent}%`, backgroundColor: color }}
                    title={`${cat}: ${financialSummary.currencySymbol}${amt.toFixed(2)}`}
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
            <div className="grid grid-cols-2 gap-4 pt-1">
              {categoryEntries.map(([cat, amt], idx) => {
                const color = palette[idx % palette.length];
                return (
                  <div key={cat}>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className={`text-[12px] truncate ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>
                        {cat}
                      </span>
                    </div>
                    <p className={`text-[15px] font-bold mt-0.5 pl-3.5 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                      {financialSummary.currencySymbol}{amt.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h3 className={`text-[17px] font-semibold tracking-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
            Recent activity
          </h3>
          <span className={`text-[12px] font-medium ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>
            {transactions.length} items
          </span>
        </div>

        <div
          className={`rounded-[26px] p-4 border shadow-soft-sm divide-y ${
            isDark ? 'bg-[#18211D] border-[#243028] divide-[#222E26]' : 'bg-white border-[#ECECE6] divide-[#F2F1ED]'
          }`}
        >
          {transactions.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className={`text-[14px] ${isDark ? 'text-[#879B90]' : 'text-[#7A877E]'}`}>
                No financial entries yet.
              </p>
              <button
                onClick={() => openModal('add-money')}
                className="text-[12px] font-semibold text-white bg-[#274E3C] py-1.5 px-3 rounded-full"
              >
                + Add Entry
              </button>
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="py-3 first:pt-1 last:pb-1 flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-soft-sm ${isDark ? 'bg-[#223028]' : 'bg-[#F0F5EE]'}`}>
                    {getActivityIcon(tx.category)}
                  </div>
                  <div>
                    <p className={`text-[14px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                      {tx.merchant}
                    </p>
                    <p className={`text-[11px] ${isDark ? 'text-[#889B90]' : 'text-[#86948A]'}`}>
                      {tx.category} · {tx.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[15px] font-semibold ${
                      tx.type === 'income'
                        ? 'text-[#2E7A4A]'
                        : tx.type === 'savings'
                        ? 'text-[#274E3C] dark:text-[#7CC79E] font-bold'
                        : isDark
                        ? 'text-[#EDEFEA]'
                        : 'text-[#1E2621]'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'savings' ? '🏦 +' : '-'}
                    {financialSummary.currencySymbol}
                    {tx.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => deleteTransaction(tx.id)}
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
    </div>
  );
}
