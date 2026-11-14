'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { EVENT_TYPE_META, EventTypeKey } from '@/lib/schedule';
import { parseLocalDateString, timeStringTo24hInput } from '@/lib/time';
import { CalendarEvent, EventRepeatType } from '@/lib/types';
import { Bell, Calendar, Check, Clock, MapPin, Repeat, X } from 'lucide-react';

function formatTime24To12(time24: string): string {
  if (!time24) return '12:00 PM';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${m} ${ampm}`;
}

function plusOneHourSameDay(time24: string): string {
  if (!time24 || !time24.includes(':')) return '10:00';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return '10:00';
  if (h >= 23) return '23:59';
  return `${String(h + 1).padStart(2, '0')}:${mStr || '00'}`;
}

const REPEAT_OPTIONS: Array<{ id: EventRepeatType; label: string }> = [
  { id: 'none', label: 'No repeat' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'custom', label: 'Custom days' },
];

const WEEKDAY_CHIPS = [
  { dayIndex: 0, short: 'S', label: 'Sunday' },
  { dayIndex: 1, short: 'M', label: 'Monday' },
  { dayIndex: 2, short: 'T', label: 'Tuesday' },
  { dayIndex: 3, short: 'W', label: 'Wednesday' },
  { dayIndex: 4, short: 'T', label: 'Thursday' },
  { dayIndex: 5, short: 'F', label: 'Friday' },
  { dayIndex: 6, short: 'S', label: 'Saturday' },
];

export function EventModal() {
  const {
    closeModal,
    addEvent,
    updateEvent,
    enableNotifications,
    todayLocalStr,
    prefilledTime,
    prefilledDate,
    editingEvent,
    theme,
  } = useApp();

  const isDark = theme === 'dark';
  const isEditing = Boolean(editingEvent);

  const initialDate = editingEvent?.date || prefilledDate || todayLocalStr;
  const initialStart = editingEvent
    ? timeStringTo24hInput(editingEvent.startTime, '09:00')
    : prefilledTime || '09:00';
  const initialEnd = editingEvent
    ? timeStringTo24hInput(editingEvent.endTime, plusOneHourSameDay(initialStart))
    : plusOneHourSameDay(initialStart);

  const [title, setTitle] = useState(editingEvent?.title || '');
  const [location, setLocation] = useState(editingEvent?.location || '');
  const [date, setDate] = useState(initialDate);
  const [allDay, setAllDay] = useState(Boolean(editingEvent?.allDay));
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const [type, setType] = useState<EventTypeKey>(editingEvent?.type || 'routine');
  const [repeat, setRepeat] = useState<EventRepeatType>(editingEvent?.repeat || 'none');
  const [repeatDays, setRepeatDays] = useState<number[]>(() => {
    if (editingEvent?.repeatDays && editingEvent.repeatDays.length > 0) {
      return editingEvent.repeatDays;
    }
    const anchor = parseLocalDateString(initialDate);
    return [anchor ? anchor.getDay() : 1];
  });
  const [remindMe, setRemindMe] = useState(
    editingEvent ? Boolean(editingEvent.remindMe) : true
  );
  const [notes, setNotes] = useState(editingEvent?.notes || '');

  useEffect(() => {
    const nextDate = editingEvent?.date || prefilledDate || todayLocalStr;
    const nextStart = editingEvent
      ? timeStringTo24hInput(editingEvent.startTime, '09:00')
      : prefilledTime || '09:00';
    const nextEnd = editingEvent
      ? timeStringTo24hInput(editingEvent.endTime, plusOneHourSameDay(nextStart))
      : plusOneHourSameDay(nextStart);

    setTitle(editingEvent?.title || '');
    setLocation(editingEvent?.location || '');
    setDate(nextDate);
    setAllDay(Boolean(editingEvent?.allDay));
    setStartTime(nextStart);
    setEndTime(nextEnd);
    setType(editingEvent?.type || 'routine');
    setRepeat(editingEvent?.repeat || 'none');
    setRepeatDays(
      editingEvent?.repeatDays && editingEvent.repeatDays.length > 0
        ? editingEvent.repeatDays
        : [parseLocalDateString(nextDate)?.getDay() ?? 1]
    );
    setRemindMe(editingEvent ? Boolean(editingEvent.remindMe) : true);
    setNotes(editingEvent?.notes || '');
  }, [editingEvent, prefilledDate, prefilledTime, todayLocalStr]);

  const handleStartTimeChange = (nextStart: string) => {
    setStartTime(nextStart);
    if (!nextStart) return;
    if (!endTime || endTime <= nextStart) {
      setEndTime(plusOneHourSameDay(nextStart));
    }
  };

  const toggleCustomDay = (dayIndex: number) => {
    setRepeatDays((prev) => {
      if (prev.includes(dayIndex)) {
        return prev.length > 1 ? prev.filter((d) => d !== dayIndex) : prev;
      }
      return [...prev, dayIndex].sort((a, b) => a - b);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const effectiveRemind = !allDay && remindMe;
    if (effectiveRemind) {
      await enableNotifications();
    }

    const payload: Omit<CalendarEvent, 'id'> = {
      title: title.trim(),
      location: location.trim(),
      date: date || todayLocalStr,
      startTime: allDay ? 'All day' : formatTime24To12(startTime),
      endTime: allDay ? 'All day' : formatTime24To12(endTime <= startTime ? plusOneHourSameDay(startTime) : endTime),
      allDay,
      remindMe: effectiveRemind,
      notes: notes.trim(),
      type,
      repeat,
      repeatDays: repeat === 'custom' ? repeatDays : undefined,
      skippedDates: editingEvent?.skippedDates,
      repeatEndDate: editingEvent?.repeatEndDate,
    };

    if (editingEvent) {
      updateEvent(editingEvent.id, payload);
    } else {
      addEvent(payload);
    }
    closeModal();
  };

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
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-[11px] font-semibold tracking-widest uppercase ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
                A little space for everything
              </p>
              <h2 className={`text-[26px] font-bold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                {isEditing ? 'Edit event' : 'Add event'}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className={`w-9 h-9 rounded-full border flex items-center justify-center ${
                isDark ? 'bg-[#202C25] border-[#2F3F36] text-[#8EA397]' : 'bg-white border-[#E3E8E1] text-[#69796D]'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Category / Type Selector */}
          <div className="space-y-1.5">
            <span className={`text-[12px] font-semibold ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
              Category
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(EVENT_TYPE_META) as EventTypeKey[]).map((key) => {
                const meta = EVENT_TYPE_META[key];
                const selected = type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={`py-2 px-1.5 rounded-2xl border text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                      selected
                        ? 'bg-[#274E3C] border-[#274E3C] text-white shadow-sm'
                        : isDark
                        ? 'bg-[#1B2520] border-[#2A3930] text-[#8EA397] hover:text-white'
                        : 'bg-white border-[#ECECE6] text-[#5B6D61] hover:border-[#C9D6C9]'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: selected ? '#FFFFFF' : meta.dotColor }}
                    />
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title & Location */}
          <div className="space-y-2.5">
            <div className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
              <span className={`text-[11px] block mb-0.5 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
                Event title
              </span>
              <input
                type="text"
                placeholder="e.g. CS Lecture, Lunch with Maya, Gym"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
                className="w-full text-[15px] font-semibold outline-none bg-transparent"
              />
            </div>

            <div className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
              <span className={`text-[11px] flex items-center space-x-1 mb-0.5 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
                <MapPin className="w-3 h-3" />
                <span>Location (optional)</span>
              </span>
              <input
                type="text"
                placeholder="e.g. Room 304, Olive & Rye, Zoom"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-[14px] outline-none bg-transparent"
              />
            </div>
          </div>

          {/* Date & All-Day Switch */}
          <div className="space-y-2.5">
            <div className={`rounded-2xl p-3.5 border flex items-center justify-between gap-3 ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
              <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                <Calendar className="w-4 h-4 text-[#7A877E] shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className={`text-[10px] block ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
                    {repeat === 'none' ? 'Date' : 'Starts on'}
                  </span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-[14px] font-semibold outline-none bg-transparent cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAllDay(!allDay)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all shrink-0 ${
                  allDay
                    ? 'bg-[#274E3C] border-[#274E3C] text-white'
                    : isDark
                    ? 'bg-[#141C17] border-[#2A3930] text-[#8EA397]'
                    : 'bg-[#FAFBF9] border-[#E1E6E0] text-[#5B6D61]'
                }`}
              >
                All day
              </button>
            </div>

            {!allDay && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
                  <span className={`text-[10px] flex items-center space-x-1 mb-1 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
                    <Clock className="w-3 h-3" />
                    <span>Starts</span>
                  </span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="w-full text-[14px] font-semibold outline-none bg-transparent cursor-pointer"
                  />
                </div>

                <div className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
                  <span className={`text-[10px] flex items-center space-x-1 mb-1 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
                    <Clock className="w-3 h-3" />
                    <span>Ends</span>
                  </span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full text-[14px] font-semibold outline-none bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Repeat Schedule */}
          <div className={`rounded-2xl p-3.5 border space-y-2.5 ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
            <div className="flex items-center space-x-1.5">
              <Repeat className={`w-3.5 h-3.5 ${repeat !== 'none' ? 'text-[#274E3C] dark:text-[#7CC79E]' : 'text-[#7A877E]'}`} />
              <span className={`text-[12px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                Repeat
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {REPEAT_OPTIONS.map((opt) => {
                const selected = repeat === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRepeat(opt.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                      selected
                        ? 'bg-[#274E3C] text-white shadow-sm'
                        : isDark
                        ? 'bg-[#151D18] text-[#8EA397] border border-[#28372E]'
                        : 'bg-[#F4F6F3] text-[#5F6F63] hover:bg-[#EAF0E8]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {repeat === 'custom' && (
              <div className="pt-1 flex items-center justify-between gap-1">
                {WEEKDAY_CHIPS.map((d) => {
                  const active = repeatDays.includes(d.dayIndex);
                  return (
                    <button
                      key={d.dayIndex}
                      type="button"
                      onClick={() => toggleCustomDay(d.dayIndex)}
                      aria-label={d.label}
                      title={d.label}
                      className={`w-8 h-8 rounded-full text-[11px] font-bold transition-all ${
                        active
                          ? 'bg-[#274E3C] text-white shadow-sm'
                          : isDark
                          ? 'bg-[#151D18] text-[#8EA397] border border-[#28372E]'
                          : 'bg-[#F4F6F3] text-[#637467] border border-[#E4E8E2]'
                      }`}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#1D2721] border-[#2A3930]' : 'bg-white border-[#ECECE6]'}`}>
            <span className={`text-[11px] block mb-1 ${isDark ? 'text-[#8EA397]' : 'text-[#7E8A81]'}`}>
              Notes (optional)
            </span>
            <textarea
              rows={2}
              placeholder="Agenda, room number, links, or prep notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-[13px] outline-none resize-none leading-relaxed bg-transparent"
            />
          </div>

          {/* Reminder Alarm Toggle */}
          {!allDay && (
            <div className={`rounded-2xl p-3.5 space-y-1 border ${isDark ? 'bg-[#1A2620] border-[#26372D]' : 'bg-[#EAF0E8] border-[#DEE8DD]'}`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center space-x-2 text-[13px] font-semibold ${isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'}`}>
                  <Bell className="w-4 h-4" />
                  <span>Remind me in Tyn</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const next = !remindMe;
                    setRemindMe(next);
                    if (next) {
                      await enableNotifications();
                    }
                  }}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                    remindMe ? 'bg-[#274E3C]' : 'bg-[#CBD6CC]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      remindMe ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-[#8EA597]' : 'text-[#69796D]'}`}>
                {remindMe
                  ? `Fires alert at ${formatTime24To12(startTime)}${repeat !== 'none' ? ' on repeating dates' : ''}.`
                  : 'Notification muted for this event.'}
              </p>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 rounded-[24px] bg-[#274E3C] hover:bg-[#1E3F30] text-white text-[15px] font-semibold tracking-wide shadow-soft transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
          >
            <Check className="w-4 h-4 stroke-[2.2]" />
            <span>{isEditing ? 'Save changes' : 'Save event'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

