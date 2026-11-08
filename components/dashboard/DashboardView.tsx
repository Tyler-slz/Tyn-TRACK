'use client';

import React, { useState } from 'react';
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
  Leaf,
  Sun,
  Moon,
  Briefcase,
  User,
  Plus,
  Flame,
  PenLine
} from 'lucide-react';

export function DashboardView() {
  const {
    state,
    toggleTask,
    setActiveTab,
    openModal,
    currentDateHeader,
    theme,
    toggleTheme,
    toggleHabit,
    saveDailyNote,
    nowDate,
  } = useApp();

  const isDark = theme === 'dark';
  const todayStr = nowDate.toISOString().split('T')[0];

  const upNextEvent = state.events.find((e) => e.isUpNext) || state.events[0];
  const restOfDayEvents = state.events.filter((e) => !e.isUpNext).slice(0, 2);

  const pendingTasks = state.tasks.filter((t) => !t.completed);
  const completedTasks = state.tasks.filter((t) => t.completed);
  const totalTasks = state.tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  // Show top 2 uncompleted tasks for "A gentle nudge"
  const nudgeTasks = pendingTasks.slice(0, 2);

  // Today's journal note
  const todayNote = state.dailyNotes?.find((n) => n.date === todayStr)?.text || '';
  const [journalInput, setJournalInput] = useState(todayNote);
  const [isEditingNote, setIsEditingNote] = useState(false);

  return (
    <div className="flex flex-col space-y-6 pb-28 pt-2 px-4">
      {/* Top Greeting Header with Theme / Settings Toggle */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className={`text-[11px] font-semibold tracking-widest uppercase ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
            {currentDateHeader}
          </p>
          <h1 className={`text-[34px] font-bold tracking-tight leading-tight mt-0.5 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
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
            <span className="text-[14px]">⚙️</span>
          </button>
        </div>
      </div>

      {/* Up Next Banner */}
      {upNextEvent ? (
        <div className="relative bg-[#264D3B] text-white rounded-[26px] p-5 shadow-soft overflow-hidden group">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-semibold tracking-wider text-[#A5C1B1] uppercase">
              UP NEXT
            </span>
            <button
              onClick={() => setActiveTab('schedule')}
              className="text-[#A5C1B1] hover:text-white transition-colors"
              title="View details"
            >
              <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>

          <h2 className="text-[25px] font-semibold tracking-tight text-white mt-2 relative z-10">
            {upNextEvent.title}
          </h2>

          <div className="flex items-center justify-between mt-3 relative z-10">
            <p className="text-[13px] text-[#A5C1B1] font-normal">
              {upNextEvent.startTime} - {upNextEvent.endTime} {upNextEvent.location ? `· ${upNextEvent.location}` : ''}
            </p>
            <div className="w-10 h-10 rounded-2xl bg-[#37614D] border border-white/10 flex items-center justify-center text-white/90 shadow-inner">
              <Video className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => openModal('add-event')}
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

      {/* Feature 1: Daily Habits & Routines */}
      {state.habits && state.habits.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h3 className={`text-[15px] font-semibold tracking-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
              Daily Habits
            </h3>
            <span className={`text-[11px] font-medium ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
              Tap to complete
            </span>
          </div>

          <div className="flex space-x-2.5 overflow-x-auto pb-1 no-scrollbar">
            {state.habits.map((habit) => {
              const isDone = habit.lastCompletedDate === todayStr;
              return (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={`flex items-center space-x-2 py-2 px-3.5 rounded-2xl border transition-all shrink-0 active:scale-95 ${
                    isDone
                      ? 'bg-[#274E3C] text-white border-[#274E3C] shadow-sm'
                      : isDark
                      ? 'bg-[#1B221E] border-[#26312A] text-[#8AA093]'
                      : 'bg-white border-[#ECECE6] text-[#55695B]'
                  }`}
                >
                  <span className="text-[16px]">{habit.emoji}</span>
                  <span className={`text-[13px] font-medium ${isDone ? 'text-white' : ''}`}>
                    {habit.title}
                  </span>
                  {habit.streak > 0 && (
                    <span className={`text-[11px] flex items-center space-x-0.5 font-bold ${isDone ? 'text-[#BFD6C7]' : 'text-amber-500'}`}>
                      <Flame className="w-3 h-3 fill-current" />
                      <span>{habit.streak}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section: The Rest of Your Day */}
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
            className={`rounded-[22px] p-4 text-center border cursor-pointer ${
              isDark ? 'bg-[#1B221E] border-[#252E28] text-[#8C9E93]' : 'bg-white border-[#ECECE6] text-[#7A877E]'
            }`}
          >
            <p className="text-[13px]">No more events today. Rest easy! ☕</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {restOfDayEvents.map((evt, idx) => (
              <div
                key={evt.id}
                onClick={() => setActiveTab('schedule')}
                className={`rounded-[22px] p-4 border shadow-soft-sm cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between min-h-[92px] ${
                  isDark
                    ? 'bg-[#1B221E] border-[#252E28] hover:border-[#334239]'
                    : 'bg-white border-[#ECECE6] hover:border-[#D5E1D3]'
                }`}
              >
                <div className={`flex items-center justify-between ${isDark ? 'text-[#8C9E93]' : 'text-[#7E8A81]'}`}>
                  <span className="text-[13px] font-medium">{evt.startTime}</span>
                  {idx === 0 ? (
                    <Utensils className="w-4 h-4 stroke-[1.8]" />
                  ) : (
                    <Sparkles className="w-4 h-4 stroke-[1.8]" />
                  )}
                </div>
                <p className={`text-[15px] font-medium mt-3 truncate ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                  {evt.title}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section: A Gentle Nudge (To-Dos) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={`text-[17px] font-semibold tracking-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
            A gentle nudge
          </h3>
          <span className={`text-[13px] font-normal ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
            {pendingTasks.length} to-dos left
          </span>
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
                  className="mt-2 text-[12px] font-semibold text-[#274E3C] bg-[#EAF0E8] py-1.5 px-3 rounded-full"
                >
                  + Add To-Do
                </button>
              )}
            </div>
          ) : (
            nudgeTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between group pt-1 pb-1"
              >
                <div className="flex items-start space-x-3 flex-1 min-w-0 pr-2">
                  <button
                    onClick={() => toggleTask(task.id)}
                    aria-label={`Mark ${task.title} as completed`}
                    className={`mt-0.5 w-[20px] h-[20px] rounded-[6px] border flex items-center justify-center transition-all ${
                      task.completed
                        ? 'bg-[#274E3C] border-[#274E3C] text-white'
                        : isDark
                        ? 'border-[#3D4D43] bg-[#141A17] hover:border-[#7CC79E]'
                        : 'border-[#CBD4CC] bg-white hover:border-[#264D3B]'
                    }`}
                  >
                    {task.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p
                      onClick={() => toggleTask(task.id)}
                      className={`text-[15px] font-medium leading-snug cursor-pointer select-none transition-colors ${
                        task.completed
                          ? 'line-through text-[#6F7D74]'
                          : isDark
                          ? 'text-[#EDEFEA]'
                          : 'text-[#1E2621]'
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className={`flex items-center space-x-1.5 mt-1 text-[12px] ${isDark ? 'text-[#8A9C91]' : 'text-[#7E8A81]'}`}>
                      {task.category === 'Work' && (
                        <Briefcase className="w-3 h-3 stroke-[2] opacity-70" />
                      )}
                      {task.category === 'Personal' && (
                        <User className="w-3 h-3 stroke-[2] opacity-70" />
                      )}
                      <span>
                        {task.dueTime} · {task.category}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('todo')}
                  className={`p-1 transition-colors ${isDark ? 'text-[#6C7C72] hover:text-[#EDEFEA]' : 'text-[#A3ADA5] hover:text-[#264D3B]'}`}
                >
                  <MoreHorizontal className="w-4 h-4 stroke-[1.8]" />
                </button>
              </div>
            ))
          )}

          {/* Progress Bar */}
          {totalTasks > 0 && (
            <div className={`pt-2 border-t ${isDark ? 'border-[#26312A]' : 'border-[#F2F1ED]'}`}>
              <div className={`w-full h-[3px] rounded-full overflow-hidden ${isDark ? 'bg-[#25322B]' : 'bg-[#EAEFE8]'}`}>
                <div
                  className="bg-[#274E3C] h-full rounded-full transition-all duration-500 ease-out"
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
          className={`rounded-[26px] p-5 flex items-center justify-between shadow-soft-sm border cursor-pointer transition-all ${
            isDark
              ? 'bg-[#18231D] border-[#25362C] hover:bg-[#1C2922]'
              : 'bg-[#E7ECE4] border-[#DCE4D9] hover:bg-[#E2E8DF]'
          }`}
        >
          <div>
            <span className={`text-[12px] font-medium ${isDark ? 'text-[#8CAD99]' : 'text-[#657569]'}`}>Spent today</span>
            <p className={`text-[29px] font-bold tracking-tight leading-none mt-1 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
              {state.financialSummary.currencySymbol}
              {state.financialSummary.spentToday.toFixed(2)}
            </p>
          </div>

          <div className="flex flex-col items-end">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm mb-1.5 ${isDark ? 'bg-[#25362C] text-[#7CC79E]' : 'bg-white/70 text-[#264D3B]'}`}>
              <Wallet className="w-4 h-4 stroke-[1.8]" />
            </div>
            <span className={`text-[12px] font-medium ${isDark ? 'text-[#8CAD99]' : 'text-[#586A5E]'}`}>
              {state.financialSummary.currencySymbol}
              {state.financialSummary.weeklyBudgetLeft.toFixed(2)} left this week
            </span>
          </div>
        </div>
      </div>

      {/* Feature 2: "One Good Thing" — Evening Micro-Journal Reflection */}
      <div
        className={`border rounded-[24px] p-4.5 shadow-soft-sm space-y-2 transition-all ${
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
              onClick={() => setIsEditingNote(true)}
              className="text-[11px] font-medium text-[#274E3C] hover:underline"
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
                }
              }}
              className={`w-full text-[13px] p-2.5 rounded-xl border outline-none ${
                isDark
                  ? 'bg-[#1F2B24] border-[#2E4034] text-white placeholder-[#687C71]'
                  : 'bg-white border-[#D8E4D6] text-[#1E2621] placeholder-[#8A9B8F]'
              }`}
            />
            {journalInput.trim() && (
              <button
                onClick={() => {
                  saveDailyNote(journalInput);
                  setIsEditingNote(false);
                }}
                className="text-[11px] font-semibold text-white bg-[#274E3C] py-1 px-3 rounded-lg shadow-sm"
              >
                Save reflection
              </button>
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
