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
  Check,
  PiggyBank,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export function MoneyView() {
  const {
    state,
    openModal,
    currentMonthYear,
    deleteTransaction,
    depositToSavings,
    transferSurplusToSavings,
    theme,
  } = useApp();
  const { financialSummary, transactions } = state;
  const isDark = theme === 'dark';

  const [isDepositing, setIsDepositing] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);

  const getActivityIcon = (category: string) => {
    switch (category) {
      case 'Savings':
        return <PiggyBank className="w-4 h-4 stroke-[1.8] text-[#274E3C]" />;
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

  // Extra money calculation: income leftover after expenses
  const extraMoneyThisMonth = Math.max(
    0,
    financialSummary.monthlyIncome - financialSummary.monthlyExpenses
  );
  const totalSavings = financialSummary.totalSavings || 0;

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(depositAmount);
    if (!val || val <= 0) return;
    depositToSavings(val, 'Direct deposit into savings');
    setDepositAmount('');
    setIsDepositing(false);
    setDepositSuccessMsg(`Saved ${financialSummary.currencySymbol}${val.toFixed(2)} to savings!`);
    setTimeout(() => setDepositSuccessMsg(null), 3000);
  };

  const handleQuickTransferSurplus = () => {
    if (extraMoneyThisMonth <= 0) return;
    transferSurplusToSavings(extraMoneyThisMonth);
    setDepositSuccessMsg(
      `Transferred all extra money (${financialSummary.currencySymbol}${extraMoneyThisMonth.toFixed(
        2
      )}) to savings!`
    );
    setTimeout(() => setDepositSuccessMsg(null), 3000);
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

      {/* Savings & Extra Money Card (Replaces Monthly Budget Goal) */}
      <div
        className={`rounded-[26px] p-5 border shadow-soft space-y-4 transition-all ${
          isDark
            ? 'bg-[#18231C] border-[#25362B]'
            : 'bg-[#EFF5EE] border-[#DEE8DD]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-[#223327] text-[#7CC79E]' : 'bg-[#DDE9DC] text-[#274E3C]'
            }`}>
              <PiggyBank className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 className={`text-[15px] font-semibold leading-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                Savings Vault
              </h3>
              <p className={`text-[11px] ${isDark ? 'text-[#879B90]' : 'text-[#708074]'}`}>
                Your protected nest egg
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDepositing(!isDepositing)}
            className="text-[11px] font-semibold text-[#274E3C] hover:underline flex items-center space-x-1"
          >
            <span>{isDepositing ? 'Cancel' : '+ Deposit'}</span>
          </button>
        </div>

        {/* Savings Balance Display */}
        <div className="flex items-baseline justify-between pt-0.5">
          <div>
            <span className={`text-[11px] font-medium block uppercase tracking-wider ${isDark ? 'text-[#8AA093]' : 'text-[#6C7E72]'}`}>
              Total Saved
            </span>
            <p className={`text-[28px] font-bold tracking-tight leading-none mt-1 ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
              {financialSummary.currencySymbol}
              {totalSavings.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="text-right">
            <span className={`text-[11px] font-medium block uppercase tracking-wider ${isDark ? 'text-[#8AA093]' : 'text-[#6C7E72]'}`}>
              Extra Money Left
            </span>
            <p className={`text-[18px] font-bold tracking-tight mt-1 ${
              extraMoneyThisMonth > 0
                ? isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'
                : isDark ? 'text-[#6F8176]' : 'text-[#8A958D]'
            }`}>
              {financialSummary.currencySymbol}
              {extraMoneyThisMonth.toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {/* Success toast if any */}
        {depositSuccessMsg && (
          <div className="bg-[#274E3C] text-white text-[12px] font-medium py-2 px-3 rounded-xl flex items-center space-x-2 animate-fade-in">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{depositSuccessMsg}</span>
          </div>
        )}

        {/* Deposit Input Box */}
        {isDepositing && (
          <form onSubmit={handleDepositSubmit} className="pt-2 border-t border-black/5 dark:border-white/5 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-[14px] font-bold text-[#274E3C]">{financialSummary.currencySymbol}</span>
              <input
                type="number"
                step="any"
                placeholder="Amount to save"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                autoFocus
                className={`flex-1 p-2 rounded-xl border text-[14px] font-semibold outline-none ${
                  isDark ? 'bg-[#1E2B23] border-[#2E4134] text-white' : 'bg-white border-[#D6E2D4] text-[#1E2621]'
                }`}
              />
              <button
                type="submit"
                className="py-2 px-3.5 rounded-xl bg-[#274E3C] text-white font-semibold text-[12px] flex items-center space-x-1 shadow-sm active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </form>
        )}

        {/* Extra Money Auto-Allocation Button */}
        {extraMoneyThisMonth > 0 && !isDepositing && (
          <div className={`pt-2.5 border-t flex items-center justify-between ${isDark ? 'border-[#223327]' : 'border-[#D9E5D7]'}`}>
            <div className="flex items-center space-x-1.5 text-[12px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className={`font-medium ${isDark ? 'text-[#CAD8CF]' : 'text-[#485C4E]'}`}>
                You have {financialSummary.currencySymbol}{extraMoneyThisMonth.toFixed(2)} extra surplus
              </span>
            </div>
            <button
              onClick={handleQuickTransferSurplus}
              className="text-[11px] font-semibold text-white bg-[#274E3C] hover:bg-[#1E3E30] py-1 px-2.5 rounded-lg shadow-sm flex items-center space-x-1 active:scale-95 transition-all"
            >
              <span>Move to Savings</span>
              <ArrowRight className="w-3 h-3" />
            </button>
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
                      tx.type === 'income'
                        ? 'text-[#2E7A4A]'
                        : tx.type === 'savings'
                        ? 'text-[#274E3C] font-bold'
                        : isDark
                        ? 'text-[#EDEFEA]'
                        : 'text-[#1E2621]'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'savings' ? '🏦 ' : '-'}
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
