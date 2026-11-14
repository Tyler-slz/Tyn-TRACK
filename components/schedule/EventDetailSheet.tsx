'use client';

import React from 'react';
import { getGoogleCalendarUrl, downloadIcsFile } from '@/lib/calendar';
import { EVENT_TYPE_META, formatRepeatSummary } from '@/lib/schedule';
import { formatDateHumanLabel } from '@/lib/time';
import { CalendarEvent } from '@/lib/types';
import {
  Bell,
  BellOff,
  Calendar,
  CalendarPlus,
  Clock,
  Download,
  FileText,
  MapPin,
  Pencil,
  Repeat,
  SkipForward,
  Trash2,
  X,
} from 'lucide-react';

interface EventDetailSheetProps {
  event: CalendarEvent | null;
  selectedDateStr: string;
  todayLocalStr: string;
  isDark: boolean;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onSkipDate: (eventId: string, dateStr: string) => void;
  onDelete: (eventId: string) => void;
}

export function EventDetailSheet({
  event,
  selectedDateStr,
  todayLocalStr,
  isDark,
  onClose,
  onEdit,
  onSkipDate,
  onDelete,
}: EventDetailSheetProps) {
  if (!event) return null;

  const meta = EVENT_TYPE_META[event.type || 'routine'] || EVENT_TYPE_META.routine;
  const repeatSummary = formatRepeatSummary(event);
  const isRepeating = Boolean(event.repeat && event.repeat !== 'none');
  const dateLabel = formatDateHumanLabel(selectedDateStr, todayLocalStr);

  const exportStart = event.allDay ? '9:00 AM' : event.startTime;
  const exportEnd = event.allDay ? '10:00 AM' : event.endTime;
  const googleCalUrl = getGoogleCalendarUrl(
    event.title,
    selectedDateStr,
    exportStart,
    exportEnd,
    event.location,
    event.notes
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-[34px] sm:rounded-[34px] p-6 safe-modal-bottom shadow-2xl border transition-all space-y-5 ${
          isDark
            ? 'bg-[#151D18] border-[#25332B] text-[#EDEFEA]'
            : 'bg-[#FAF8F5] border-[#ECECE6] text-[#1E2621]'
        }`}
      >
        {/* Header with category pill + close */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                isDark
                  ? `${meta.darkBg} ${meta.darkBorder} ${meta.darkText}`
                  : `${meta.lightBg} ${meta.lightBorder} ${meta.lightText}`
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: meta.dotColor }}
              />
              <span>{meta.label}</span>
            </span>

            <h2
              className={`text-[22px] font-bold leading-snug tracking-tight ${
                isDark ? 'text-[#EDEFEA]' : 'text-[#1E2621]'
              }`}
            >
              {event.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close event details"
            className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
              isDark
                ? 'bg-[#202C25] border-[#2F3F36] text-[#8EA397] hover:text-white'
                : 'bg-white border-[#E3E8E1] text-[#69796D] hover:text-[#1E2621]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Detail metadata card */}
        <div
          className={`rounded-[22px] border p-4 space-y-3 ${
            isDark ? 'bg-[#1C2620] border-[#2A3930]' : 'bg-white border-[#ECECE6]'
          }`}
        >
          <div className="flex items-center gap-3 text-[13px]">
            <Calendar
              className={`w-4 h-4 shrink-0 ${
                isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'
              }`}
            />
            <span className="font-medium">{dateLabel}</span>
          </div>

          <div className="flex items-center gap-3 text-[13px]">
            <Clock
              className={`w-4 h-4 shrink-0 ${
                isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'
              }`}
            />
            <span className="font-medium tabular-nums">
              {event.allDay
                ? 'All Day'
                : `${event.startTime} – ${event.endTime}`}
            </span>
          </div>

          {repeatSummary && (
            <div className="flex items-center gap-3 text-[13px]">
              <Repeat
                className={`w-4 h-4 shrink-0 ${
                  isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'
                }`}
              />
              <span className="font-medium">{repeatSummary}</span>
            </div>
          )}

          {event.location && (
            <div className="flex items-center gap-3 text-[13px]">
              <MapPin
                className={`w-4 h-4 shrink-0 ${
                  isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'
                }`}
              />
              <span className="break-words">{event.location}</span>
            </div>
          )}

          {!event.allDay && (
            <div className="flex items-center gap-3 text-[13px]">
              {event.remindMe ? (
                <>
                  <Bell
                    className={`w-4 h-4 shrink-0 ${
                      isDark ? 'text-[#7CC79E]' : 'text-[#274E3C]'
                    }`}
                  />
                  <span>
                    In-app &amp; device reminder active ({event.startTime})
                  </span>
                </>
              ) : (
                <>
                  <BellOff
                    className={`w-4 h-4 shrink-0 ${
                      isDark ? 'text-[#6D8175]' : 'text-[#8C988F]'
                    }`}
                  />
                  <span
                    className={isDark ? 'text-[#84998D]' : 'text-[#768279]'}
                  >
                    Alarm muted for this event
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Notes block */}
        {event.notes && event.notes.trim().length > 0 && (
          <div
            className={`rounded-[22px] border p-4 space-y-1.5 ${
              isDark ? 'bg-[#1A241E] border-[#28372E]' : 'bg-[#F3F6F1] border-[#E2EAE0]'
            }`}
          >
            <div
              className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${
                isDark ? 'text-[#879B90]' : 'text-[#6F7C73]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Notes</span>
            </div>
            <p
              className={`text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                isDark ? 'text-[#DCE5DF]' : 'text-[#2E3A32]'
              }`}
            >
              {event.notes}
            </p>
          </div>
        )}

        {/* Primary Actions: Edit + Calendar Sync */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(event);
            }}
            className="w-full py-3.5 rounded-[22px] bg-[#274E3C] hover:bg-[#1E3F30] text-white text-[14px] font-semibold shadow-soft transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            <span>Edit Event</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`py-3 px-3 rounded-[20px] border text-[12px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 ${
                isDark
                  ? 'bg-[#1D2822] border-[#2C3E34] text-[#9BE0BA] hover:bg-[#23322A]'
                  : 'bg-white border-[#DDE5DC] text-[#274E3C] hover:bg-[#F1F6F0]'
              }`}
            >
              <CalendarPlus className="w-4 h-4 shrink-0" />
              <span className="truncate">Sync Phone Alarm</span>
            </a>

            <button
              type="button"
              onClick={() =>
                downloadIcsFile(
                  event.title,
                  selectedDateStr,
                  exportStart,
                  exportEnd,
                  event.location,
                  event.notes
                )
              }
              className={`py-3 px-3 rounded-[20px] border text-[12px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 ${
                isDark
                  ? 'bg-[#1D2822] border-[#2C3E34] text-[#D7E2DC] hover:bg-[#23322A]'
                  : 'bg-white border-[#DDE5DC] text-[#35463A] hover:bg-[#F1F6F0]'
              }`}
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Download .ICS</span>
            </button>
          </div>
        </div>

        {/* Destructive / Occurrence Actions */}
        <div
          className={`pt-2 border-t space-y-2 ${
            isDark ? 'border-[#233129]' : 'border-[#EAECE6]'
          }`}
        >
          {isRepeating ? (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onSkipDate(event.id, selectedDateStr);
                  onClose();
                }}
                className={`py-3 px-3 rounded-[20px] border text-[12px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 ${
                  isDark
                    ? 'bg-[#25221B] border-[#423824] text-amber-300 hover:bg-[#302A20]'
                    : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/80'
                }`}
              >
                <SkipForward className="w-3.5 h-3.5 shrink-0" />
                <span>Skip Only This Day</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDelete(event.id);
                  onClose();
                }}
                className={`py-3 px-3 rounded-[20px] border text-[12px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 ${
                  isDark
                    ? 'bg-[#2B1B1C] border-[#4A292C] text-rose-300 hover:bg-[#382123]'
                    : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/80'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Delete All Occurrences</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onDelete(event.id);
                onClose();
              }}
              className={`w-full py-3 rounded-[20px] border text-[13px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 ${
                isDark
                  ? 'bg-[#2B1B1C] border-[#4A292C] text-rose-300 hover:bg-[#382123]'
                  : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/80'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Event</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
