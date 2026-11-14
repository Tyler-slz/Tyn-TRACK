'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/context/AppContext';
import { TabType } from '@/lib/types';
import { isNativeApp } from '@/lib/nativeAlarms';
import { useMinuteClock } from '@/lib/useMinuteClock';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { AlarmOverlay } from '@/components/alarm/AlarmOverlay';
import {
  LayoutGrid,
  CheckSquare,
  Calendar,
  Wallet,
} from 'lucide-react';

function TabLoadingFallback() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-6 w-32 rounded-lg bg-current opacity-10" />
      <div className="h-24 w-full rounded-3xl bg-current opacity-10" />
      <div className="h-24 w-full rounded-3xl bg-current opacity-10" />
    </div>
  );
}

const TodoView = dynamic(
  () => import('@/components/todo/TodoView').then((m) => m.TodoView),
  { ssr: false, loading: () => <TabLoadingFallback /> }
);
const ScheduleView = dynamic(
  () => import('@/components/schedule/ScheduleView').then((m) => m.ScheduleView),
  { ssr: false, loading: () => <TabLoadingFallback /> }
);
const MoneyView = dynamic(
  () => import('@/components/money/MoneyView').then((m) => m.MoneyView),
  { ssr: false, loading: () => <TabLoadingFallback /> }
);
const ActionModals = dynamic(
  () => import('@/components/modals/ActionModals').then((m) => m.ActionModals),
  { ssr: false }
);

function LiveClock({ isDark }: { isDark: boolean }) {
  const timeStr = useMinuteClock();
  return (
    <span
      suppressHydrationWarning
      className={`text-[14px] font-bold tracking-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}
    >
      {timeStr}
    </span>
  );
}

export function AppShell() {
  const { activeTab, setActiveTab, activeModal, theme } = useApp();

  const isDark = theme === 'dark';

  // Register service worker for offline PWA capabilities & system notifications (web only)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !isNativeApp()) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('Service Worker registration failed:', err);
        });
    }
  }, []);

  // Warm lazy-loaded tabs & modals right after Dashboard settles so offline switching stays instant
  useEffect(() => {
    const preloadChunks = () => {
      void import('@/components/todo/TodoView');
      void import('@/components/schedule/ScheduleView');
      void import('@/components/money/MoneyView');
      void import('@/components/modals/ActionModals');
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = (window as any).requestIdleCallback(preloadChunks, { timeout: 1500 });
      return () => (window as any).cancelIdleCallback(idleId);
    }
    const timer = setTimeout(preloadChunks, 500);
    return () => clearTimeout(timer);
  }, []);

  const navItems: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'todo', label: 'To-Do', icon: CheckSquare },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'money', label: 'Money', icon: Wallet },
  ];

  return (
    <div
      className={`min-h-screen sm:py-8 flex items-center justify-center font-sans antialiased transition-colors duration-300 ${
        isDark ? 'bg-[#0D110F] text-[#EDEFEA]' : 'bg-[#ECEAE3] text-[#1E2621]'
      }`}
    >
      {/* Mobile Shell Frame */}
      <div
        className={`w-full max-w-[430px] min-h-screen sm:min-h-[890px] sm:max-h-[920px] sm:rounded-[44px] sm:shadow-2xl sm:border-[6px] relative flex flex-col overflow-hidden transition-colors duration-300 ${
          isDark
            ? 'bg-[#141A17] sm:border-[#1E2621] text-[#EDEFEA]'
            : 'bg-[#FAF8F5] sm:border-[#1E2522] text-[#1E2621]'
        }`}
      >
        {/* Minimalist Top Status Bar (Wifi, Battery, Signal REMOVED per user request) */}
        <div className="pt-3.5 px-7 pb-1 flex items-center justify-between select-none shrink-0 z-30">
          <LiveClock isDark={isDark} />
          <div className="w-2 h-2 rounded-full bg-[#274E3C] opacity-75" />
        </div>

        {/* Scrollable Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth focus:outline-none">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'todo' && <TodoView />}
          {activeTab === 'schedule' && <ScheduleView />}
          {activeTab === 'money' && <MoneyView />}
        </main>

        {/* Fixed Bottom Navigation Bar */}
        <div
          className={`fixed sm:absolute bottom-0 inset-x-0 backdrop-blur-md border-t z-40 px-3 pt-2 pb-1.5 transition-colors duration-300 ${
            isDark
              ? 'bg-[#141A17]/95 border-[#1E2621]'
              : 'bg-[#FAF8F5]/95 border-[#EAE8E1]'
          }`}
        >
          <nav className="flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center py-1 px-3 min-w-[68px] rounded-2xl transition-all active:scale-95 ${
                    isActive
                      ? isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'
                      : isDark ? 'text-[#687C70] hover:text-[#95ABA0]' : 'text-[#8E9B91] hover:text-[#5B6D61]'
                  }`}
                  aria-label={item.label}
                >
                  <div
                    className={`p-1 rounded-xl transition-all ${
                      isActive ? (isDark ? 'bg-[#1F2E25]' : 'bg-[#EAF0E8]') : ''
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
                  </div>
                  <span
                    className={`text-[10px] mt-0.5 tracking-tight transition-all ${
                      isActive
                        ? isDark ? 'font-bold text-[#7CC79E]' : 'font-bold text-[#274E3C]'
                        : isDark ? 'font-medium text-[#687C70]' : 'font-medium text-[#8E9B91]'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* iOS Bottom Home Bar */}
          <div className="pt-2 pb-1 flex justify-center">
            <div
              className={`w-32 h-1 rounded-full ${
                isDark ? 'bg-white/20' : 'bg-[#1E2621]/20'
              }`}
            />
          </div>
        </div>

        {/* Floating Real-time Alarm Banner Overlay */}
        <AlarmOverlay />

        {/* Action Modals for Adding to-dos, events, transactions, and Settings */}
        {activeModal && <ActionModals />}
      </div>
    </div>
  );
}
