'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  EVENT_TYPE_META,
  formatRepeatSummary,
  getEventEndMinutes,
  getEventsForDate,
  getEventStartMinutes,
} from '@/lib/schedule';
import { formatDateHumanLabel, formatMinutesTo12h } from '@/lib/time';
import { CalendarEvent, MoneyReminder, Task } from '@/lib/types';
import { useMinuteClock } from '@/lib/useMinuteClock';
import {
  ArrowRight,
  Bell,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  Receipt,
  Repeat,
} from 'lucide-react';
import { DayHourlyGrid } from './DayHourlyGrid';
import { EventDetailSheet } from './EventDetailSheet';
import { ScheduleCalendarHeader } from './ScheduleCalendarHeader';

function formatMoneyAmount(symbol: string, amount: number): string {
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ScheduleView() {
  const {
    state,
    theme,
    todayLocalStr,
    nowDate,
    setActiveTab,
    toggleTask,
    deleteEvent,
    skipEventDate,
    openModalWithTime,
    openEventEditModal,
  } = useApp();

  const isDark = theme === 'dark';
  const symbol = state.financialSummary.currencySymbol || '₱';
  const clockTick = useMinuteClock();

  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayLocalStr);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dueStripExpanded, setDueStripExpanded] = useState(false);
  const [inspectingEvent, setInspectingEvent] = useState<CalendarEvent | null>(null);
  const [nowMinutes, setNowMinutes] = useState<number>(
    () => nowDate.getHours() * 60 + nowDate.getMinutes()
  );

  useEffect(() => {
    const now = new Date();
    setNowMinutes(now.getHours() * 60 + now.getMinutes());
  }, [clockTick, nowDate]);

  const isSelectedToday = selectedDateStr === todayLocalStr;
  const isSelectedPast = selectedDateStr < todayLocalStr;

  const dayEvents = useMemo(
    () => getEventsForDate(state.events, selectedDateStr),
    [state.events, selectedDateStr]
  );

  const allDayEvents = useMemo(
    () => dayEvents.filter((ev) => Boolean(ev.allDay)),
    [dayEvents]
  );

  const timedEvents = useMemo(
    () => dayEvents.filter((ev) => !ev.allDay),
    [dayEvents]
  );

  const dueTasks: Task[] = useMemo(() => {
    return state.tasks.filter((task) => {
      if (task.completed || !task.dueDate) return false;
      if (task.dueDate === selectedDateStr) return true;
      return isSelectedToday && task.dueDate.toLowerCase() === 'today';
    });
  }, [state.tasks, selectedDateStr, isSelectedToday]);

  const dueMoneyReminders: MoneyReminder[] = useMemo(() => {
    return (state.moneyReminders || []).filter(
      (reminder) => !reminder.settled && reminder.dueDate === selectedDateStr
    );
  }, [state.moneyReminders, selectedDateStr]);

  const dueSummaryText = useMemo(() => {
    const parts: string[] = [];
    if (dueTasks.length > 0) {
      parts.push(`${dueTasks.length} ${dueTasks.length === 1 ? 'task' : 'tasks'}`);
    }
    if (dueMoneyReminders.length > 0) {
      parts.push(
        `${dueMoneyReminders.length} ${dueMoneyReminders.length === 1 ? 'bill/IOU' : 'bills/IOUs'}`
      );
    }
    return parts.join(' · ');
  }, [dueTasks.length, dueMoneyReminders.length]);

  const nowInsertIndex = useMemo(() => {
    if (!isSelectedToday || timedEvents.length === 0) return -1;
    const idx = timedEvents.findIndex(
      (ev) => getEventEndMinutes(ev) > nowMinutes
    );
    return idx === -1 ? timedEvents.length : idx;
  }, [isSelectedToday, timedEvents, nowMinutes]);

  const humanDayLabel = formatDateHumanLabel(selectedDateStr, todayLocalStr);

  return (
    <div className="flex flex-col space-y-5 pb-28 pt-2 px-4">
      {/* Page Title & Quick Add */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p
            className={`text-[11px] font-semibold tracking-widest uppercase ${
              isDark ? 'text-[#879B90]' : 'text-[#7B867E]'
            }`}
          >
            Daily rhythm
          </p>
          <h1
            className={`text-[34px] font-bold tracking-tight leading-tight mt-0.5 ${
              isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'
            }`}
          >
            Schedule
          </h1>
        </div>

        <button
          type="button"
          onClick={() => openModalWithTime('add-event', '09:00', selectedDateStr)}
          className="px-3.5 py-2.5 rounded-full bg-[#274E3C] hover:bg-[#1E3F30] text-white text-[13px] font-semibold shadow-soft transition-all active:scale-95 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[2.4]" />
          <span>Add</span>
        </button>
      </div>

      {/* Expandable Week / Month Calendar Header */}
      <ScheduleCalendarHeader
        selectedDateStr={selectedDateStr}
        todayLocalStr={todayLocalStr}
        onSelectDate={setSelectedDateStr}
        events={state.events}
        tasks={state.tasks}
        moneyReminders={state.moneyReminders || []}
        isDark={isDark}
      />

      {/* Collapsible Due Tasks & Bills Strip */}
      {(dueTasks.length > 0 || dueMoneyReminders.length > 0) && (
        <div
          className={`rounded-[22px] border overflow-hidden transition-colors ${
            isDark
              ? 'bg-[#211E17] border-[#3C3321]'
              : 'bg-[#FFF9EE] border-[#F2E2BD]'
          }`}
        >
          <button
            type="button"
            onClick={() => setDueStripExpanded((prev) => !prev)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span
                className={`text-[12px] font-semibold truncate ${
                  isDark ? 'text-amber-200' : 'text-amber-900'
                }`}
              >
                Due on {humanDayLabel}: {dueSummaryText}
              </span>
            </div>
            {dueStripExpanded ? (
              <ChevronUp
                className={`w-4 h-4 shrink-0 ${
                  isDark ? 'text-amber-300' : 'text-amber-700'
                }`}
              />
            ) : (
              <ChevronDown
                className={`w-4 h-4 shrink-0 ${
                  isDark ? 'text-amber-300' : 'text-amber-700'
                }`}
              />
            )}
          </button>

          {dueStripExpanded && (
            <div
              className={`px-3.5 pb-3 pt-1 space-y-2 border-t ${
                isDark ? 'border-[#332B1C]' : 'border-[#F3E6C8]'
              }`}
            >
              {dueTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className={`w-full rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-left transition-colors ${
                    isDark
                      ? 'bg-[#191F1B] hover:bg-[#202923] text-[#E6ECE8]'
                      : 'bg-white hover:bg-[#F7FAF6] text-[#1E2621]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isDark ? 'border-[#547563]' : 'border-[#9FB5A4]'
                      }`}
                    >
                      <Check className="w-2.5 h-2.5 opacity-0" />
                    </span>
                    <span className="text-[13px] font-medium truncate">
                      {task.title}
                    </span>
                  </div>
                  {task.dueTime && (
                    <span
                      className={`text-[11px] shrink-0 ${
                        isDark ? 'text-[#879B90]' : 'text-[#6D7970]'
                      }`}
                    >
                      {task.dueTime}
                    </span>
                  )}
                </button>
              ))}

              {dueMoneyReminders.map((reminder) => (
                <button
                  key={reminder.id}
                  type="button"
                  onClick={() => setActiveTab('money')}
                  className={`w-full rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-left transition-colors ${
                    isDark
                      ? 'bg-[#191F1B] hover:bg-[#202923] text-[#E6ECE8]'
                      : 'bg-white hover:bg-[#F7FAF6] text-[#1E2621]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Receipt
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isDark ? 'text-amber-300' : 'text-amber-700'
                      }`}
                    />
                    <span className="text-[13px] font-medium truncate">
                      {reminder.title}
                      {reminder.person ? ` · ${reminder.person}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[12px] font-bold tabular-nums ${
                        reminder.kind === 'owed'
                          ? isDark
                            ? 'text-emerald-300'
                            : 'text-emerald-700'
                          : isDark
                          ? 'text-amber-300'
                          : 'text-amber-800'
                      }`}
                    >
                      {formatMoneyAmount(symbol, reminder.amount)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All-Day Event Banner */}
      {allDayEvents.length > 0 && (
        <div
          className={`rounded-[20px] border px-3.5 py-2.5 space-y-2 ${
            isDark ? 'bg-[#18211D] border-[#26352C]' : 'bg-white border-[#ECECE6]'
          }`}
        >
          <span
            className={`text-[10px] font-bold uppercase tracking-wider block ${
              isDark ? 'text-[#849B8E]' : 'text-[#7B887E]'
            }`}
          >
            All-Day Events
          </span>
          <div className="flex flex-wrap gap-1.5">
            {allDayEvents.map((ev) => {
              const meta = EVENT_TYPE_META[ev.type || 'routine'] || EVENT_TYPE_META.routine;
              return (
                <button
                  key={`${ev.id}-allday-${selectedDateStr}`}
                  type="button"
                  onClick={() => setInspectingEvent(ev)}
                  className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                    isDark
                      ? `${meta.darkBg} ${meta.darkBorder} ${meta.darkText}`
                      : `${meta.lightBg} ${meta.lightBorder} ${meta.lightText}`
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: meta.dotColor }}
                  />
                  <span className="truncate max-w-[200px]">{ev.title}</span>
                  {ev.repeat && ev.repeat !== 'none' && (
                    <Repeat className="w-3 h-3 opacity-70 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Header & Grid / List Toggle */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <h2
            className={`text-[16px] font-bold tracking-tight truncate ${
              isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'
            }`}
          >
            {humanDayLabel}
          </h2>
          <p
            className={`text-[11px] ${
              isDark ? 'text-[#849A8D]' : 'text-[#738076]'
            }`}
          >
            {dayEvents.length === 0
              ? 'Open day · nothing scheduled'
              : `${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'}`}
          </p>
        </div>

        <div
          className={`p-1 rounded-full border flex items-center gap-0.5 shrink-0 ${
            isDark
              ? 'bg-[#18211D] border-[#26352C]'
              : 'bg-[#EEF2EC] border-[#E0E7DE]'
          }`}
        >
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'grid'
                ? 'bg-[#274E3C] text-white shadow-sm'
                : isDark
                ? 'text-[#9BB0A3] hover:text-white'
                : 'text-[#5D6D62] hover:text-[#1E2621]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'list'
                ? 'bg-[#274E3C] text-white shadow-sm'
                : isDark
                ? 'text-[#9BB0A3] hover:text-white'
                : 'text-[#5D6D62] hover:text-[#1E2621]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Hourly Day-Block Grid View */}
      {viewMode === 'grid' ? (
        <DayHourlyGrid
          selectedDateStr={selectedDateStr}
          isToday={isSelectedToday}
          isPastDay={isSelectedPast}
          nowMinutes={nowMinutes}
          timedEvents={timedEvents}
          isDark={isDark}
          onSlotClick={(time24) =>
            openModalWithTime('add-event', time24, selectedDateStr)
          }
          onEventClick={(ev) => setInspectingEvent(ev)}
        />
      ) : (
        /* Chronological List View */
        <div className="space-y-2.5">
          {timedEvents.length === 0 ? (
            <div
              className={`rounded-[26px] border border-dashed p-6 text-center space-y-3 ${
                isDark
                  ? 'bg-[#18211D] border-[#2A3B31]'
                  : 'bg-white/80 border-[#D5DFD3]'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-2xl mx-auto flex items-center justify-center ${
                  isDark
                    ? 'bg-[#203328] text-[#7CC79E]'
                    : 'bg-[#EAF1E8] text-[#274E3C]'
                }`}
              >
                <CalendarPlus className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p
                  className={`text-[15px] font-semibold ${
                    isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'
                  }`}
                >
                  {allDayEvents.length > 0
                    ? `No timed events for ${humanDayLabel}`
                    : `Nothing scheduled for ${humanDayLabel}`}
                </p>
                <p
                  className={`text-[12px] ${
                    isDark ? 'text-[#849A8D]' : 'text-[#738076]'
                  }`}
                >
                  Tap below or switch to Grid to pick an exact hour.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  openModalWithTime('add-event', '09:00', selectedDateStr)
                }
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#274E3C] hover:bg-[#1E3F30] text-white text-[13px] font-semibold shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule event</span>
              </button>
            </div>
          ) : (
            timedEvents.map((ev, index) => {
              const meta = EVENT_TYPE_META[ev.type || 'routine'] || EVENT_TYPE_META.routine;
              const startMin = getEventStartMinutes(ev);
              const endMin = getEventEndMinutes(ev);
              const isHappeningNow =
                isSelectedToday && startMin <= nowMinutes && nowMinutes < endMin;
              const isPast =
                isSelectedPast || (isSelectedToday && endMin <= nowMinutes);
              const repeatText = formatRepeatSummary(ev);

              return (
                <React.Fragment key={`${ev.id}-list-${selectedDateStr}`}>
                  {isSelectedToday && nowInsertIndex === index && (
                    <div className="flex items-center gap-2 py-1 px-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <div className="flex-1 h-[1.5px] bg-rose-500/80" />
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider shrink-0">
                        Now · {formatMinutesTo12h(nowMinutes)}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setInspectingEvent(ev)}
                    className={`w-full rounded-[22px] border p-4 text-left flex items-stretch gap-3 transition-all active:scale-[0.99] shadow-card ${
                      isDark
                        ? 'bg-[#18211D] border-[#26352C] hover:bg-[#1E2924]'
                        : 'bg-white border-[#ECECE6] hover:bg-[#FAFBF9]'
                    } ${
                      isHappeningNow
                        ? isDark
                          ? 'ring-2 ring-[#6AC492]'
                          : 'ring-2 ring-[#274E3C]'
                        : ''
                    } ${isPast && !isHappeningNow ? 'opacity-65' : ''}`}
                  >
                    <div
                      className={`w-1 rounded-full shrink-0 ${meta.accentBar}`}
                    />

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`text-[12px] font-semibold tabular-nums ${
                              isDark ? 'text-[#8FD1AC]' : 'text-[#274E3C]'
                            }`}
                          >
                            {ev.startTime} – {ev.endTime}
                          </span>
                          {isHappeningNow && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-[#274E3C] text-white">
                              Now
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {ev.repeat && ev.repeat !== 'none' && (
                            <Repeat
                              className={`w-3.5 h-3.5 ${
                                isDark ? 'text-[#849B8E]' : 'text-[#6D7B71]'
                              }`}
                            />
                          )}
                          {ev.remindMe && (
                            <Bell
                              className={`w-3.5 h-3.5 ${
                                isDark ? 'text-[#849B8E]' : 'text-[#6D7B71]'
                              }`}
                            />
                          )}
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              isDark
                                ? `${meta.darkBg} ${meta.darkBorder} ${meta.darkText}`
                                : `${meta.lightBg} ${meta.lightBorder} ${meta.lightText}`
                            }`}
                          >
                            {meta.label}
                          </span>
                        </div>
                      </div>

                      <h3
                        className={`text-[15px] font-semibold leading-snug truncate ${
                          isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'
                        }`}
                      >
                        {ev.title}
                      </h3>

                      {(ev.location || repeatText || ev.notes) && (
                        <div
                          className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] ${
                            isDark ? 'text-[#879B90]' : 'text-[#6E7A71]'
                          }`}
                        >
                          {ev.location && (
                            <span className="inline-flex items-center gap-1 truncate max-w-full">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{ev.location}</span>
                            </span>
                          )}
                          {repeatText && (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 shrink-0 opacity-75" />
                              <span>{repeatText}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                </React.Fragment>
              );
            })
          )}

          {isSelectedToday &&
            timedEvents.length > 0 &&
            nowInsertIndex === timedEvents.length && (
              <div className="flex items-center gap-2 py-1 px-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <div className="flex-1 h-[1.5px] bg-rose-500/80" />
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider shrink-0">
                  Now · {formatMinutesTo12h(nowMinutes)}
                </span>
              </div>
            )}
        </div>
      )}

      {/* Event Detail Bottom Sheet */}
      <EventDetailSheet
        event={inspectingEvent}
        selectedDateStr={selectedDateStr}
        todayLocalStr={todayLocalStr}
        isDark={isDark}
        onClose={() => setInspectingEvent(null)}
        onEdit={(ev) => openEventEditModal(ev, selectedDateStr)}
        onSkipDate={skipEventDate}
        onDelete={deleteEvent}
      />
    </div>
  );
}
