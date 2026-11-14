'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ArrowUpRight,
  Video,
  Utensils,
  Sparkles,
  Clock,
  MoreHorizontal,
  Check,
  Wallet,
  Sun,
  Moon,
  Plus,
  PenLine,
  BellRing,
  Settings,
  Flag,
} from 'lucide-react';
import {
  compareTasksByUrgency,
  formatDateHumanLabel,
  formatMinutesTo12h,
  getLocalDateString,
} from '@/lib/time';
import { TaskCategoryIcon } from '@/components/todo/taskMeta';
import {
  EVENT_TYPE_META,
  formatRepeatSummary,
  getEventEndMinutes,
  getEventsForDate,
  getEventStartMinutes,
} from '@/lib/schedule';
import { CalendarEvent } from '@/lib/types';
import { useMinuteClock } from '@/lib/useMinuteClock';

function formatCurrency(symbol: string, amount: number): string {
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function renderEventTypeIcon(type: CalendarEvent['type']) {
  switch (type) {
    case 'meeting':
      return <Video className="w-4 h-4 stroke-[1.9]" />;
    case 'food':
      return <Utensils className="w-4 h-4 stroke-[1.9]" />;
    case 'wellness':
      return <Sparkles className="w-4 h-4 stroke-[1.9]" />;
    case 'routine':
    default:
      return <Clock className="w-4 h-4 stroke-[1.9]" />;
  }
}

function formatCountdownBadge(diffMinutes: number): string {
  if (diffMinutes <= 0) return 'STARTING NOW';
  if (diffMinutes < 60) return `IN ${diffMinutes}M`;
  const hrs = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return mins > 0 ? `IN ${hrs}H ${mins}M` : `IN ${hrs}H`;
}

export function DashboardView() {
  const {
    state,
    toggleTask,
    setActiveTab,
    openModal,
    openModalWithTime,
    openTaskEditModal,
    currentDateHeader,
    theme,
    toggleTheme,
    saveDailyNote,
    todayLocalStr,
    nowDate,
  } = useApp();

  const isDark = theme === 'dark';
  const todayStr = todayLocalStr;

  const currentHour = nowDate.getHours();
  const timeGreeting =
    currentHour < 12 ? 'Good morning,' : currentHour < 18 ? 'Good afternoon,' : 'Good evening,';
  const nextHour24 = `${String(Math.min(23, currentHour + 1)).padStart(2, '0')}:00`;

  const threeDaysDate = new Date(nowDate);
  threeDaysDate.setDate(threeDaysDate.getDate() + 3);
  const threeDaysStr = getLocalDateString(threeDaysDate);

  const dueSoonReminders = (state.moneyReminders || [])
    .filter((r) => !r.settled && r.dueDate <= threeDaysStr)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdueRemindersCount = dueSoonReminders.filter((r) => r.dueDate < todayStr).length;
  const firstDueReminder = dueSoonReminders[0];
  const monthlyBudget = state.monthlyBudget || 0;
  const symbol = state.financialSummary.currencySymbol || '₱';

  const clockTick = useMinuteClock();
  const dashboardTodayStr = todayStr || getLocalDateString(nowDate);

  const [liveNowMinutes, setLiveNowMinutes] = useState<number>(() => {
    const d = nowDate || new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const now = new Date();
    setLiveNowMinutes(now.getHours() * 60 + now.getMinutes());
  }, [clockTick, nowDate]);

  const todayEvents = getEventsForDate(state.events, dashboardTodayStr);
  const timedTodayEvents = todayEvents.filter((e) => !e.allDay);
  const allDayTodayEvents = todayEvents.filter((e) => Boolean(e.allDay));

  const happeningNowEvent = timedTodayEvents.find((e) => {
    const start = getEventStartMinutes(e);
    const end = getEventEndMinutes(e);
    return start <= liveNowMinutes && liveNowMinutes < end;
  });

  const nextUpcomingEvent = timedTodayEvents.find(
    (e) => getEventStartMinutes(e) > liveNowMinutes
  );

  const upNextEvent: CalendarEvent | null =
    happeningNowEvent || nextUpcomingEvent || allDayTodayEvents[0] || null;

  const upNextBadge = happeningNowEvent
    ? 'HAPPENING NOW'
    : nextUpcomingEvent
    ? `UP NEXT · ${formatCountdownBadge(
        getEventStartMinutes(nextUpcomingEvent) - liveNowMinutes
      )}`
    : allDayTodayEvents[0]
    ? 'ALL DAY TODAY'
    : 'UP NEXT';

  const upNextRepeatSummary = upNextEvent ? formatRepeatSummary(upNextEvent) : null;

  const restOfDayEvents = upNextEvent
    ? todayEvents
        .filter((e) => {
          if (e.id === upNextEvent.id) return false;
          if (e.allDay) return true;
          return getEventEndMinutes(e) > liveNowMinutes;
        })
        .slice(0, 2)
    : [];

  const pendingTasks = [...state.tasks]
    .filter((t) => !t.completed)
    .sort((a, b) => compareTasksByUrgency(a, b, todayStr));
  const completedTasks = state.tasks.filter((t) => t.completed);
  const totalTasks = state.tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  // Show top 3 most urgent tasks for "A gentle nudge"
  const nudgeTasks = pendingTasks.slice(0, 3);

  // Today's journal note
  const todayNote = state.dailyNotes?.find((n) => n.date === todayStr)?.text || '';
  const [journalInput, setJournalInput] = useState(todayNote);
  const [isEditingNote, setIsEditingNote] = useState(false);

  useEffect(() => {
    setJournalInput(todayNote);
  }, [todayNote]);

  return (
    <div className="flex flex-col space-y-5 pb-28 pt-2 px-4">
      {/* Top Greeting Header with Theme / Settings Toggle */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p suppressHydrationWarning className={`text-[11px] font-semibold tracking-widest uppercase ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
            {currentDateHeader}
          </p>
          <p suppressHydrationWarning className={`text-[13px] font-medium mt-1 ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
            {timeGreeting}
          </p>
          <h1 className={`text-[34px] font-bold tracking-tight leading-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
            {state.userName}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            title="Toggle theme"
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-95 ${
              isDark
                ? 'bg-[#1E2722] border-[#2A3730] text-[#7CC79E]'
                : 'bg-white/80 border-[#E3E8E1] text-[#637367] hover:bg-white'
            }`}
          >
            {isDark ? <Sun className="w-5 h-5 stroke-[1.8]" /> : <Moon className="w-5 h-5 stroke-[1.8]" />}
          </button>
          <button
            onClick={() => openModal('settings')}
            aria-label="Settings"
            title="Settings & Storage"
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-95 ${
              isDark
                ? 'bg-[#1E2722] border-[#2A3730] text-[#EDEFEA]'
                : 'bg-white/80 border-[#E3E8E1] text-[#637367] hover:bg-white'
            }`}
          >
            <Settings className="w-[18px] h-[18px] stroke-[1.9]" />
          </button>
        </div>
      </div>

      {/* Quick Actions Strip */}
      <div className="grid grid-cols-4 gap-2">
        {(
          [
            { label: 'To-Do', action: () => openModal('add-todo') },
            { label: 'Event', action: () => openModalWithTime('add-event', nextHour24, dashboardTodayStr) },
            { label: 'Expense', action: () => openModal('add-money') },
            { label: 'Bill / IOU', action: () => openModal('add-money-reminder') },
          ] as const
        ).map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            className={`py-2 px-1.5 rounded-2xl border text-[11px] font-semibold flex items-center justify-center gap-1 shadow-soft-sm transition-all active:scale-95 ${
              isDark
                ? 'bg-[#18211D] border-[#26352C] text-[#EDEFEA] hover:bg-[#1E2B24]'
                : 'bg-white border-[#ECECE6] text-[#1E2621] hover:bg-[#F3F6F1]'
            }`}
          >
            <Plus className="w-3 h-3 text-[#274E3C] dark:text-[#7CC79E] stroke-[2.5] shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Up Next Banner */}
      {upNextEvent ? (
        <div
          onClick={() => setActiveTab('schedule')}
          className="relative bg-[#264D3B] text-white rounded-[26px] p-5 shadow-soft overflow-hidden group cursor-pointer active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-between relative z-10">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[#A5C1B1] uppercase">
              {happeningNowEvent && (
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              )}
              <span>{upNextBadge}</span>
            </span>
            <span className="text-[#A5C1B1] group-hover:text-white transition-colors" aria-hidden="true">
              <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
            </span>
          </div>

          <h2 className="text-[25px] font-semibold tracking-tight text-white mt-2 relative z-10 truncate">
            {upNextEvent.title}
          </h2>

          <div className="flex items-center justify-between gap-2 mt-3 relative z-10">
            <p className="text-[13px] text-[#A5C1B1] font-normal truncate">
              {upNextEvent.allDay
                ? 'All day'
                : `${formatMinutesTo12h(getEventStartMinutes(upNextEvent))} - ${formatMinutesTo12h(
                    getEventEndMinutes(upNextEvent)
                  )}`}{' '}
              {upNextEvent.location ? `· ${upNextEvent.location}` : ''}
              {upNextRepeatSummary ? ` · ${upNextRepeatSummary}` : ''}
            </p>
            <div className="w-10 h-10 rounded-2xl bg-[#37614D] border border-white/10 flex items-center justify-center text-white/90 shadow-inner shrink-0">
              {renderEventTypeIcon(upNextEvent.type)}
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => openModalWithTime('add-event', nextHour24, dashboardTodayStr)}
          className={`rounded-[26px] p-5 border border-dashed cursor-pointer transition-all flex items-center justify-between ${
            isDark
              ? 'bg-[#18211D] border-[#29382F] hover:bg-[#1E2924]'
              : 'bg-[#F2F6F1] border-[#CCD8CD] hover:bg-[#EAF1E9]'
          }`}
        >
          <div>
            <span className={`text-[11px] font-semibold tracking-wider uppercase ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
              No Up Next Event
            </span>
            <p className={`text-[15px] font-semibold mt-0.5 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
              Tap to schedule an event
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#274E3C] text-white flex items-center justify-center">
            <Plus className="w-5 h-5 stroke-[2]" />
          </div>
        </div>
      )}

      {/* Section: The Rest of Your Day */}
      {(upNextEvent !== null || restOfDayEvents.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={`text-[17px] font-semibold tracking-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
              The rest of your day
            </h3>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`text-[13px] font-normal hover:underline transition-colors ${isDark ? 'text-[#879B90]' : 'text-[#6D7D72]'}`}
            >
              View schedule
            </button>
          </div>

          {restOfDayEvents.length === 0 ? (
            <div
              onClick={() => setActiveTab('schedule')}
              className={`rounded-[20px] px-4 py-3 border cursor-pointer flex items-center justify-between ${
                isDark ? 'bg-[#1B221E] border-[#252E28] text-[#8C9E93]' : 'bg-white border-[#ECECE6] text-[#7A877E]'
              }`}
            >
              <span className="text-[12px]">Nothing else scheduled after this today</span>
              <span className={`text-[11px] font-semibold ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
                Open Schedule
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {restOfDayEvents.map((evt) => {
                const meta = EVENT_TYPE_META[evt.type || 'routine'] || EVENT_TYPE_META.routine;
                return (
                  <div
                    key={evt.id}
                    onClick={() => setActiveTab('schedule')}
                    className={`rounded-[22px] p-4 border shadow-soft-sm cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between min-h-[92px] ${
                      isDark
                        ? 'bg-[#1B221E] border-[#252E28] hover:border-[#334239]'
                        : 'bg-white border-[#ECECE6] hover:border-[#D5E1D3]'
                    }`}
                  >
                    <div className={`flex items-center justify-between gap-1.5 ${isDark ? 'text-[#8C9E93]' : 'text-[#7E8A81]'}`}>
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: meta.dotColor }}
                        />
                        <span className="truncate">
                          {evt.allDay ? 'All day' : formatMinutesTo12h(getEventStartMinutes(evt))}
                        </span>
                      </span>
                      <span className="shrink-0">
                        {renderEventTypeIcon(evt.type)}
                      </span>
                    </div>
                    <p className={`text-[15px] font-medium mt-3 truncate ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                      {evt.title}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Section: A Gentle Nudge (To-Dos) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className={`text-[17px] font-semibold tracking-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
              A gentle nudge
            </h3>
            <span className={`text-[12px] font-normal ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
              {pendingTasks.length} left
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openModal('add-todo')}
              className={`text-[11px] font-semibold py-1 px-2.5 rounded-full inline-flex items-center gap-1 transition-all active:scale-95 ${
                isDark
                  ? 'bg-[#202E27] text-[#7CC79E] hover:bg-[#27382F]'
                  : 'bg-[#EEF3EC] text-[#274E3C] hover:bg-[#E1EBE0]'
              }`}
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>Add</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('todo')}
              className={`text-[13px] font-normal hover:underline transition-colors ${isDark ? 'text-[#879B90]' : 'text-[#6D7D72]'}`}
            >
              View all
            </button>
          </div>
        </div>

        <div
          className={`rounded-[26px] p-4 border shadow-soft-sm space-y-3 ${
            isDark ? 'bg-[#1B221E] border-[#252E28]' : 'bg-white border-[#ECECE6]'
          }`}
        >
          {nudgeTasks.length === 0 ? (
            <div className="text-center py-4">
              <p className={`text-[14px] ${isDark ? 'text-[#879B90]' : 'text-[#6A786E]'}`}>
                {totalTasks === 0 ? 'No tasks yet. Tap to add your first to-do!' : 'All caught up for today! 🎉'}
              </p>
              {totalTasks === 0 && (
                <button
                  onClick={() => openModal('add-todo')}
                  className={`mt-2 text-[12px] font-semibold py-1.5 px-3 rounded-full ${
                    isDark ? 'text-[#7CC79E] bg-[#223429]' : 'text-[#274E3C] bg-[#EAF0E8]'
                  }`}
                >
                  + Add To-Do
                </button>
              )}
            </div>
          ) : (
            nudgeTasks.map((task) => {
              const hasExplicitDate = Boolean(
                task.dueDate && task.dueDate.toLowerCase() !== 'today' && task.dueDate !== todayStr
              );
              const isOverdue = Boolean(hasExplicitDate && task.dueDate < todayStr);
              const isHigh = task.priority === 'high';
              return (
                <div
                  key={task.id}
                  onClick={() => openTaskEditModal(task)}
                  className="flex items-start justify-between group pt-1 pb-1 cursor-pointer"
                >
                  <div className="flex items-start space-x-3 flex-1 min-w-0 pr-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTask(task.id);
                      }}
                      aria-label={`Mark ${task.title} as completed`}
                      className={`mt-0.5 w-[20px] h-[20px] rounded-[6px] border flex items-center justify-center shrink-0 transition-all ${
                        task.completed
                          ? 'bg-[#274E3C] border-[#274E3C] text-white'
                          : isHigh
                          ? isDark
                            ? 'border-amber-400/70 bg-[#141A17] hover:border-amber-300'
                            : 'border-amber-500 bg-white hover:border-amber-600'
                          : isDark
                          ? 'border-[#3D4D43] bg-[#141A17] hover:border-[#7CC79E]'
                          : 'border-[#CBD4CC] bg-white hover:border-[#264D3B]'
                      }`}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p
                          className={`text-[15px] font-medium leading-snug select-none transition-colors ${
                            task.completed
                              ? 'line-through text-[#6F7D74]'
                              : isDark
                              ? 'text-[#EDEFEA]'
                              : 'text-[#1E2621]'
                          }`}
                        >
                          {task.title}
                        </p>
                        {isHigh && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5">
                            <Flag className="w-2.5 h-2.5" />
                            <span>High</span>
                          </span>
                        )}
                        {isOverdue && (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-300 bg-rose-500/15 px-1.5 py-0.5 rounded-md">
                            Carryover
                          </span>
                        )}
                      </div>

                      {task.details && task.details.trim() && (
                        <p className={`text-[12px] truncate mt-0.5 ${isDark ? 'text-[#9AB0A3]' : 'text-[#5C6B60]'}`}>
                          {task.details}
                        </p>
                      )}

                      <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 text-[12px] ${isDark ? 'text-[#8A9C91]' : 'text-[#7E8A81]'}`}>
                        <TaskCategoryIcon category={task.category} className="w-3 h-3 stroke-[2] opacity-75 shrink-0" />
                        <span>
                          {task.dueTime || 'Anytime'} · {task.category}
                        </span>
                        {hasExplicitDate && (
                          <span className={isOverdue ? 'text-rose-500 dark:text-rose-300 font-medium' : 'opacity-80'}>
                            · {formatDateHumanLabel(task.dueDate, todayStr)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openTaskEditModal(task);
                    }}
                    aria-label={`Edit ${task.title}`}
                    className={`p-1 transition-colors ${isDark ? 'text-[#6C7C72] hover:text-[#EDEFEA]' : 'text-[#A3ADA5] hover:text-[#264D3B]'}`}
                  >
                    <MoreHorizontal className="w-4 h-4 stroke-[1.8]" />
                  </button>
                </div>
              );
            })
          )}

          {/* Progress Bar */}
          {totalTasks > 0 && (
            <div className={`pt-2 border-t ${isDark ? 'border-[#26312A]' : 'border-[#F2F1ED]'}`}>
              <div className={`w-full h-[3px] rounded-full overflow-hidden ${isDark ? 'bg-[#25322B]' : 'bg-[#EAEFE8]'}`}>
                <div
                  className="bg-[#274E3C] dark:bg-[#7CC79E] h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-end mt-1.5">
                <span className={`text-[11px] font-normal ${isDark ? 'text-[#879B90]' : 'text-[#8A958D]'}`}>
                  {completedTasks.length} of {totalTasks} done
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Smart "Due Soon" Money Reminder Nudge */}
      {dueSoonReminders.length > 0 && firstDueReminder && (
        <button
          type="button"
          onClick={() => setActiveTab('money')}
          className={`w-full text-left rounded-[22px] p-4 border shadow-soft-sm flex items-center justify-between gap-3 transition-all active:scale-[0.99] ${
            overdueRemindersCount > 0
              ? isDark
                ? 'bg-[#25191A] border-[#42282B] hover:bg-[#2C1E1F]'
                : 'bg-[#FDF4F3] border-[#F4D9D5] hover:bg-[#FBECE9]'
              : isDark
              ? 'bg-[#1D241C] border-[#303E2E] hover:bg-[#222B21]'
              : 'bg-[#F8F5EC] border-[#EAE1C9] hover:bg-[#F4EFE0]'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                overdueRemindersCount > 0
                  ? 'bg-rose-500/15 text-rose-500'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}
            >
              <BellRing className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <p
                className={`text-[13px] font-semibold truncate ${
                  overdueRemindersCount > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : isDark
                    ? 'text-amber-300'
                    : 'text-amber-800'
                }`}
              >
                {overdueRemindersCount > 0
                  ? `${overdueRemindersCount} overdue · ${dueSoonReminders.length} money reminder${dueSoonReminders.length === 1 ? '' : 's'}`
                  : `${dueSoonReminders.length} upcoming bill / IOU due soon`}
              </p>
              <p className={`text-[12px] truncate ${isDark ? 'text-[#A2B3A9]' : 'text-[#5C6B60]'}`}>
                {firstDueReminder.person ? `${firstDueReminder.person} · ` : ''}
                {firstDueReminder.title} ({formatCurrency(symbol, firstDueReminder.amount)})
              </p>
            </div>
          </div>
          <span
            className={`text-[12px] font-semibold shrink-0 ${
              isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'
            }`}
          >
            Review &rarr;
          </span>
        </button>
      )}

      {/* Section: Your money, at a glance */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={`text-[17px] font-semibold tracking-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
            Your money, at a glance
          </h3>
          <button
            onClick={() => setActiveTab('money')}
            className={`text-[13px] font-normal hover:underline transition-colors ${isDark ? 'text-[#879B90]' : 'text-[#6D7D72]'}`}
          >
            View money
          </button>
        </div>

        <div
          onClick={() => setActiveTab('money')}
          className={`rounded-[26px] p-5 space-y-4 shadow-soft-sm border cursor-pointer transition-all ${
            isDark
              ? 'bg-[#18231D] border-[#25362C] hover:bg-[#1C2922]'
              : 'bg-[#E7ECE4] border-[#DCE4D9] hover:bg-[#E2E8DF]'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className={`text-[12px] font-medium ${isDark ? 'text-[#8CAD99]' : 'text-[#657569]'}`}>Spent today</span>
              <p className={`text-[29px] font-bold tracking-tight leading-none mt-1 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                {formatCurrency(symbol, state.financialSummary.spentToday)}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openModal('add-money');
                }}
                className="text-[11px] font-semibold bg-[#274E3C] hover:bg-[#1E3F30] text-white py-1.5 px-3 rounded-full shadow-sm inline-flex items-center gap-1 active:scale-95 transition-all"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Log</span>
              </button>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${isDark ? 'bg-[#25362C] text-[#7CC79E]' : 'bg-white/70 text-[#264D3B]'}`}>
                <Wallet className="w-4 h-4 stroke-[1.8]" />
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-3 gap-2 pt-3 border-t ${isDark ? 'border-[#25362C]' : 'border-[#D4DDD0]'}`}>
            <div className="min-w-0">
              <span className={`text-[10px] font-semibold uppercase tracking-wider block ${isDark ? 'text-[#7C9787]' : 'text-[#657569]'}`}>
                Total Balance
              </span>
              <p className={`text-[13px] font-bold truncate mt-0.5 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                {formatCurrency(symbol, state.financialSummary.totalBalance)}
              </p>
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] font-semibold uppercase tracking-wider block ${isDark ? 'text-[#7C9787]' : 'text-[#657569]'}`}>
                This Month
              </span>
              <p className={`text-[13px] font-bold truncate mt-0.5 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                {formatCurrency(symbol, state.financialSummary.monthlyExpenses)}
              </p>
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] font-semibold uppercase tracking-wider block ${isDark ? 'text-[#7C9787]' : 'text-[#657569]'}`}>
                Total Saved
              </span>
              <p className={`text-[13px] font-bold truncate mt-0.5 ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
                {formatCurrency(symbol, state.financialSummary.totalSavings)}
              </p>
            </div>
          </div>

          {monthlyBudget > 0 && (() => {
            const spent = state.financialSummary.monthlyExpenses;
            const budgetPct = Math.min(100, Math.round((spent / monthlyBudget) * 100));
            const overBudget = spent > monthlyBudget;
            const barClass =
              overBudget || budgetPct >= 100
                ? 'bg-rose-500'
                : budgetPct >= 75
                ? 'bg-amber-500'
                : 'bg-[#274E3C] dark:bg-[#7CC79E]';
            return (
              <div className="space-y-1.5">
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#25362C]' : 'bg-white/70'}`}>
                  <div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${budgetPct}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium">
                  <span
                    className={
                      overBudget
                        ? 'text-rose-500'
                        : isDark
                        ? 'text-[#7CC79E]'
                        : 'text-[#274E3C]'
                    }
                  >
                    {overBudget
                      ? `Over budget by ${formatCurrency(symbol, spent - monthlyBudget)}`
                      : `${formatCurrency(symbol, state.financialSummary.weeklyBudgetLeft)} left of ${formatCurrency(symbol, monthlyBudget)}`}
                  </span>
                  <span className={overBudget ? 'text-rose-500 font-semibold' : isDark ? 'text-[#8CAD99]' : 'text-[#586A5E]'}>
                    {Math.round((spent / monthlyBudget) * 100)}%
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Feature 2: "One Good Thing" — Evening Micro-Journal Reflection */}
      <div
        className={`border rounded-[24px] p-5 shadow-soft-sm space-y-2 transition-all ${
          isDark
            ? 'bg-[#18211D] border-[#25342A]'
            : 'bg-[#EFF4EE] border-[#DEE8DD]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'bg-[#233329] text-[#7CC79E]' : 'bg-[#E0EBE0] text-[#274E3C]'}`}>
              <PenLine className="w-3.5 h-3.5 stroke-[2]" />
            </div>
            <h4 className={`text-[14px] font-semibold ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
              One Good Thing Today
            </h4>
          </div>
          {todayNote && !isEditingNote && (
            <button
              type="button"
              onClick={() => setIsEditingNote(true)}
              className={`text-[11px] font-medium hover:underline ${
                isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'
              }`}
            >
              Edit
            </button>
          )}
        </div>

        {isEditingNote || !todayNote ? (
          <div className="space-y-2 pt-1">
            <input
              type="text"
              placeholder="A moment, a thought, or a win..."
              value={journalInput}
              onChange={(e) => setJournalInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveDailyNote(journalInput);
                  setIsEditingNote(false);
                } else if (e.key === 'Escape' && todayNote) {
                  setJournalInput(todayNote);
                  setIsEditingNote(false);
                }
              }}
              className={`w-full text-[13px] p-2.5 rounded-xl border outline-none ${
                isDark
                  ? 'bg-[#1F2B24] border-[#2E4034] text-white placeholder-[#687C71]'
                  : 'bg-white border-[#D8E4D6] text-[#1E2621] placeholder-[#8A9B8F]'
              }`}
            />
            {(journalInput.trim() || (isEditingNote && todayNote)) && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    saveDailyNote(journalInput);
                    setIsEditingNote(false);
                  }}
                  className="text-[11px] font-semibold text-white bg-[#274E3C] hover:bg-[#1E3F30] py-1 px-3 rounded-lg shadow-sm"
                >
                  {journalInput.trim() ? 'Save reflection' : 'Clear reflection'}
                </button>
                {isEditingNote && todayNote && (
                  <button
                    type="button"
                    onClick={() => {
                      setJournalInput(todayNote);
                      setIsEditingNote(false);
                    }}
                    className={`text-[11px] font-medium py-1 px-2.5 rounded-lg ${
                      isDark ? 'text-[#879B90] hover:text-white' : 'text-[#5C6B60] hover:text-[#1E2621]'
                    }`}
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className={`text-[13px] italic pl-9 leading-relaxed ${isDark ? 'text-[#CAD3CD]' : 'text-[#445749]'}`}>
            "{todayNote}"
          </p>
        )}
      </div>
    </div>
  );
}
