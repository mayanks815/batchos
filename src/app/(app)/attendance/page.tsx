'use client';

import React, { useState } from 'react';
import { useBatch } from '@/store/BatchContext';
import { useAuth } from '@/store/AuthContext';
import { 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Percent, 
  Sparkles, 
  Edit2, 
  Trash2, 
  X,
  XCircle
} from 'lucide-react';
import { CourseAttendance } from '@/types';

export default function AttendancePage() {
  const { role, userData } = useAuth();
  const { 
    attendance, 
    attendanceLoading, 
    addAttendanceRecord, 
    updateAttendanceRecord, 
    incrementAttendanceRecord, 
    deleteAttendanceRecord 
  } = useBatch();

  const enrolledSubjects = userData?.subjects || [];

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Form states
  const [formSubject, setFormSubject] = useState('');
  const [formTotal, setFormTotal] = useState(0);
  const [formAttended, setFormAttended] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const getPercentColor = (pct: number) => {
    if (pct >= 85) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (pct >= 75) return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const getProgressBarColor = (pct: number) => {
    if (pct >= 85) return 'bg-emerald-500';
    if (pct >= 75) return 'bg-indigo-500';
    return 'bg-rose-500';
  };

  // Safe Bunk / Attendance Recovery Calculation
  const calculateBunkStatus = (attended: number, total: number) => {
    if (total === 0) return { status: 'neutral', text: 'No lectures held yet.' };
    
    // Formula: allowedBunks = floor((attended / 0.75) - total)
    const allowedBunks = Math.floor((attended / 0.75) - total);
    
    if (allowedBunks >= 0) {
      if (allowedBunks > 0) {
        return {
          status: 'safe',
          text: `Safe! You can bunk the next ${allowedBunks} class${allowedBunks > 1 ? 'es' : ''} safely.`
        };
      } else {
        return {
          status: 'borderline',
          text: 'Warning: Bunking the next class will drop you below 75%!'
        };
      }
    } else {
      // Y >= 3 * total - 4 * attended
      const required = (3 * total) - (4 * attended);
      return {
        status: 'critical',
        text: `Critical! Below safe threshold. You must attend the next ${required} class${required > 1 ? 'es' : ''} consecutively to reach 75%.`
      };
    }
  };

  const handleOpenAddModal = () => {
    setEditMode(false);
    setSelectedCourseId(null);
    setFormSubject('');
    setFormTotal(0);
    setFormAttended(0);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (course: CourseAttendance, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditMode(true);
    setSelectedCourseId(course.id);
    setFormSubject(course.subject);
    setFormTotal(course.totalClasses);
    setFormAttended(course.attendedClasses);
    setFormError(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this subject attendance record?')) return;
    try {
      await deleteAttendanceRecord(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete attendance record.');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim()) return;

    if (formAttended < 0 || formTotal < 0) {
      setFormError('Attendance counts cannot be negative.');
      return;
    }
    if (formAttended > formTotal) {
      setFormError('Attended classes cannot exceed total classes.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editMode && selectedCourseId) {
        await updateAttendanceRecord(selectedCourseId, {
          subject: formSubject,
          totalClasses: Number(formTotal),
          attendedClasses: Number(formAttended)
        });
      } else {
        await addAttendanceRecord(
          formSubject,
          Number(formTotal),
          Number(formAttended)
        );
      }
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save attendance record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIncrement = async (course: CourseAttendance, attendedChange: number, totalChange: number) => {
    const nextAttended = course.attendedClasses + attendedChange;
    const nextTotal = course.totalClasses + totalChange;

    if (nextAttended < 0) return;
    if (nextTotal < 0) return;
    if (nextAttended > nextTotal) return;

    try {
      await incrementAttendanceRecord(course.id, attendedChange, totalChange);
    } catch (err: any) {
      console.error('Failed to increment attendance:', err);
    }
  };

  const visibleAttendance = attendance.filter(course => 
    enrolledSubjects.some(sub => sub.toLowerCase() === course.subject.toLowerCase())
  );

  if (attendanceLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-6 w-32 bg-slate-900/40 rounded border border-slate-800 animate-pulse" />
          <div className="h-10 w-36 bg-slate-900/40 rounded-xl border border-slate-800 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="p-5 rounded-2xl border border-slate-850 bg-slate-900/20 h-48 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="w-16 h-3 bg-slate-800 rounded" />
                  <div className="w-40 h-5 bg-slate-800 rounded" />
                </div>
                <div className="w-16 h-8 bg-slate-800 rounded-xl" />
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full" />
              <div className="w-full h-4 bg-slate-800 rounded" />
              <div className="w-full h-10 bg-slate-850 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (enrolledSubjects.length === 0) {
    return (
      <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-slate-800 bg-slate-900/10">
        <Percent className="w-10 h-10 text-slate-800 mx-auto mb-3" />
        <h4 className="text-sm font-bold text-slate-400">No Subjects Assigned</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Please contact your administrator to get subjects assigned to your profile in order to start tracking your attendance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Percent className="w-5 h-5 text-indigo-400" />
          My Attendance
        </h2>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>

      {/* Empty State */}
      {visibleAttendance.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-slate-800 bg-slate-900/10">
          <Percent className="w-10 h-10 text-slate-855 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-400">No Attendance Records</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You haven't set up any attendance sheets yet. Click below to initialize a course tracker.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="mt-4 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-lg shadow-indigo-600/15 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Subject
          </button>
        </div>
      ) : (
        /* Attendance Stats Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleAttendance.map((course) => {
            const percent = course.totalClasses > 0 ? Math.round((course.attendedClasses / course.totalClasses) * 100) : 0;
            const bunkInfo = calculateBunkStatus(course.attendedClasses, course.totalClasses);
            
            const isAtRisk = percent < 75 && course.totalClasses > 0;
            return (
              <div 
                key={course.id} 
                className={`p-5 rounded-2xl bg-slate-900/50 border transition-all backdrop-blur-sm relative overflow-hidden group ${
                  isAtRisk 
                    ? 'border-rose-500/35 hover:border-rose-500/50 bg-rose-950/5' 
                    : 'border-slate-850 hover:border-slate-800'
                }`}
              >
                {/* Subject Header Info */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="pr-16">
                    <h3 className="text-sm font-bold text-slate-200 mt-1 leading-snug group-hover:text-indigo-300 transition-colors">
                      {course.subject}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleOpenEditModal(course, e)}
                        className="p-1.5 rounded-lg bg-slate-950 border border-slate-850 hover:border-indigo-500/20 text-slate-450 hover:text-indigo-400 transition-all cursor-pointer"
                        title="Edit subject info"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(course.id, e)}
                        className="p-1.5 rounded-lg bg-slate-950 border border-slate-850 hover:border-rose-500/20 text-slate-450 hover:text-rose-455 transition-all cursor-pointer"
                        title="Delete subject"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Percentage dial */}
                    {isAtRisk ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md text-[9px] font-bold text-rose-400">
                          At Risk
                        </span>
                        <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0" title="At Risk Progress Ring">
                          <svg className="w-8 h-8 transform -rotate-90">
                            <circle cx="16" cy="16" r="12" className="text-slate-850" strokeWidth="2.5" fill="transparent" stroke="currentColor" />
                            <circle cx="16" cy="16" r="12" className="text-rose-500" strokeWidth="2.5" fill="transparent" strokeDasharray={75.4} strokeDashoffset={75.4 - (75.4 * Math.min(percent, 100)) / 100} stroke="currentColor" />
                          </svg>
                          <span className="absolute text-[8.5px] font-black text-rose-400">{percent}%</span>
                        </div>
                      </div>
                    ) : (
                      <div className={`px-2.5 py-1 rounded-xl border text-xs font-black flex items-center gap-1 ${getPercentColor(percent)}`}>
                        <Percent className="w-3 h-3" />
                        <span>{percent}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden mb-4 border border-slate-850">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(percent)}`} 
                    style={{ width: `${Math.min(100, percent)}%` }} 
                  />
                </div>

                {/* Progress Count */}
                <div className="flex justify-between items-center text-xs text-slate-400 mt-2 mb-4">
                  <span>Lectures Attended:</span>
                  <span className="font-bold text-slate-200">
                    {course.attendedClasses} <span className="text-slate-500">/</span> {course.totalClasses}
                  </span>
                </div>

                {/* Direct marking buttons */}
                <div className="flex items-center gap-3 w-full mb-4">
                  <button 
                    onClick={() => handleIncrement(course, 1, 1)}
                    className="flex-1 py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Mark Present (+1 Attended, +1 Total)"
                  >
                    <CheckCircle className="w-4 h-4" /> Present
                  </button>
                  <button 
                    onClick={() => handleIncrement(course, 0, 1)}
                    className="flex-1 py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-rose-455 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Mark Absent (+1 Total)"
                  >
                    <XCircle className="w-4 h-4" /> Absent
                  </button>
                </div>

                {/* Bunk status output */}
                <div className={`p-3 rounded-xl border text-[11px] font-medium flex items-start gap-2 ${
                  bunkInfo.status === 'safe'
                    ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                    : bunkInfo.status === 'critical'
                      ? 'bg-rose-500/5 border-rose-500/10 text-rose-450'
                      : 'bg-amber-500/5 border-amber-500/10 text-amber-450'
                }`}>
                  {bunkInfo.status === 'safe' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="leading-snug">{bunkInfo.text}</span>
                </div>

                {isAtRisk && (
                  <div className="text-[10px] font-semibold text-rose-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span>Attendance below 75% threshold! Immediate recovery required.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Attendance Policy Notice */}
      <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/10 flex items-start gap-3 mt-8">
        <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-slate-350">Academic Attendance Regulations</h4>
          <p className="text-[11px] text-slate-400 leading-normal">
            As per academic senate guidelines, a minimum of 75% attendance is mandatory in each course to be eligible to sit for the End-Term examinations. Real-time counts are updated and maintained privately by you.
          </p>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 animate-zoomIn">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-extrabold text-slate-250 tracking-wider uppercase flex items-center gap-1.5 mb-5">
              <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
              {editMode ? 'Edit Subject Details' : 'Add Subject'}
            </h3>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-455 text-xs flex items-center gap-1.5 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Subject Name</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formSubject}
                    disabled
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed select-none"
                  />
                ) : (
                  <select
                    value={formSubject}
                    onChange={e => setFormSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                    required
                  >
                    <option value="">-- Choose enrolled subject --</option>
                    {enrolledSubjects.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Attended Classes</label>
                  <input
                    type="number"
                    min="0"
                    value={formAttended}
                    onChange={e => setFormAttended(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-455 font-bold uppercase mb-1">Total Classes</label>
                  <input
                    type="number"
                    min="0"
                    value={formTotal}
                    onChange={e => setFormTotal(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-850 mt-5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-905 border border-slate-805 text-slate-400 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
