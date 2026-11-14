'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  computeTimedEventLayout,
  EVENT_TYPE_META,
  getEventStartMinutes,
} from '@/lib/schedule';
import { formatMinutesTo12h } from '@/lib/time';
import { CalendarEvent } from '@/lib/types';
import { Bell, ChevronDown, ChevronUp, MapPin, Plus, Repeat } from 'lucide-react';

interface DayHourlyGridProps {
  selectedDateStr: string;
  isToday: boolean;
  isPastDay: boolean;
  nowMinutes: number;
  timedEvents: CalendarEvent[];
  isDark: boolean;
  onSlotClick: (time24: string) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const HOUR_HEIGHT_PX = 56;
const DEFAULT_START_HOUR = 6;
const END_HOUR = 24;

function formatHourAxisLabel(hour: number): string {
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export function DayHourlyGrid({
  selectedDateStr,
  isToday,
  isPastDay,
  nowMinutes,
  timedEvents,
  isDark,
  onSlotClick,
  onEventClick,
}: DayHourlyGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [manualEarlyHours, setManualEarlyHours] = useState(false);

  const hasEarlyEvent = useMemo(
    () => timedEvents.some((ev) => getEventStartMinutes(ev) < DEFAULT_START_HOUR * 60),
    [timedEvents]
  );

  const showEarlyHours = manualEarlyHours || hasEarlyEvent;
  const effectiveStartHour = showEarlyHours ? 0 : DEFAULT_START_HOUR;

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let h = effectiveStartHour; h < END_HOUR; h++) {
      list.push(h);
    }
    return list;
  }, [effectiveStartHour]);

  const positionedEvents = useMemo(
    () => computeTimedEventLayout(timedEvents, effectiveStartHour, HOUR_HEIGHT_PX),
    [timedEvents, effectiveStartHour]
  );

  const gridStartMin = effectiveStartHour * 60;
  const showNowLine = isToday && nowMinutes >= gridStartMin && nowMinutes < END_HOUR * 60;
  const nowTopPx = ((nowMinutes - gridStartMin) / 60) * HOUR_HEIGHT_PX;

  // Auto-scroll toward current hour when viewing today, or ~8 AM for other dates
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const targetHour = isToday
      ? Math.max(effectiveStartHour, Math.floor(nowMinutes / 60) - 1)
      : Math.max(effectiveStartHour, 8);
    const offset = Math.max(0, (targetHour - effectiveStartHour) * HOUR_HEIGHT_PX);
    el.scrollTop = offset;
    // Intentionally re-center only when the active day or start hour threshold changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateStr, isToday, effectiveStartHour]);

  const totalGridHeight = hours.length * HOUR_HEIGHT_PX;

  return (
    <div
      className={`rounded-[26px] border overflow-hidden shadow-card transition-colors ${
        isDark ? 'bg-[#18211D] border-[#26352C]' : 'bg-white border-[#ECECE6]'
      }`}
    >
      {/* Early hours toggle bar */}
      <div
        className={`flex items-center justify-between px-3.5 py-2 border-b text-[11px] font-medium ${
          isDark
            ? 'bg-[#141C18] border-[#243229] text-[#8DA296]'
            : 'bg-[#F8FAF7] border-[#EEF2EC] text-[#6B796F]'
        }`}
      >
        <span>Tap any empty hour to add an event</span>
        {!hasEarlyEvent && (
          <button
            type="button"
            onClick={() => setManualEarlyHours((prev) => !prev)}
            className={`inline-flex items-center gap-1 font-semibold transition-colors ${
              isDark ? 'text-[#7CC79E] hover:text-[#9FE0BC]' : 'text-[#274E3C] hover:text-[#1A382A]'
            }`}
          >
            {manualEarlyHours ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Hide 12–5 AM</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Show early hours</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Scrollable hourly canvas */}
      <div
        ref={scrollContainerRef}
        className="relative max-h-[540px] overflow-y-auto overscroll-contain"
      >
        <div
          className="relative flex select-none"
          style={{ height: `${totalGridHeight}px` }}
        >
          {/* Left Time Axis */}
          <div className="w-[54px] shrink-0 relative">
            {hours.map((hour, index) => (
              <div
                key={`axis-${hour}`}
                style={{ top: `${index * HOUR_HEIGHT_PX}px`, height: `${HOUR_HEIGHT_PX}px` }}
                className="absolute inset-x-0 pr-2 flex items-start justify-end"
              >
                <span
                  className={`text-[10px] font-semibold leading-none -mt-1.5 ${
                    isDark ? 'text-[#758A7E]' : 'text-[#89958C]'
                  }`}
                >
                  {formatHourAxisLabel(hour)}
                </span>
              </div>
            ))}
          </div>

          {/* Right Event Canvas */}
          <div
            className={`flex-1 relative border-l ${
              isDark ? 'border-[#25332B]' : 'border-[#EEF1EC]'
            }`}
          >
            {/* Interactive Hour Rows */}
            {hours.map((hour, index) => {
              const slotTime24 = `${String(hour).padStart(2, '0')}:00`;
              return (
                <button
                  key={`slot-${hour}`}
                  type="button"
                  onClick={() => onSlotClick(slotTime24)}
                  style={{ top: `${index * HOUR_HEIGHT_PX}px`, height: `${HOUR_HEIGHT_PX}px` }}
                  aria-label={`Add event at ${formatHourAxisLabel(hour)}`}
                  className={`group absolute inset-x-0 border-t text-left transition-colors ${
                    isDark
                      ? 'border-[#233028] hover:bg-[#1E2A23]/80 active:bg-[#233329]'
                      : 'border-[#F0F3EE] hover:bg-[#F5F9F4] active:bg-[#EAF2E8]'
                  }`}
                >
                  {/* Subtle half-hour guide line */}
                  <div
                    className={`absolute inset-x-0 top-1/2 border-t border-dashed pointer-events-none ${
                      isDark ? 'border-[#1E2923]' : 'border-[#F4F6F2]'
                    }`}
                  />
                  <span
                    className={`opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 ml-2.5 mt-1.5 text-[10px] font-semibold ${
                      isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{formatHourAxisLabel(hour)}</span>
                  </span>
                </button>
              );
            })}

            {/* Positioned Timed Event Blocks */}
            <div className="absolute inset-0 pointer-events-none pr-2 pl-1">
              {positionedEvents.map((pos) => {
                const { event } = pos;
                const meta = EVENT_TYPE_META[event.type || 'routine'] || EVENT_TYPE_META.routine;
                const isHappeningNow =
                  isToday && pos.startMin <= nowMinutes && nowMinutes < pos.endMin;
                const isPastEvent =
                  isPastDay || (isToday && pos.endMin <= nowMinutes);
                const isRepeating = Boolean(event.repeat && event.repeat !== 'none');

                const widthPct = 100 / pos.totalCols;
                const leftPct = pos.colIndex * widthPct;
                const blockHeight = Math.max(26, pos.heightPx - 2);
                const isCompact = blockHeight < 44;

                return (
                  <button
                    key={`${event.id}-${selectedDateStr}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    style={{
                      top: `${pos.topPx + 1}px`,
                      height: `${blockHeight}px`,
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                    }}
                    className={`pointer-events-auto absolute rounded-xl border text-left overflow-hidden flex transition-all active:scale-[0.985] shadow-sm ${
                      isDark
                        ? `${meta.darkBg} ${meta.darkBorder} ${meta.darkText}`
                        : `${meta.lightBg} ${meta.lightBorder} ${meta.lightText}`
                    } ${
                      isHappeningNow
                        ? isDark
                          ? 'ring-2 ring-[#6AC492] shadow-md z-20'
                          : 'ring-2 ring-[#274E3C] shadow-md z-20'
                        : 'z-10'
                    } ${isPastEvent && !isHappeningNow ? 'opacity-60' : ''}`}
                  >
                    {/* Left Category Color Accent Strip */}
                    <div className={`w-1 shrink-0 ${meta.accentBar}`} />

                    <div
                      className={`flex-1 min-w-0 px-2 ${
                        isCompact
                          ? 'py-0.5 flex items-center justify-between gap-1.5'
                          : 'py-1.5 flex flex-col justify-start'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 min-w-0">
                        <span className="text-[12px] font-semibold truncate leading-tight">
                          {event.title}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          {isHappeningNow && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                                isDark
                                  ? 'bg-[#6AC492] text-[#0E1813]'
                                  : 'bg-[#274E3C] text-white'
                              }`}
                            >
                              NOW
                            </span>
                          )}
                          {isRepeating && (
                            <Repeat className="w-2.5 h-2.5 opacity-65 shrink-0" />
                          )}
                          {event.remindMe && (
                            <Bell className="w-2.5 h-2.5 opacity-65 shrink-0" />
                          )}
                        </div>
                      </div>

                      {isCompact ? (
                        <span className="text-[10px] opacity-75 shrink-0 tabular-nums">
                          {event.startTime}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] opacity-80 min-w-0">
                          <span className="tabular-nums shrink-0">
                            {event.startTime} – {event.endTime}
                          </span>
                          {blockHeight >= 60 && event.location && (
                            <span className="inline-flex items-center gap-0.5 truncate opacity-90">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Now Line */}
            {showNowLine && (
              <div
                style={{ top: `${nowTopPx}px` }}
                className="absolute inset-x-0 z-30 pointer-events-none flex items-center -translate-y-1/2"
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full bg-rose-500 -ml-[5px] ring-2 shrink-0 ${
                    isDark ? 'ring-[#18211D]' : 'ring-white'
                  }`}
                />
                <div className="flex-1 h-[2px] bg-rose-500" />
                <span className="mr-2 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold tracking-wide shadow-sm">
                  {formatMinutesTo12h(nowMinutes)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
