'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { getTodayShort } from '@/lib/time';
import {
  Plus,
  Check,
  Bell,
  Briefcase,
  User,
  DollarSign,
  Heart,
  Trash2,
  AlertCircle
} from 'lucide-react';

export function TodoView() {
  const { state, toggleTask, openModal, deleteTask, nowDate, todayLocalStr, theme } = useApp();
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'all'>('today');

  const isDark = theme === 'dark';

  // Task filtering logic:
  // "Today": tasks due today OR overdue uncompleted tasks carried over from previous days!
  // "Upcoming": tasks scheduled for future dates
  // "All": all tasks
  const filteredTasks = state.tasks.filter((task) => {
    if (filter === 'all') return true;
    if (filter === 'today') {
      if (!task.dueDate) return true;
      // Carry-over: If it's not completed and due today or earlier in the past, it shows today!
      if (!task.completed) {
        return task.dueDate <= todayLocalStr;
      }
      return task.dueDate === todayLocalStr;
    }
    if (filter === 'upcoming') {
      return task.dueDate && task.dueDate > todayLocalStr;
    }
    return true;
  });

  const pendingTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);
  const totalTasks = state.tasks.length;
  const totalCompleted = state.tasks.filter((t) => t.completed).length;
  const progressPercent = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Work':
        return <Briefcase className="w-3 h-3 stroke-[2] opacity-75" />;
      case 'Personal':
        return <User className="w-3 h-3 stroke-[2] opacity-75" />;
      case 'Money':
        return <DollarSign className="w-3 h-3 stroke-[2] opacity-75" />;
      case 'Health':
        return <Heart className="w-3 h-3 stroke-[2] opacity-75" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col space-y-5 pb-28 pt-2 px-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className={`text-[11px] font-semibold tracking-widest uppercase ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
            One thing at a time
          </p>
          <h1 className={`text-[34px] font-bold tracking-tight leading-tight mt-0.5 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
            Your to-dos
          </h1>
        </div>
        <button
          onClick={() => openModal('add-todo')}
          aria-label="Add to-do"
          className={`w-10 h-10 rounded-full border shadow-soft-sm flex items-center justify-center transition-all active:scale-95 ${
            isDark
              ? 'bg-[#1E2722] border-[#2A3730] text-[#7CC79E] hover:bg-[#25332B]'
              : 'bg-white/80 border-[#E3E8E1] text-[#274E3C] hover:bg-white'
          }`}
        >
          <Plus className="w-5 h-5 stroke-[2]" />
        </button>
      </div>

      {/* Tabs Filter Pill */}
      <div className={`p-1 rounded-full flex items-center max-w-sm ${isDark ? 'bg-[#1E2822]' : 'bg-[#EAEFE8]'}`}>
        <button
          onClick={() => setFilter('today')}
          className={`flex-1 py-1.5 px-3 rounded-full text-[13px] font-medium transition-all ${
            filter === 'today'
              ? isDark ? 'bg-[#274E3C] text-white font-semibold shadow-sm' : 'bg-white text-[#1E2621] shadow-sm font-semibold'
              : isDark ? 'text-[#8EA397] hover:text-[#EDEFEA]' : 'text-[#6F7E73] hover:text-[#1E2621]'
          }`}
        >
          Today · {pendingTasks.length}
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`flex-1 py-1.5 px-3 rounded-full text-[13px] font-medium transition-all ${
            filter === 'upcoming'
              ? isDark ? 'bg-[#274E3C] text-white font-semibold shadow-sm' : 'bg-white text-[#1E2621] shadow-sm font-semibold'
              : isDark ? 'text-[#8EA397] hover:text-[#EDEFEA]' : 'text-[#6F7E73] hover:text-[#1E2621]'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1.5 px-3 rounded-full text-[13px] font-medium transition-all ${
            filter === 'all'
              ? isDark ? 'bg-[#274E3C] text-white font-semibold shadow-sm' : 'bg-white text-[#1E2621] shadow-sm font-semibold'
              : isDark ? 'text-[#8EA397] hover:text-[#EDEFEA]' : 'text-[#6F7E73] hover:text-[#1E2621]'
          }`}
        >
          All tasks
        </button>
      </div>

      {/* Progress Card */}
      <div
        className={`border rounded-[24px] p-5 flex items-center justify-between shadow-soft-sm ${
          isDark ? 'bg-[#1A2620] border-[#26372D]' : 'bg-[#EAF0E8] border-[#DEE8DD]'
        }`}
      >
        <div className="flex-1 pr-3">
          <h4 className={`text-[15px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
            A little progress adds up.
          </h4>
          <p className={`text-[12px] mt-0.5 ${isDark ? 'text-[#8EA597]' : 'text-[#637467]'}`}>
            {totalCompleted} of {totalTasks} done. You've got a good start.
          </p>
          <div className={`w-full h-[3px] rounded-full overflow-hidden mt-3 max-w-[200px] ${isDark ? 'bg-[#27382F]' : 'bg-[#D4E0D2]'}`}>
            <div
              className="bg-[#274E3C] h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className={`text-[32px] font-bold pl-2 tracking-tight ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
          {progressPercent}%
        </div>
      </div>

      {/* Still to do section (With Overdue / Carry-over indicators) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <h3 className={`text-[17px] font-semibold tracking-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
            Still to do
          </h3>
          <span className={`text-[12px] font-medium ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>
            {getTodayShort(nowDate)}
          </span>
        </div>

        <div
          className={`rounded-[26px] p-4 border shadow-soft-sm divide-y ${
            isDark ? 'bg-[#18211D] border-[#243028] divide-[#222E26]' : 'bg-white border-[#ECECE6] divide-[#F2F1ED]'
          }`}
        >
          {pendingTasks.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className={`text-[13px] ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>
                {totalTasks === 0 ? 'No tasks yet. Tap to create one!' : 'All tasks completed! Enjoy your day. ✨'}
              </p>
              {totalTasks === 0 && (
                <button
                  onClick={() => openModal('add-todo')}
                  className="text-[12px] font-semibold text-white bg-[#274E3C] py-1.5 px-3.5 rounded-full shadow-sm"
                >
                  + Add To-Do
                </button>
              )}
            </div>
          ) : (
            pendingTasks.map((task) => {
              const isOverdue = task.dueDate && task.dueDate < todayLocalStr;
              return (
                <div
                  key={task.id}
                  className="py-3 first:pt-1 last:pb-1 flex items-start justify-between group relative"
                >
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0 pr-2">
                    <button
                      onClick={() => toggleTask(task.id)}
                      aria-label={`Mark ${task.title} complete`}
                      className={`mt-0.5 w-[21px] h-[21px] rounded-[7px] border-[1.5px] flex items-center justify-center transition-all active:scale-95 ${
                        task.completed
                          ? 'bg-[#274E3C] border-[#274E3C] text-white'
                          : isDark
                          ? 'border-[#38483E] bg-[#141A17] hover:border-[#7CC79E]'
                          : 'border-[#CBD4CC] bg-white hover:border-[#274E3C]'
                      }`}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5 stroke-[2.5] text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p
                          onClick={() => toggleTask(task.id)}
                          className={`text-[15px] font-medium leading-snug cursor-pointer select-none ${
                            isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'
                          }`}
                        >
                          {task.title}
                        </p>
                        {isOverdue && (
                          <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md flex items-center space-x-0.5">
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>Carryover</span>
                          </span>
                        )}
                      </div>
                      <div className={`flex items-center space-x-1.5 mt-1 text-[12px] ${isDark ? 'text-[#8A9C91]' : 'text-[#7E8A81]'}`}>
                        {getCategoryIcon(task.category)}
                        <span>
                          {task.dueTime} · {task.category}
                        </span>
                        {task.dueDate && task.dueDate !== todayLocalStr && (
                          <span className="opacity-70">({task.dueDate})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteTask(task.id)}
                    title="Delete task"
                    className="text-red-400 hover:text-red-600 p-1 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Already taken care of section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <h3 className={`text-[17px] font-semibold tracking-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
            Already taken care of
          </h3>
          <span className={`text-[12px] font-medium ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>
            {completedTasks.length} completed
          </span>
        </div>

        <div
          className={`rounded-[26px] p-4 border shadow-soft-sm divide-y ${
            isDark ? 'bg-[#18211D] border-[#243028] divide-[#222E26]' : 'bg-white border-[#ECECE6] divide-[#F2F1ED]'
          }`}
        >
          {completedTasks.length === 0 ? (
            <p className={`text-center text-[13px] py-4 ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>
              Completed tasks will show here.
            </p>
          ) : (
            completedTasks.map((task) => (
              <div
                key={task.id}
                className="py-3 first:pt-1 last:pb-1 flex items-start justify-between"
              >
                <div className="flex items-start space-x-3.5 flex-1 min-w-0 pr-2">
                  <button
                    onClick={() => toggleTask(task.id)}
                    aria-label={`Uncheck ${task.title}`}
                    className="mt-0.5 w-[21px] h-[21px] rounded-full bg-[#274E3C] border border-[#274E3C] text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      onClick={() => toggleTask(task.id)}
                      className="text-[15px] font-medium text-[#7E8A81] line-through leading-snug cursor-pointer select-none"
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center space-x-1.5 mt-1 text-[12px] text-[#7E8A81]">
                      {getCategoryIcon(task.category)}
                      <span>
                        {task.dueTime} · {task.category}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  title="Delete task"
                  className="text-red-400 hover:text-red-600 p-1 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Reminders pill notice */}
      <div className={`flex items-center space-x-2 text-[12px] px-1 pt-1 ${isDark ? 'text-[#879B90]' : 'text-[#718075]'}`}>
        <Bell className="w-3.5 h-3.5 stroke-[2] text-[#4E6754]" />
        <span>Reminders on · We'll nudge you at each alarm.</span>
      </div>
    </div>
  );
}
