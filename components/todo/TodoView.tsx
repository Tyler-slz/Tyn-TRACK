'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  addDaysToDateString,
  compareTasksByUrgency,
  formatDateHumanLabel,
  getTodayShort,
} from '@/lib/time';
import { Category, Task } from '@/lib/types';
import {
  formatTaskRepeatLabel,
  TASK_CATEGORY_LIST,
  TaskCategoryIcon,
} from './taskMeta';
import {
  AlertCircle,
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Flag,
  Plus,
  Repeat,
  Search,
  Trash2,
  X,
} from 'lucide-react';

type TimeFilter = 'today' | 'upcoming' | 'all';
type CategoryFilter = 'All' | Category;

export function TodoView() {
  const {
    state,
    toggleTask,
    addTask,
    updateTask,
    openModal,
    openTaskEditModal,
    deleteTask,
    clearCompletedTasks,
    rescheduleOverdueTasksToday,
    nowDate,
    todayLocalStr,
    theme,
  } = useApp();

  const [filter, setFilter] = useState<TimeFilter>('today');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const isDark = theme === 'dark';

  const isTodayTask = (task: Task) => {
    if (!task.dueDate || task.dueDate.toLowerCase() === 'today') return true;
    if (!task.completed) {
      return task.dueDate <= todayLocalStr;
    }
    return task.dueDate === todayLocalStr || task.completedAt === todayLocalStr;
  };

  const isUpcomingTask = (task: Task) =>
    Boolean(task.dueDate && task.dueDate.toLowerCase() !== 'today' && task.dueDate > todayLocalStr);

  const scopeMatches = (task: Task, scope: TimeFilter) => {
    if (scope === 'today') return isTodayTask(task);
    if (scope === 'upcoming') return isUpcomingTask(task);
    return true;
  };

  const scopeTasks = useMemo(
    () => state.tasks.filter((task) => scopeMatches(task, filter)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.tasks, filter, todayLocalStr]
  );

  const todayPendingCount = useMemo(
    () => state.tasks.filter((t) => !t.completed && isTodayTask(t)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.tasks, todayLocalStr]
  );

  const upcomingPendingCount = useMemo(
    () => state.tasks.filter((t) => !t.completed && isUpcomingTask(t)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.tasks, todayLocalStr]
  );

  const allPendingCount = useMemo(
    () => state.tasks.filter((t) => !t.completed).length,
    [state.tasks]
  );

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopeTasks.filter((task) => {
      if (categoryFilter !== 'All' && task.category !== categoryFilter) return false;
      if (q) {
        const hay = `${task.title} ${task.details || ''} ${task.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scopeTasks, categoryFilter, searchQuery]);

  const pendingTasks = useMemo(
    () =>
      filteredTasks
        .filter((t) => !t.completed)
        .sort((a, b) => compareTasksByUrgency(a, b, todayLocalStr)),
    [filteredTasks, todayLocalStr]
  );

  const completedTasks = useMemo(
    () => filteredTasks.filter((t) => t.completed),
    [filteredTasks]
  );

  const overdueTasks = useMemo(
    () =>
      state.tasks.filter(
        (t) =>
          !t.completed &&
          t.dueDate &&
          t.dueDate.toLowerCase() !== 'today' &&
          t.dueDate < todayLocalStr
      ),
    [state.tasks, todayLocalStr]
  );

  const timedAlarmsCount = useMemo(
    () =>
      state.tasks.filter(
        (t) => !t.completed && t.remindMe && t.dueTime && t.dueTime !== 'Anytime'
      ).length,
    [state.tasks]
  );

  // Scoped progress card tracks active view progress
  const scopedCompletedCount = scopeTasks.filter((t) => t.completed).length;
  const scopedTotalCount = scopeTasks.length;
  const progressPercent =
    scopedTotalCount > 0 ? Math.round((scopedCompletedCount / scopedTotalCount) * 100) : 0;

  const progressCopy = (() => {
    const scopeName = filter === 'today' ? 'today' : filter === 'upcoming' ? 'upcoming' : 'all tasks';
    if (scopedTotalCount === 0) {
      return {
        heading: 'Clear slate.',
        sub: `Nothing queued under ${scopeName} yet.`,
      };
    }
    if (progressPercent === 100) {
      return {
        heading: 'All caught up!',
        sub: `${scopedCompletedCount} of ${scopedTotalCount} done for ${scopeName}.`,
      };
    }
    if (progressPercent === 0) {
      return {
        heading: 'Ready when you are.',
        sub: `${scopedTotalCount} ${scopedTotalCount === 1 ? 'task' : 'tasks'} waiting — start with one.`,
      };
    }
    if (progressPercent >= 50) {
      return {
        heading: 'Great momentum.',
        sub: `${scopedCompletedCount} of ${scopedTotalCount} done — more than halfway.`,
      };
    }
    return {
      heading: 'A little progress adds up.',
      sub: `${scopedCompletedCount} of ${scopedTotalCount} done. Keep going.`,
    };
  })();

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = quickTitle.trim();
    if (!cleaned) return;

    const targetDate =
      filter === 'upcoming' ? addDaysToDateString(todayLocalStr, 1) : todayLocalStr;

    addTask({
      title: cleaned,
      details: '',
      category: categoryFilter !== 'All' ? categoryFilter : 'Personal',
      priority: 'medium',
      dueDate: targetDate,
      dueTime: 'Anytime',
      completed: false,
      remindMe: false,
      repeat: 'none',
    });
    setQuickTitle('');
  };

  return (
    <div className="flex flex-col space-y-5 pb-28 pt-2 px-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p
            className={`text-[11px] font-semibold tracking-widest uppercase ${
              isDark ? 'text-[#879B90]' : 'text-[#7B867E]'
            }`}
          >
            One thing at a time
          </p>
          <h1
            className={`text-[34px] font-bold tracking-tight leading-tight mt-0.5 ${
              isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'
            }`}
          >
            Your to-dos
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          {state.tasks.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowSearch((prev) => {
                  if (prev) setSearchQuery('');
                  return !prev;
                });
              }}
              aria-label="Search tasks"
              className={`w-10 h-10 rounded-full border shadow-soft-sm flex items-center justify-center transition-all active:scale-95 ${
                showSearch
                  ? 'bg-[#274E3C] border-[#274E3C] text-white'
                  : isDark
                  ? 'bg-[#1E2722] border-[#2A3730] text-[#8EA397] hover:bg-[#25332B]'
                  : 'bg-white/80 border-[#E3E8E1] text-[#637367] hover:bg-white'
              }`}
            >
              <Search className="w-4 h-4 stroke-[2]" />
            </button>
          )}
          <button
            type="button"
            onClick={() => openModal('add-todo')}
            aria-label="Add detailed to-do"
            className="w-10 h-10 rounded-full bg-[#274E3C] hover:bg-[#1E3F30] text-white shadow-soft-sm flex items-center justify-center transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Quick Inline Add Bar */}
      <form
        onSubmit={handleQuickAdd}
        className={`rounded-2xl p-1.5 pl-3.5 border shadow-soft-sm flex items-center gap-2 transition-colors ${
          isDark
            ? 'bg-[#18211D] border-[#26352C] focus-within:border-[#4D775F]'
            : 'bg-white border-[#E5E8E2] focus-within:border-[#274E3C]'
        }`}
      >
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder={
            filter === 'upcoming'
              ? 'Quick add for tomorrow...'
              : 'Quick add a to-do for today...'
          }
          aria-label="Quick add to-do"
          className={`flex-1 text-[14px] font-medium outline-none bg-transparent min-w-0 ${
            isDark ? 'text-[#EDEFEA] placeholder-[#687C70]' : 'text-[#1E2621] placeholder-[#8E9B91]'
          }`}
        />
        {quickTitle.trim() ? (
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-[#274E3C] hover:bg-[#1E3F30] text-white text-[12px] font-semibold shrink-0 transition-all active:scale-95"
          >
            Add
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openModal('add-todo')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold shrink-0 transition-colors ${
              isDark
                ? 'bg-[#202E27] text-[#7CC79E] hover:bg-[#27382F]'
                : 'bg-[#EEF3EC] text-[#274E3C] hover:bg-[#E1EBE0]'
            }`}
          >
            + Detailed
          </button>
        )}
      </form>

      {/* Expandable Search Input */}
      {showSearch && (
        <div
          className={`rounded-2xl px-3.5 py-2.5 border flex items-center gap-2 animate-fade-in ${
            isDark ? 'bg-[#18211D] border-[#26352C]' : 'bg-white border-[#ECECE6]'
          }`}
        >
          <Search className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`} />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tasks by title or notes..."
            className="flex-1 text-[13px] outline-none bg-transparent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="p-0.5 opacity-60 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Time Scope Pill + Category Filter Chips */}
      <div className="space-y-2.5">
        <div
          className={`p-1 rounded-full flex items-center max-w-sm ${
            isDark ? 'bg-[#1E2822]' : 'bg-[#EAEFE8]'
          }`}
        >
          {(
            [
              { id: 'today', label: `Today · ${todayPendingCount}` },
              { id: 'upcoming', label: `Upcoming · ${upcomingPendingCount}` },
              { id: 'all', label: `All · ${allPendingCount}` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`flex-1 py-1.5 px-2.5 rounded-full text-[12px] font-medium transition-all ${
                filter === tab.id
                  ? isDark
                    ? 'bg-[#274E3C] text-white font-semibold shadow-sm'
                    : 'bg-white text-[#1E2621] shadow-sm font-semibold'
                  : isDark
                  ? 'text-[#8EA397] hover:text-[#EDEFEA]'
                  : 'text-[#6F7E73] hover:text-[#1E2621]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Filter Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {(['All', ...TASK_CATEGORY_LIST] as const).map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border shrink-0 flex items-center gap-1.5 transition-all ${
                  active
                    ? 'bg-[#274E3C] border-[#274E3C] text-white shadow-sm'
                    : isDark
                    ? 'bg-[#18211D] border-[#26352C] text-[#8EA397] hover:text-white'
                    : 'bg-white border-[#E5E8E2] text-[#637367] hover:text-[#1E2621]'
                }`}
              >
                {cat !== 'All' && <TaskCategoryIcon category={cat} className="w-3 h-3 stroke-[2]" />}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scoped Progress Card */}
      <div
        className={`border rounded-[24px] p-5 flex items-center justify-between shadow-soft-sm ${
          isDark ? 'bg-[#1A2620] border-[#26372D]' : 'bg-[#EAF0E8] border-[#DEE8DD]'
        }`}
      >
        <div className="flex-1 pr-3">
          <h4 className={`text-[15px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
            {progressCopy.heading}
          </h4>
          <p className={`text-[12px] mt-0.5 ${isDark ? 'text-[#8EA597]' : 'text-[#637467]'}`}>
            {progressCopy.sub}
          </p>
          <div
            className={`w-full h-[3px] rounded-full overflow-hidden mt-3 max-w-[200px] ${
              isDark ? 'bg-[#27382F]' : 'bg-[#D4E0D2]'
            }`}
          >
            <div
              className="bg-[#274E3C] dark:bg-[#7CC79E] h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className={`text-[32px] font-bold pl-2 tracking-tight ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
          {progressPercent}%
        </div>
      </div>

      {/* Carryover Quick Reschedule Strip */}
      {filter !== 'upcoming' && overdueTasks.length > 0 && (
        <div
          className={`rounded-2xl px-3.5 py-2.5 border flex items-center justify-between gap-2 ${
            isDark
              ? 'bg-[#231D15] border-[#3F311D] text-amber-200'
              : 'bg-[#FFF8EB] border-[#F3DFBA] text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <CalendarClock className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-[12px] font-semibold truncate">
              {overdueTasks.length} carryover from earlier
            </span>
          </div>
          <button
            type="button"
            onClick={rescheduleOverdueTasksToday}
            className="px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold shrink-0 transition-all active:scale-95"
          >
            Move all to today
          </button>
        </div>
      )}

      {/* Still To Do Section */}
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
            <div className="text-center py-6 space-y-2.5">
              <p className={`text-[13px] ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>
                {searchQuery.trim()
                  ? 'No matching tasks found.'
                  : scopedTotalCount === 0
                  ? 'Nothing here yet. Use Quick Add above or tap + to set an alarm!'
                  : 'All caught up here! Enjoy the breathing room. ✨'}
              </p>
              {scopedTotalCount === 0 && !searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => openModal('add-todo')}
                  className="text-[12px] font-semibold text-white bg-[#274E3C] hover:bg-[#1E3F30] py-1.5 px-3.5 rounded-full shadow-sm"
                >
                  + Add To-Do
                </button>
              )}
            </div>
          ) : (
            pendingTasks.map((task) => {
              const isOverdue =
                Boolean(task.dueDate && task.dueDate.toLowerCase() !== 'today' && task.dueDate < todayLocalStr);
              const repeatLabel = formatTaskRepeatLabel(task.repeat);
              const isHigh = task.priority === 'high';
              const hasTimedAlarm = Boolean(task.remindMe && task.dueTime && task.dueTime !== 'Anytime');
              const showDateChip =
                Boolean(task.dueDate && task.dueDate.toLowerCase() !== 'today' && task.dueDate !== todayLocalStr);

              return (
                <div
                  key={task.id}
                  onClick={() => openTaskEditModal(task)}
                  className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-2 group relative cursor-pointer"
                >
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTask(task.id);
                      }}
                      aria-label={`Mark ${task.title} complete`}
                      className={`mt-0.5 w-[22px] h-[22px] rounded-[7px] border-[1.5px] flex items-center justify-center shrink-0 transition-all active:scale-90 ${
                        isHigh
                          ? isDark
                            ? 'border-amber-400/70 bg-[#141A17] hover:border-amber-300'
                            : 'border-amber-500 bg-white hover:border-amber-600'
                          : isDark
                          ? 'border-[#38483E] bg-[#141A17] hover:border-[#7CC79E]'
                          : 'border-[#CBD4CC] bg-white hover:border-[#274E3C]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 opacity-0" />
                    </button>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p
                          className={`text-[15px] font-medium leading-snug break-words ${
                            isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'
                          }`}
                        >
                          {task.title}
                        </p>
                        {isHigh && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5 shrink-0">
                            <Flag className="w-2.5 h-2.5" />
                            <span>High</span>
                          </span>
                        )}
                        {isOverdue && (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-300 bg-rose-500/15 px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5 shrink-0">
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>Carryover</span>
                          </span>
                        )}
                      </div>

                      {task.details && task.details.trim() && (
                        <p
                          className={`text-[12px] leading-snug line-clamp-2 ${
                            isDark ? 'text-[#9AB0A3]' : 'text-[#5C6B60]'
                          }`}
                        >
                          {task.details}
                        </p>
                      )}

                      <div
                        className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] ${
                          isDark ? 'text-[#8A9C91]' : 'text-[#7E8A81]'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <TaskCategoryIcon category={task.category} />
                          <span>
                            {task.dueTime || 'Anytime'} · {task.category}
                          </span>
                        </span>

                        {showDateChip && (
                          <span className={isOverdue ? 'text-rose-500 dark:text-rose-300 font-medium' : 'opacity-80'}>
                            {formatDateHumanLabel(task.dueDate, todayLocalStr)}
                          </span>
                        )}

                        {repeatLabel && (
                          <span className="inline-flex items-center gap-0.5 text-[#274E3C] dark:text-[#7CC79E] font-medium">
                            <Repeat className="w-2.5 h-2.5" />
                            <span>{repeatLabel}</span>
                          </span>
                        )}

                        {hasTimedAlarm && (
                          <Bell className="w-3 h-3 text-[#274E3C] dark:text-[#7CC79E] opacity-80" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {isOverdue && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTask(task.id, { dueDate: todayLocalStr });
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-95 ${
                          isDark
                            ? 'bg-[#223128] text-[#7CC79E] hover:bg-[#2A3D32]'
                            : 'bg-[#EAF0E8] text-[#274E3C] hover:bg-[#DCE7D8]'
                        }`}
                      >
                        Today
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTask(task.id);
                      }}
                      title="Delete task"
                      aria-label={`Delete ${task.title}`}
                      className="text-red-400 hover:text-red-600 p-1 opacity-55 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Collapsible Completed Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <button
            type="button"
            onClick={() => setShowCompleted((prev) => !prev)}
            className="flex items-center gap-1.5 text-left group"
          >
            <h3 className={`text-[17px] font-semibold tracking-tight ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
              Already taken care of
            </h3>
            <span className={`text-[12px] font-medium ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>
              ({completedTasks.length})
            </span>
            {completedTasks.length > 0 &&
              (showCompleted ? (
                <ChevronUp className={`w-4 h-4 ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`} />
              ) : (
                <ChevronDown className={`w-4 h-4 ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`} />
              ))}
          </button>

          {completedTasks.length > 0 && (
            <button
              type="button"
              onClick={clearCompletedTasks}
              className="text-[11px] font-semibold text-rose-500 hover:underline"
            >
              Clear done
            </button>
          )}
        </div>

        {(showCompleted || (completedTasks.length > 0 && completedTasks.length <= 2 && pendingTasks.length === 0)) &&
          completedTasks.length > 0 && (
            <div
              className={`rounded-[26px] p-4 border shadow-soft-sm divide-y ${
                isDark ? 'bg-[#18211D] border-[#243028] divide-[#222E26]' : 'bg-white border-[#ECECE6] divide-[#F2F1ED]'
              }`}
            >
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => openTaskEditModal(task)}
                  className="py-3 first:pt-1 last:pb-1 flex items-start justify-between cursor-pointer"
                >
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0 pr-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTask(task.id);
                      }}
                      aria-label={`Uncheck ${task.title}`}
                      className="mt-0.5 w-[22px] h-[22px] rounded-full bg-[#274E3C] border border-[#274E3C] text-white flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-[#7E8A81] line-through leading-snug">
                        {task.title}
                      </p>
                      <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-[#7E8A81]">
                        <TaskCategoryIcon category={task.category} />
                        <span>
                          {task.dueTime || 'Anytime'} · {task.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTask(task.id);
                    }}
                    title="Delete task"
                    aria-label={`Delete ${task.title}`}
                    className="text-red-400 hover:text-red-600 p-1 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

        {completedTasks.length === 0 && (
          <p className={`text-[12px] px-0.5 ${isDark ? 'text-[#73867B]' : 'text-[#87938A]'}`}>
            Completed tasks will tuck in here.
          </p>
        )}
      </div>

      {/* Interactive Bottom Reminders Pill */}
      <button
        type="button"
        onClick={() => openModal('settings')}
        className={`flex items-center space-x-2 text-[12px] px-1 pt-1 text-left hover:underline ${
          isDark ? 'text-[#879B90]' : 'text-[#718075]'
        }`}
      >
        <Bell className="w-3.5 h-3.5 stroke-[2] text-[#274E3C] dark:text-[#7CC79E]" />
        <span>
          {timedAlarmsCount > 0
            ? `${timedAlarmsCount} active task ${timedAlarmsCount === 1 ? 'alarm' : 'alarms'} · Tap to check notifications`
            : 'Reminders ready · Tap to configure alarms'}
        </span>
      </button>
    </div>
  );
}
