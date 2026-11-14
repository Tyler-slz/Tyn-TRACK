'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { getCurrentWeekDays, getTodayShort, getLocalDateString } from '@/lib/time';
import { getGoogleCalendarUrl, downloadIcsFile } from '@/lib/calendar';
import { useMinuteClock } from '@/lib/useMinuteClock';
import {
  Plus,
  Moon,
  Trash2,
  Calendar as CalendarIcon,
  Bell,
  CalendarPlus,
  ExternalLink
} from 'lucide-react';

export function ScheduleView() {
  const { state, openModalWithTime, currentMonthYear, nowDate, todayLocalStr, deleteEvent, theme } = useApp();
  const currentTimeStr = useMinuteClock();
  const isDark = theme === 'dark';

  const currentDays = getCurrentWeekDays(nowDate);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayLocalStr);

  // Filter events dynamically strictly from user's state
  const dayEvents = state.events.filter((e) => e.date === selectedDateStr);

  const hourSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

  const formatSlotLabel = (slot: string) => {
    const h = parseInt(slot.split(':')[0], 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH} ${ampm}`;
  };

  return (
    <div className="flex flex-col space-y-5 pb-28 pt-2 px-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className={`text-[11px] font-semibold tracking-widest uppercase ${isDark ? 'text-[#879B90]' : 'text-[#7B867E]'}`}>
            A little space for everything
          </p>
          <h1 className={`text-[34px] font-bold tracking-tight leading-tight mt-0.5 ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
            Your day
          </h1>
        </div>
        <button
          onClick={() => openModalWithTime('add-event', '12:00')}
          aria-label="Add event"
          className={`w-10 h-10 rounded-full border shadow-soft-sm flex items-center justify-center transition-all active:scale-95 ${
            isDark
              ? 'bg-[#1E2722] border-[#2A3730] text-[#7CC79E] hover:bg-[#25332B]'
              : 'bg-white/80 border-[#E3E8E1] text-[#274E3C] hover:bg-white'
          }`}
        >
          <Plus className="w-5 h-5 stroke-[2]" />
        </button>
      </div>

      {/* Month header */}
      <div className="flex items-center justify-between px-1">
        <span className={`text-[15px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
          {currentMonthYear}
        </span>
      </div>

      {/* Interactive Week Day Pills (Highlights local today) */}
      <div
        className={`grid grid-cols-7 gap-1 text-center rounded-[26px] p-2 border shadow-soft-sm ${
          isDark ? 'bg-[#18211D] border-[#243028]' : 'bg-white border-[#ECECE6]'
        }`}
      >
        {currentDays.map((item) => {
          const isActive = item.dateStr === selectedDateStr;
          return (
            <button
              key={item.dateStr}
              onClick={() => setSelectedDateStr(item.dateStr)}
              className={`flex flex-col items-center py-2.5 rounded-[20px] transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#274E3C] text-white shadow-soft-sm'
                  : isDark
                  ? 'text-[#8AA093] hover:bg-[#202C26]'
                  : 'text-[#67776B] hover:bg-[#F3F6F2]'
              }`}
            >
              <span className={`text-[11px] font-medium ${isActive ? 'text-[#BFD6C7]' : isDark ? 'text-[#6C8074]' : 'text-[#8E9B91]'}`}>
                {item.day}
              </span>
              <span className="text-[15px] font-bold mt-1">{item.date}</span>
            </button>
          );
        })}
      </div>

      {/* Selected day summary row */}
      <div className="flex items-center justify-between px-1 pt-1">
        <span className={`text-[14px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
          {selectedDateStr === todayLocalStr ? getTodayShort(nowDate) : selectedDateStr}
        </span>
        <span className={`text-[12px] ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>
          {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      {/* Schedule Timeline */}
      <div
        className={`rounded-[28px] p-4 border shadow-soft-sm space-y-4 ${
          isDark ? 'bg-[#18211D] border-[#243028]' : 'bg-white border-[#ECECE6]'
        }`}
      >
        {/* Real-time Indicator Line if viewing today */}
        {selectedDateStr === todayLocalStr && (
          <div className="flex items-center space-x-2 my-1">
            <span suppressHydrationWarning className="text-[11px] font-bold text-[#274E3C] w-12">{currentTimeStr}</span>
            <div className="flex-1 h-[2px] bg-[#274E3C] rounded-full" />
          </div>
        )}

        {dayEvents.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${isDark ? 'bg-[#212E27] text-[#7CC79E]' : 'bg-[#EBF2EA] text-[#274E3C]'}`}>
              <CalendarIcon className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <p className={`text-[15px] font-semibold ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                No events scheduled
              </p>
              <p className={`text-[12px] mt-0.5 ${isDark ? 'text-[#7E9387]' : 'text-[#7B8A80]'}`}>
                Tap any hour slot below to set up an event.
              </p>
            </div>
          </div>
        ) : (
          dayEvents.map((event) => (
            <div key={event.id} className="flex items-start text-[12px] group">
              <span className={`w-14 pt-1 font-medium ${isDark ? 'text-[#879B90]' : 'text-[#9BA59D]'}`}>
                {event.startTime}
              </span>
              <div
                className={`flex-1 rounded-2xl p-3.5 border shadow-sm flex items-start justify-between transition-all ${
                  isDark
                    ? 'bg-[#1F2B24] border-[#2A3A31]'
                    : 'bg-[#EFF5ED] border-[#DEE8DD]'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-1.5">
                    <p className={`font-semibold text-[14px] ${isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'}`}>
                      {event.title}
                    </p>
                    {event.remindMe && (
                      <span className="text-[10px] py-0.5 px-1.5 rounded-full bg-[#274E3C]/10 text-[#274E3C] dark:text-[#7CC79E] font-medium flex items-center space-x-0.5">
                        <Bell className="w-2.5 h-2.5 inline" />
                        <span>Alert</span>
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-[#8DA094]' : 'text-[#66776B]'}`}>
                    {event.startTime} – {event.endTime} {event.location ? `· ${event.location}` : ''}
                  </p>
                  {event.notes && (
                    <p className={`text-[11px] mt-1.5 italic ${isDark ? 'text-[#7A8E82]' : 'text-[#78887D]'}`}>
                      {event.notes}
                    </p>
                  )}

                  {/* Sync to Phone Alarm & Calendar Buttons */}
                  <div className="flex items-center space-x-2 mt-2.5 pt-2 border-t border-black/5 dark:border-white/5">
                    <a
                      href={getGoogleCalendarUrl(
                        event.title,
                        event.date || selectedDateStr,
                        event.startTime,
                        event.endTime,
                        event.location,
                        event.notes
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-[10px] font-semibold py-1 px-2.5 rounded-lg border transition-all flex items-center space-x-1 active:scale-95 ${
                        isDark
                          ? 'bg-[#17231D] border-[#2A3B30] text-[#7CC79E] hover:bg-[#1E2E25]'
                          : 'bg-white border-[#DBE5D8] text-[#274E3C] hover:bg-[#FAFBF9]'
                      }`}
                      title="Sync to Google Calendar with alarm reminder"
                    >
                      <CalendarPlus className="w-3 h-3" />
                      <span>Sync Phone Alarm</span>
                    </a>

                    <button
                      type="button"
                      onClick={() =>
                        downloadIcsFile(
                          event.title,
                          event.date || selectedDateStr,
                          event.startTime,
                          event.endTime,
                          event.location,
                          event.notes
                        )
                      }
                      className={`text-[10px] font-semibold py-1 px-2 rounded-lg border transition-all flex items-center space-x-1 active:scale-95 ${
                        isDark
                          ? 'bg-[#1A241F] border-[#253229] text-[#9CB3A5]'
                          : 'bg-[#F4F6F2] border-[#E2E8DF] text-[#55695B]'
                      }`}
                      title="Download .ICS file to add directly to Samsung / Android Calendar"
                    >
                      <span>.ICS</span>
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => deleteEvent(event.id)}
                  aria-label="Delete event"
                  className="text-red-400 hover:text-red-600 p-1 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Tap-an-Hour quick slots */}
        <div className={`pt-3 border-t space-y-2 ${isDark ? 'border-[#243028]' : 'border-[#F2F1ED]'}`}>
          <span className={`text-[11px] font-semibold block ${isDark ? 'text-[#879B90]' : 'text-[#7E8A81]'}`}>
            Tap an hour to plan:
          </span>
          <div className="grid grid-cols-4 gap-2">
            {hourSlots.map((slot) => (
              <button
                key={slot}
                onClick={() => openModalWithTime('add-event', slot)}
                className={`py-2 px-1 text-[11px] font-semibold rounded-xl border text-center transition-all active:scale-95 ${
                  isDark
                    ? 'bg-[#1D2721] border-[#29382F] text-[#8AA093] hover:border-[#7CC79E] hover:text-white'
                    : 'bg-[#FAFBF9] border-[#ECECE6] text-[#55695B] hover:border-[#274E3C] hover:bg-white'
                }`}
              >
                + {formatSlotLabel(slot)}
              </button>
            ))}
          </div>
        </div>

        {/* Wind down footer note */}
        <div className={`flex items-center space-x-2 text-[11px] pt-2 border-t ${isDark ? 'border-[#243028] text-[#7E9387]' : 'border-[#F2F1ED] text-[#7B8A80]'}`}>
          <Moon className="w-3.5 h-3.5 text-[#536B59]" />
          <span>Nighttime · Rest & recharge</span>
        </div>
      </div>
    </div>
  );
}
