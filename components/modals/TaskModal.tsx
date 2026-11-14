'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  addDaysToDateString,
  formatTime24To12,
  timeStringTo24hInput,
} from '@/lib/time';
import { Category, Task, TaskPriority, TaskRepeatType } from '@/lib/types';
import {
  TASK_CATEGORY_LIST,
  TASK_CATEGORY_META,
} from '@/components/todo/taskMeta';
import {
  Bell,
  BellOff,
  Calendar,
  Check,
  Clock,
  Flag,
  Repeat,
  Trash2,
  X,
} from 'lucide-react';

const PRIORITY_OPTIONS: Array<{ id: TaskPriority; label: string }> = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Normal' },
  { id: 'high', label: 'High Focus' },
];

const REPEAT_OPTIONS: Array<{ id: TaskRepeatType; label: string }> = [
  { id: 'none', label: 'No repeat' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekly', label: 'Weekly' },
];

const TIME_PRESETS = [
  { label: '9:00 AM', value: '09:00' },
  { label: '2:00 PM', value: '14:00' },
  { label: '7:00 PM', value: '19:00' },
];

function normalizeTaskRepeat(repeat?: string): TaskRepeatType {
  if (repeat === 'daily' || repeat === 'weekdays' || repeat === 'weekly') {
    return repeat;
  }
  return 'none';
}

export function TaskModal() {
  const {
    closeModal,
    addTask,
    updateTask,
    deleteTask,
    enableNotifications,
    editingTask,
    todayLocalStr,
    theme,
  } = useApp();

  const isDark = theme === 'dark';
  const isEditing = Boolean(editingTask);

  const initialTimed = editingTask
    ? Boolean(editingTask.dueTime && editingTask.dueTime !== 'Anytime')
    : true;

  const [title, setTitle] = useState(editingTask?.title || '');
  const [details, setDetails] = useState(editingTask?.details || '');
  const [category, setCategory] = useState<Category>(editingTask?.category || 'Work');
  const [priority, setPriority] = useState<TaskPriority>(editingTask?.priority || 'medium');
  const [dueDate, setDueDate] = useState(
    editingTask?.dueDate && editingTask.dueDate.toLowerCase() !== 'today'
      ? editingTask.dueDate
      : todayLocalStr
  );
  const [hasTime, setHasTime] = useState(initialTimed);
  const [dueTime, setDueTime] = useState(
    initialTimed && editingTask ? timeStringTo24hInput(editingTask.dueTime, '11:00') : '11:00'
  );
  const [repeat, setRepeat] = useState<TaskRepeatType>(normalizeTaskRepeat(editingTask?.repeat));
  const [remindMe, setRemindMe] = useState(
    editingTask ? Boolean(editingTask.remindMe && initialTimed) : true
  );

  useEffect(() => {
    const timed = editingTask
      ? Boolean(editingTask.dueTime && editingTask.dueTime !== 'Anytime')
      : true;
    setTitle(editingTask?.title || '');
    setDetails(editingTask?.details || '');
    setCategory(editingTask?.category || 'Work');
    setPriority(editingTask?.priority || 'medium');
    setDueDate(
      editingTask?.dueDate && editingTask.dueDate.toLowerCase() !== 'today'
        ? editingTask.dueDate
        : todayLocalStr
    );
    setHasTime(timed);
    setDueTime(
      timed && editingTask ? timeStringTo24hInput(editingTask.dueTime, '11:00') : '11:00'
    );
    setRepeat(normalizeTaskRepeat(editingTask?.repeat));
    setRemindMe(editingTask ? Boolean(editingTask.remindMe && timed) : true);
  }, [editingTask, todayLocalStr]);

  const handleToggleTimeMode = (timed: boolean) => {
    setHasTime(timed);
    if (!timed) {
      setRemindMe(false);
    } else if (!editingTask) {
      setRemindMe(true);
    }
  };

  const handleToggleRemind = async () => {
    if (!hasTime) return;
    const next = !remindMe;
    setRemindMe(next);
    if (next) {
      await enableNotifications();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const effectiveRemind = hasTime && remindMe;
    if (effectiveRemind) {
      await enableNotifications();
    }

    const payload: Omit<Task, 'id'> = {
      title: title.trim(),
      details: details.trim(),
      category,
      priority,
      dueDate: dueDate || todayLocalStr,
      dueTime: hasTime ? formatTime24To12(dueTime, '11:00 AM') : 'Anytime',
      completed: editingTask ? editingTask.completed : false,
      completedAt: editingTask?.completedAt,
      remindMe: effectiveRemind,
      repeat,
    };

    if (editingTask) {
      updateTask(editingTask.id, payload);
    } else {
      addTask(payload);
    }
    closeModal();
  };

  const handleDelete = () => {
    if (!editingTask) return;
    deleteTask(editingTask.id);
    closeModal();
  };

  const datePresets = [
    { label: 'Today', value: todayLocalStr },
    { label: 'Tomorrow', value: addDaysToDateString(todayLocalStr, 1) },
    { label: 'Next week', value: addDaysToDateString(todayLocalStr, 7) },
  ];

  return (
    <div
      onClick={closeModal}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-[36px] sm:rounded-[36px] p-6 safe-modal-bottom shadow-2xl border transition-all ${
          isDark
            ? 'bg-[#151D18] border-[#25332B] text-[#EDEFEA]'
            : 'bg-[#FAF8F5] border-[#ECECE6] text-[#1E2621]'
        }`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p
                className={`text-[11px] font-semibold tracking-widest uppercase ${
                  isDark ? 'text-[#879B90]' : 'text-[#7B867E]'
                }`}
              >
                One thing at a time
              </p>
              <h2 className={`text-[26px] font-bold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                {isEditing ? 'Edit to-do' : 'Add to-do'}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close modal"
              className={`w-9 h-9 rounded-full border flex items-center justify-center ${
                isDark ? 'bg-[#202C25] border-[#2F3F36] text-[#8EA397]' : 'bg-white border-[#E3E8E1] text-[#69796D]'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Title & Notes */}
          <div className="space-y-2.5">
            <div
              className={`rounded-2xl p-3.5 border ${
                isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
              }`}
            >
              <span className={`text-[11px] block mb-0.5 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
                Task title
              </span>
              <input
                type="text"
                placeholder="e.g. Call dentist, finish slides, drink 2L water"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus={!isEditing}
                className="w-full text-[15px] font-semibold outline-none bg-transparent"
              />
            </div>

            <div
              className={`rounded-2xl p-3.5 border ${
                isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
              }`}
            >
              <span className={`text-[11px] block mb-0.5 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
                Notes (optional)
              </span>
              <textarea
                rows={2}
                placeholder="Add quick details, checklist items, or context..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full text-[13px] outline-none resize-none leading-relaxed bg-transparent"
              />
            </div>
          </div>

          {/* Category (Work, Personal, Money, Health) */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold">Category</label>
            <div className="grid grid-cols-4 gap-1.5">
              {TASK_CATEGORY_LIST.map((id) => {
                const Icon = TASK_CATEGORY_META[id].icon;
                const isSelected = category === id;
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setCategory(id)}
                    className={`py-2.5 px-2 rounded-2xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-[#274E3C] text-white shadow-sm'
                        : isDark
                        ? 'bg-[#1B2520] text-[#8AA093] border border-[#2A3930]'
                        : 'bg-white text-[#6F7E73] border border-[#ECECE6]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-[#7A877E]" />
              <span>Priority</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {PRIORITY_OPTIONS.map((opt) => {
                const selected = priority === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPriority(opt.id)}
                    className={`py-2 rounded-2xl text-[12px] font-semibold border transition-all ${
                      selected
                        ? opt.id === 'high'
                          ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                          : 'bg-[#274E3C] border-[#274E3C] text-white shadow-sm'
                        : isDark
                        ? 'bg-[#1B2520] border-[#2A3930] text-[#8AA093]'
                        : 'bg-white border-[#ECECE6] text-[#6F7E73]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date + Quick Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-semibold">Due Date</label>
              <div className="flex items-center gap-1.5">
                {datePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDueDate(preset.value)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                      dueDate === preset.value
                        ? 'bg-[#274E3C] border-[#274E3C] text-white'
                        : isDark
                        ? 'bg-[#1D2721] border-[#2A3930] text-[#8EA397]'
                        : 'bg-white border-[#E3E8E1] text-[#5B6D61]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`rounded-2xl p-3.5 border flex items-center space-x-3 ${
                isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
              }`}
            >
              <Calendar className="w-4 h-4 text-[#7A877E] shrink-0" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-[14px] font-semibold outline-none bg-transparent w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Time Mode: Anytime vs Set Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-semibold">Time</label>
              <div
                className={`p-0.5 rounded-full flex items-center text-[11px] font-semibold ${
                  isDark ? 'bg-[#1E2822]' : 'bg-[#EAEFE8]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggleTimeMode(false)}
                  className={`px-3 py-1 rounded-full transition-all ${
                    !hasTime
                      ? 'bg-[#274E3C] text-white shadow-sm'
                      : isDark
                      ? 'text-[#8EA397]'
                      : 'text-[#6F7E73]'
                  }`}
                >
                  Anytime
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleTimeMode(true)}
                  className={`px-3 py-1 rounded-full transition-all ${
                    hasTime
                      ? 'bg-[#274E3C] text-white shadow-sm'
                      : isDark
                      ? 'text-[#8EA397]'
                      : 'text-[#6F7E73]'
                  }`}
                >
                  Set time
                </button>
              </div>
            </div>

            {hasTime && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {TIME_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setDueTime(preset.value)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                        dueTime === preset.value
                          ? 'bg-[#274E3C] border-[#274E3C] text-white'
                          : isDark
                          ? 'bg-[#1D2721] border-[#2A3930] text-[#8EA397]'
                          : 'bg-white border-[#E3E8E1] text-[#5B6D61]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div
                  className={`rounded-2xl p-3.5 border flex items-center space-x-3 ${
                    isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
                  }`}
                >
                  <Clock className="w-4 h-4 text-[#7A877E] shrink-0" />
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="text-[14px] font-semibold outline-none bg-transparent w-full cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Repeat Selector */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-[#7A877E]" />
              <span>Repeat</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REPEAT_OPTIONS.map((opt) => {
                const selected = repeat === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRepeat(opt.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                      selected
                        ? 'bg-[#274E3C] border-[#274E3C] text-white shadow-sm'
                        : isDark
                        ? 'bg-[#1B2520] border-[#2A3930] text-[#8EA397]'
                        : 'bg-white border-[#ECECE6] text-[#5B6D61]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alarm Reminder Toggle */}
          <div
            className={`rounded-2xl p-4 space-y-1.5 border ${
              isDark ? 'bg-[#1A2620] border-[#26372D]' : 'bg-[#EAF0E8] border-[#DEE8DD]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex items-center space-x-2 text-[14px] font-semibold ${
                  hasTime ? (isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]') : 'opacity-50'
                }`}
              >
                {hasTime && remindMe ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                <span>Remind me with alarm chime</span>
              </div>
              <button
                type="button"
                disabled={!hasTime}
                onClick={handleToggleRemind}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                  !hasTime
                    ? 'bg-gray-400/40 cursor-not-allowed'
                    : remindMe
                    ? 'bg-[#274E3C]'
                    : 'bg-[#CBD6CC]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    hasTime && remindMe ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className={`text-[11px] ${isDark ? 'text-[#8EA597]' : 'text-[#69796D]'}`}>
              {hasTime
                ? remindMe
                  ? `Alarm rings at ${formatTime24To12(dueTime, '11:00 AM')}.`
                  : 'Alarm off for this task.'
                : 'Select "Set time" above to schedule an alarm.'}
            </p>
          </div>

          {/* Primary Save Button */}
          <button
            type="submit"
            className="w-full py-4 rounded-[24px] bg-[#274E3C] hover:bg-[#1E3F30] text-white text-[15px] font-semibold tracking-wide shadow-soft transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
          >
            <Check className="w-4 h-4 stroke-[2.2]" />
            <span>{isEditing ? 'Save changes' : 'Save to-do'}</span>
          </button>

          {/* Delete button when editing */}
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              className="w-full py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold text-[13px] flex items-center justify-center space-x-2 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete to-do</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
