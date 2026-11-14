'use client';

import React, { useMemo, useState } from 'react';
import { EVENT_TYPE_META, getEventsForDate } from '@/lib/schedule';
import {
  addDaysToDateString,
  getLocalDateString,
  getMonthCalendarGrid,
  getMonthYearFromDateStr,
  getWeekDaysForDate,
  parseLocalDateString,
} from '@/lib/time';
import { CalendarEvent, MoneyReminder, Task } from '@/lib/types';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';

interface ScheduleCalendarHeaderProps {
  selectedDateStr: string;
  todayLocalStr: string;
  onSelectDate: (dateStr: string) => void;
  events: CalendarEvent[];
  tasks: Task[];
  moneyReminders: MoneyReminder[];
  isDark: boolean;
}

const WEEKDAY_INITIALS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function shiftMonthPreserveDay(dateStr: string, deltaMonths: number): string {
  const parsed = parseLocalDateString(dateStr) || new Date();
  const targetMonthIndex = parsed.getMonth() + deltaMonths;
  const targetYear = parsed.getFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const maxDayInMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const clampedDay = Math.min(parsed.getDate(), maxDayInMonth);
  return getLocalDateString(new Date(targetYear, normalizedMonth, clampedDay));
}

function getDateDotMeta(
  dateStr: string,
  todayLocalStr: string,
  events: CalendarEvent[],
  tasks: Task[],
  moneyReminders: MoneyReminder[]
): { categoryColors: string[]; hasDueWork: boolean } {
  const dayEvents = getEventsForDate(events, dateStr);
  const seenTypes = new Set<string>();
  const categoryColors: string[] = [];

  for (const ev of dayEvents) {
    const evType = ev.type || 'routine';
    if (!seenTypes.has(evType)) {
      seenTypes.add(evType);
      const meta = EVENT_TYPE_META[evType] || EVENT_TYPE_META.routine;
      categoryColors.push(meta.dotColor);
    }
    if (categoryColors.length >= 3) break;
  }

  const isToday = dateStr === todayLocalStr;
  const hasDueTask = tasks.some((task) => {
    if (task.completed || !task.dueDate) return false;
    if (task.dueDate === dateStr) return true;
    return isToday && task.dueDate.toLowerCase() === 'today';
  });

  const hasDueMoney = moneyReminders.some(
    (reminder) => !reminder.settled && reminder.dueDate === dateStr
  );

  return {
    categoryColors,
    hasDueWork: hasDueTask || hasDueMoney,
  };
}

