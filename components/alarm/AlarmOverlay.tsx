'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Bell, Check, Clock, X } from 'lucide-react';

export function AlarmOverlay() {
  const { activeAlarm, dismissAlarm, snoozeAlarm } = useApp();

  if (!activeAlarm) return null;

  return (
    <div className="fixed inset-x-0 top-3 z-50 flex justify-center px-4 pointer-events-none animate-bounce-in">
      <div className="pointer-events-auto bg-[#1E2522] text-white rounded-[28px] p-4 shadow-2xl border border-white/10 max-w-sm w-full flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#274E3C] flex items-center justify-center text-[#A7C2B2] animate-pulse">
              <Bell className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#A7C2B2]">
                Reminder Alarm · {activeAlarm.time}
              </span>
              <h4 className="text-[15px] font-semibold text-white leading-tight">
                {activeAlarm.title}
              </h4>
            </div>
          </div>
          <button
            onClick={dismissAlarm}
            className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {activeAlarm.category && (
          <p className="text-[12px] text-[#A7C2B2] pl-10 -mt-2">
            {activeAlarm.category}
          </p>
        )}

        <div className="flex items-center space-x-2 pt-1 border-t border-white/10">
          <button
            onClick={() => snoozeAlarm(5)}
            className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[12px] font-semibold text-white transition-all active:scale-95 flex items-center justify-center space-x-1"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Snooze 5 min</span>
          </button>

          <button
            onClick={dismissAlarm}
            className="flex-1 py-2 rounded-xl bg-[#274E3C] hover:bg-[#325F4A] text-[12px] font-semibold text-white transition-all active:scale-95 flex items-center justify-center space-x-1 shadow-sm"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Dismiss</span>
          </button>
        </div>
      </div>
    </div>
  );
}

