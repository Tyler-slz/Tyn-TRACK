'use client';

import React, { useState } from 'react';
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
  SlidersHorizontal,
  Check
} from 'lucide-react';

export function MoneyView() {
  const { state, openModal, currentMonthYear, deleteTransaction, updateMonthlyBudget, theme } = useApp();
  const { financialSummary, transactions } = state;
  const isDark = theme === 'dark';

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(
    (financialSummary.monthlyBudgetLimit || 10000).toString()
  );

  const getActivityIcon = (category: string) => {
    switch (category) {
      case 'Food & groceries':
        return <ShoppingBag className="w-4 h-4 stroke-[1.8] text-[#274E3C]" />;
      case 'Food & drinks':
        return <Coffee className="w-4 h-4 stroke-[1.8] text-[#274E3C]" />;
      case 'Bills':
        return <Music className="w-4 h-4 stroke-[1.8] text-[#274E3C]" />;
      case 'Income':
        return <Banknote className="w-4 h-4 stroke-[1.8] text-[#274E3C]" />;
      default:
        return <CreditCard className="w-4 h-4 stroke-[1.8] text-[#274E3C]" />;
    }
  };

  const expenses = transactions.filter((t) => t.type === 'expense');
  const foodTotal = expenses
    .filter((t) => t.category.toLowerCase().includes('food') || t.category.toLowerCase().includes('grocer'))
    .reduce((acc, t) => acc + t.amount, 0);
  const shoppingTotal = expenses
    .filter((t) => t.category.toLowerCase().includes('shop'))
    .reduce((acc, t) => acc + t.amount, 0);
  const transportTotal = expenses
    .filter((t) => t.category.toLowerCase().includes('transport'))
    .reduce((acc, t) => acc + t.amount, 0);
  const billsTotal = expenses
    .filter((t) => t.category.toLowerCase().includes('bill'))
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenseAmount = expenses.reduce((acc, t) => acc + t.amount, 0);

  // Suggestion 3: Budget Limit & Progress Ring Calculations
  const budgetLimit = financialSummary.monthlyBudgetLimit || 10000;
  const budgetSpentPercent = Math.min(100, Math.round((totalExpenseAmount / budgetLimit) * 100));
  const budgetRemaining = Math.max(0, budgetLimit - totalExpenseAmount);
  const isNearLimit = budgetSpentPercent >= 85;

  const handleSaveBudget = () => {
    const parsed = parseFloat(budgetInput) || 10000;
    updateMonthlyBudget(parsed);
    setIsEditingBudget(false);
  };

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

      {/* Suggestion 3: Monthly Budget Limit & Visual Gauge Card */}
      <div
        className={`rounded-[26px] p-4.5 border shadow-soft-sm space-y-3 ${
          isDark ? 'bg-[#18211D] border-[#243028]' : 'bg-white border-[#ECECE6]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className={`w-4 h-4 ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`} />
            <h3 className={`text-[15px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
              Monthly Budget Goal
            </h3>
          </div>
          <button
            onClick={() => setIsEditingBudget(!isEditingBudget)}
            className="text-[11px] font-semibold text-[#274E3C] hover:underline"
          >
            {isEditingBudget ? 'Cancel' : 'Set Limit'}
          </button>
        </div>

        {isEditingBudget ? (
          <div className="flex items-center space-x-2 pt-1">
            <span className="text-[14px] font-bold">{financialSummary.currencySymbol}</span>
            <input
              type="number"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className={`flex-1 p-2 rounded-xl border text-[14px] font-semibold outline-none ${
                isDark ? 'bg-[#1F2B24] border-[#2E3F33] text-white' : 'bg-[#FAFBF9] border-[#DCE4D9]'
              }`}
            />
            <button
              onClick={handleSaveBudget}
              className="py-2 px-3 rounded-xl bg-[#274E3C] text-white font-semibold text-[12px] flex items-center space-x-1 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className={`font-medium ${isDark ? 'text-[#879B90]' : 'text-[#6C7C70]'}`}>
                {budgetSpentPercent}% used of {financialSummary.currencySymbol}{budgetLimit.toLocaleString()}
              </span>
              <span
                className={`font-semibold ${
                  isNearLimit ? 'text-amber-500 font-bold' : isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'
                }`}
              >
                {financialSummary.currencySymbol}{budgetRemaining.toLocaleString()} left
              </span>
            </div>

            {/* Visual Gauge Bar */}
            <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-[#25322B]' : 'bg-[#EAEFE8]'}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isNearLimit ? 'bg-amber-500' : 'bg-[#274E3C]'
                }`}
                style={{ width: `${budgetSpentPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Where it's going breakdown */}
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
          {totalExpenseAmount > 0 ? (
            <div className="h-2.5 rounded-full overflow-hidden flex w-full bg-[#E5EDE5]">
              <div
                className="h-full bg-[#274E3C]"
                style={{ width: `${(foodTotal / totalExpenseAmount) * 100}%` }}
              />
              <div
                className="h-full bg-[#527763]"
                style={{ width: `${(shoppingTotal / totalExpenseAmount) * 100}%` }}
              />
              <div
                className="h-full bg-[#95B5A3]"
                style={{ width: `${(transportTotal / totalExpenseAmount) * 100}%` }}
              />
              <div
                className="h-full bg-[#D2E2D6]"
                style={{ width: `${(billsTotal / totalExpenseAmount) * 100}%` }}
              />
            </div>
          ) : (
            <div className={`h-2.5 rounded-full w-full ${isDark ? 'bg-[#25322B]' : 'bg-[#EAEFE8]'}`} />
          )}

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#274E3C]" />
                <span className={`text-[12px] ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>Food & groceries</span>
              </div>
              <p className={`text-[15px] font-bold mt-0.5 pl-3.5 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                {financialSummary.currencySymbol}{foodTotal.toFixed(2)}
              </p>
            </div>

            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#527763]" />
                <span className={`text-[12px] ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>Shopping</span>
              </div>
              <p className={`text-[15px] font-bold mt-0.5 pl-3.5 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                {financialSummary.currencySymbol}{shoppingTotal.toFixed(2)}
              </p>
            </div>

            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#95B5A3]" />
                <span className={`text-[12px] ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>Transport</span>
              </div>
              <p className={`text-[15px] font-bold mt-0.5 pl-3.5 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                {financialSummary.currencySymbol}{transportTotal.toFixed(2)}
              </p>
            </div>

            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D2E2D6]" />
                <span className={`text-[12px] ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>Bills</span>
              </div>
              <p className={`text-[15px] font-bold mt-0.5 pl-3.5 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                {financialSummary.currencySymbol}{billsTotal.toFixed(2)}
              </p>
            </div>
          </div>
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
                      tx.type === 'income' ? 'text-[#2E7A4A]' : isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
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
