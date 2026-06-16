'use client';

import React, { useState, useEffect } from 'react';
import { useBatch } from '@/store/BatchContext';
import { Calendar, Clock, MapPin, User, Info, BookOpen } from 'lucide-react';

interface WeekDay {
  dayName: string;
  dateStr: string;
  label: string;
}

export default function TimetablePage() {
  const { timetable, timetableLoading } = useBatch();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);

  // Calculate dates of the current work week (Monday to Friday)
  useEffect(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sun, 1 is Mon
    
    // Calculate offset to get to Monday of the current week (Sunday starts the week, so Sun maps to upcoming Mon)
    const distance = 1 - currentDay;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + distance);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const formattedDays = days.map((day, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      
      // Timezone-safe local formatting
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateVal = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dateVal}`;
      
      const label = `${day.substring(0, 3)}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      return {
        dayName: day,
        dateStr,
        label
      };
    });

    setWeekDays(formattedDays);

    // Default to today if it's a weekday, otherwise Monday
    const todayYear = today.getFullYear();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDate = String(today.getDate()).padStart(2, '0');
    const todayStr = `${todayYear}-${todayMonth}-${todayDate}`;
    
    const isWeekday = formattedDays.some(d => d.dateStr === todayStr);
    if (isWeekday) {
      setSelectedDate(todayStr);
    } else {
      setSelectedDate(formattedDays[0]?.dateStr || '');
    }
  }, []);

  const filteredSessions = timetable.filter(session => session.date === selectedDate);

  if (timetableLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <div className="w-10 h-10 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Syncing timetables...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date-Based Selector Tabs */}
      <div className="bg-slate-900/40 p-1.5 rounded-2xl border border-slate-800/80 backdrop-blur-sm flex items-center overflow-x-auto gap-1">
        {weekDays.map((day) => {
          const isSelected = selectedDate === day.dateStr;
          return (
            <button
              key={day.dateStr}
              onClick={() => setSelectedDate(day.dateStr)}
              className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition-all duration-200 outline-none text-center whitespace-nowrap min-w-[90px] ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              {day.label}
            </button>
          );
        })}
      </div>

      {/* Lectures Count info */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
          Lectures for {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''} ({filteredSessions.length})
        </span>
        <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/15 px-2.5 py-0.5 rounded-full">
          Core Cohort (Section A)
        </span>
      </div>

      {/* Timetable Session Cards */}
      <div className="space-y-4">
        {filteredSessions.map((session) => {
          const isOngoing = session.status === 'ongoing';
          const isCompleted = session.status === 'completed';
          
          return (
            <div
              key={session.id}
              className={`p-5 rounded-2xl border backdrop-blur-sm transition-all duration-300 relative group ${
                isOngoing
                  ? 'bg-indigo-950/30 border-indigo-500/40 shadow-lg shadow-indigo-500/5'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700/60'
              }`}
            >
              {isOngoing && (
                <div className="absolute top-0 bottom-0 left-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-indigo-500 to-violet-500" />
              )}
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  {/* Status Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isOngoing ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                        Active Session
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wider">
                        Concluded
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                        Scheduled
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-950 border border-slate-800 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" /> {session.room}
                    </span>
                  </div>

                  {/* Class Title */}
                  <h3 className={`text-base sm:text-lg font-bold ${
                    isOngoing ? 'text-slate-100' : 'text-slate-200'
                  }`}>
                    {session.subject}
                  </h3>
                  
                  {/* Prof & Time details */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 pt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-indigo-400/80" />
                      <span>{session.professor}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-400/80" />
                      <span>{session.time}</span>
                    </span>
                  </div>
                </div>

                {/* Info indicator action */}
                <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-slate-950 border border-slate-800/80 text-slate-500 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all">
                  <BookOpen className="w-4.5 h-4.5" />
                </div>
              </div>
            </div>
          );
        })}

        {filteredSessions.length === 0 && (
          <div className="text-center py-12 px-6 rounded-2xl border border-dashed border-slate-800 bg-slate-900/10">
            <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-400">No lectures scheduled</h4>
            <p className="text-xs text-slate-500 mt-1">Perfect! Use this time for case study prep or elective research.</p>
          </div>
        )}
      </div>

      {/* Campus Notice Card */}
      <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/10 flex items-start gap-3 mt-8">
        <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-slate-300">Room LHC-101 / 102 locations</h4>
          <p className="text-[11px] text-slate-400 leading-normal">
            Lectures are hosted in the Lecture Hall Complex (LHC), Level 1. Lab sessions are located in Central Computing Lab-3.
          </p>
        </div>
      </div>
    </div>
  );
}