export function ScheduleCalendarHeader({
  selectedDateStr,
  todayLocalStr,
  onSelectDate,
  events,
  tasks,
  moneyReminders,
  isDark,
}: ScheduleCalendarHeaderProps) {
  const [expandedMonth, setExpandedMonth] = useState(false);

  const monthLabel = useMemo(
    () => getMonthYearFromDateStr(selectedDateStr),
    [selectedDateStr]
  );

  const weekDays = useMemo(
    () => getWeekDaysForDate(selectedDateStr, todayLocalStr),
    [selectedDateStr, todayLocalStr]
  );

  const monthCells = useMemo(() => {
    if (!expandedMonth) return [];
    const parsed = parseLocalDateString(selectedDateStr) || new Date();
    return getMonthCalendarGrid(
      parsed.getFullYear(),
      parsed.getMonth(),
      todayLocalStr
    );
  }, [expandedMonth, selectedDateStr, todayLocalStr]);

  const handleStep = (direction: -1 | 1) => {
    if (expandedMonth) {
      onSelectDate(shiftMonthPreserveDay(selectedDateStr, direction));
    } else {
      onSelectDate(addDaysToDateString(selectedDateStr, direction * 7));
    }
  };

  return (
    <div
      className={`rounded-[26px] border p-3.5 shadow-card space-y-3 transition-colors ${
        isDark ? 'bg-[#18211D] border-[#26352C]' : 'bg-white border-[#ECECE6]'
      }`}
    >
      {/* Top Month Navigation Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => handleStep(-1)}
            aria-label={expandedMonth ? 'Previous month' : 'Previous week'}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${
              isDark
                ? 'bg-[#202C25] text-[#B7C7BD] hover:bg-[#293930]'
                : 'bg-[#F4F6F3] text-[#4C5C50] hover:bg-[#E7ECE5]'
            }`}
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
          </button>

          <button
            type="button"
            onClick={() => setExpandedMonth((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold text-[15px] tracking-tight transition-colors truncate ${
              isDark
                ? 'text-[#EDEFEA] hover:bg-[#202C25]'
                : 'text-[#1E2621] hover:bg-[#F4F6F3]'
            }`}
            title={expandedMonth ? 'Collapse to week view' : 'Expand full month'}
          >
            <span className="truncate">{monthLabel}</span>
            {expandedMonth ? (
              <ChevronUp className="w-4 h-4 opacity-70 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 opacity-70 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleStep(1)}
            aria-label={expandedMonth ? 'Next month' : 'Next week'}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${
              isDark
                ? 'bg-[#202C25] text-[#B7C7BD] hover:bg-[#293930]'
                : 'bg-[#F4F6F3] text-[#4C5C50] hover:bg-[#E7ECE5]'
            }`}
          >
            <ChevronRight className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedDateStr !== todayLocalStr && (
            <button
              type="button"
              onClick={() => onSelectDate(todayLocalStr)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95 ${
                isDark
                  ? 'bg-[#223B2E] text-[#8AD8AE] border border-[#2F5240] hover:bg-[#294939]'
                  : 'bg-[#E8F1E7] text-[#274E3C] border border-[#D1E2CF] hover:bg-[#DCE9DB]'
              }`}
            >
              Today
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpandedMonth((prev) => !prev)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
              expandedMonth
                ? 'bg-[#274E3C] text-white border-[#274E3C]'
                : isDark
                ? 'bg-[#1D2721] text-[#A2B6AA] border-[#2C3C33] hover:text-white'
                : 'bg-[#F6F8F5] text-[#5B6B60] border-[#E4EAE2] hover:text-[#1E2621]'
            }`}
          >
            {expandedMonth ? 'Month' : 'Week'}
          </button>
        </div>
      </div>

      {/* Week Strip View */}
      {!expandedMonth ? (
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((item) => {
            const isSelected = item.dateStr === selectedDateStr;
            const dots = getDateDotMeta(
              item.dateStr,
              todayLocalStr,
              events,
              tasks,
              moneyReminders
            );

            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => onSelectDate(item.dateStr)}
                className={`py-2 px-1 rounded-[18px] flex flex-col items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-[#274E3C] text-white shadow-soft'
                    : item.isToday
                    ? isDark
                      ? 'bg-[#203328] text-[#EDEFEA] border border-[#3B6B52]'
                      : 'bg-[#EAF1E8] text-[#1E2621] border border-[#BFD5BF]'
                    : isDark
                    ? 'text-[#A6B7AD] hover:bg-[#202C25]'
                    : 'text-[#5A6A5F] hover:bg-[#F4F6F3]'
                }`}
              >
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    isSelected
                      ? 'text-[#C6DDD0]'
                      : item.isToday
                      ? isDark
                        ? 'text-[#84D1A7]'
                        : 'text-[#274E3C]'
                      : isDark
                      ? 'text-[#7C9184]'
                      : 'text-[#88948B]'
                  }`}
                >
                  {item.day}
                </span>

                <span
                  className={`text-[15px] font-bold mt-1 leading-none ${
                    isSelected
                      ? 'text-white'
                      : isDark
                      ? 'text-[#EDEFEA]'
                      : 'text-[#1E2621]'
                  }`}
                >
                  {item.date}
                </span>

                {/* Category & Due Dots */}
                <div className="flex items-center justify-center gap-0.5 mt-1.5 h-2">
                  {dots.categoryColors.map((color, idx) => (
                    <span
                      key={`${item.dateStr}-cat-${idx}`}
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'ring-1 ring-white/70' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  {dots.hasDueWork && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full bg-amber-400 ${
                        isSelected ? 'ring-1 ring-white/70' : ''
                      }`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Expandable Month Grid View */
        <div className="space-y-1.5 pt-0.5">
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_INITIALS.map((wd) => (
              <span
                key={wd}
                className={`text-[10px] font-semibold uppercase tracking-wider py-0.5 ${
                  isDark ? 'text-[#788D81]' : 'text-[#849087]'
                }`}
              >
                {wd}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((cell) => {
              const isSelected = cell.dateStr === selectedDateStr;
              const dots = getDateDotMeta(
                cell.dateStr,
                todayLocalStr,
                events,
                tasks,
                moneyReminders
              );

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => onSelectDate(cell.dateStr)}
                  className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#274E3C] text-white shadow-sm'
                      : cell.isToday
                      ? isDark
                        ? 'bg-[#203328] text-[#8AD8AE] border border-[#3B6B52]'
                        : 'bg-[#EAF1E8] text-[#274E3C] border border-[#BFD5BF]'
                      : isDark
                      ? 'hover:bg-[#202C25]'
                      : 'hover:bg-[#F4F6F3]'
                  } ${!cell.inCurrentMonth && !isSelected ? 'opacity-35' : ''}`}
                >
                  <span
                    className={`text-[12px] font-semibold leading-tight ${
                      isSelected
                        ? 'text-white'
                        : cell.isToday
                        ? isDark
                          ? 'text-[#8AD8AE]'
                          : 'text-[#274E3C]'
                        : isDark
                        ? 'text-[#E3EBE6]'
                        : 'text-[#1E2621]'
                    }`}
                  >
                    {cell.date}
                  </span>

                  <div className="flex items-center justify-center gap-0.5 mt-1 h-1.5">
                    {dots.categoryColors.slice(0, 2).map((color, idx) => (
                      <span
                        key={`${cell.dateStr}-mcat-${idx}`}
                        className={`w-1 h-1 rounded-full ${
                          isSelected ? 'ring-1 ring-white/60' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    {dots.hasDueWork && (
                      <span className="w-1 h-1 rounded-full bg-amber-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
