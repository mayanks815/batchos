'use client';

import React, { useState, useEffect } from 'react';
import { useBatch } from '@/store/BatchContext';
import { useAuth } from '@/store/AuthContext';
import { Task } from '@/types';
import { db } from '@/lib/firebase';
import { Timestamp, collection, query, onSnapshot } from 'firebase/firestore';
import { 
  CheckSquare, 
  Square, 
  Trash2, 
  Plus, 
  Calendar, 
  AlertTriangle,
  Sparkles,
  ClipboardList,
  AlertCircle,
  X
} from 'lucide-react';
import { shareOnWhatsApp } from '@/lib/whatsapp';

export default function TasksPage() {
  const { role, userData, isTaskCompleted, toggleTaskComplete } = useAuth();
  const { tasks, tasksLoading, addTask, deleteTask } = useBatch();
  
  const isAdmin = role === 'admin';
  const enrolledSubjects = userData?.subjects || [];
  
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [showForm, setShowForm] = useState(false);
  const [createdTaskForShare, setCreatedTaskForShare] = useState<{
    title: string;
    subject: string;
    deadline: string;
    priority: string;
  } | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('all');
  const [subject, setSubject] = useState('Corporate Finance');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all students for audience preview
  const [students, setStudents] = useState<any[]>([]);
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(doc => doc.data()));
    }, (err) => {
      console.error("Failed to fetch students in tasks page:", err);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const getTaskAudienceCount = () => {
    if (assignedTo === 'all') {
      return students.length;
    }
    const normalizedSubject = subject.trim().toLowerCase();
    return students.filter(student =>
      (student.subjects || []).some((sub: string) => sub.trim().toLowerCase() === normalizedSubject)
    ).length;
  };

  const subjects = [
    'Corporate Finance',
    'Marketing Management II',
    'Operations Research',
    'Strategy & Governance',
    'Business Data Analytics',
    'Macroeconomics'
  ];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;
    setError(null);
    setSubmitting(true);

    try {
      // Parse YYYY-MM-DD input date to local Date object set to 23:59:59 (end of that day)
      const parts = deadline.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const localDate = new Date(year, month, day, 23, 59, 59);
      const deadlineTimestamp = Timestamp.fromDate(localDate);

      await addTask(title, subject, deadlineTimestamp, priority, assignedTo);
      
      setCreatedTaskForShare({
        title,
        subject,
        deadline: localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        priority
      });

      setTitle('');
      setAssignedTo('all');
      setDeadline('');
      setPriority('medium');
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to schedule deliverable.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task deliverable?')) return;
    try {
      await deleteTask(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete task.');
    }
  };

  const getPriorityColor = (level: Task['priority']) => {
    switch (level) {
      case 'high': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'low': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    }
  };

  // 1. Filter by enrolled subjects with normalization and backward compatibility
  const subjectFilteredTasks = tasks.filter(task => {
    const taskAssignedTo = (task.assignedTo || 'all').trim().toLowerCase();
    
    if (taskAssignedTo === 'all') {
      return true;
    }
    
    if (taskAssignedTo === 'subject') {
      const normalizedTaskSubject = (task.subject || '').trim().toLowerCase();
      return enrolledSubjects.some(
        sub => sub.trim().toLowerCase() === normalizedTaskSubject
      );
    }
    
    return false;
  });

  // 2. Filter tasks by completion tab
  const tabFilteredTasks = subjectFilteredTasks.filter(task => {
    const isCompleted = isTaskCompleted(task.id);
    if (filter === 'pending') return !isCompleted;
    if (filter === 'completed') return isCompleted;
    return true;
  });

  // 3. Separate overdue tasks (only applicable if we are in 'pending' or 'all' filters)
  // Overdue: incomplete AND deadline date is before current timestamp
  const nowMs = Date.now();
  
  const overdueTasks = tabFilteredTasks.filter(t => {
    const isCompleted = isTaskCompleted(t.id);
    return !isCompleted && t.deadline && t.deadline.toMillis() < nowMs;
  });

  const activeTasks = tabFilteredTasks.filter(t => {
    const isCompleted = isTaskCompleted(t.id);
    const isOverdue = !isCompleted && t.deadline && t.deadline.toMillis() < nowMs;
    return !isOverdue;
  });

  if (tasksLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <div className="w-10 h-10 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Loading deliverables...</span>
      </div>
    );
  }

  // Keep view rendering intact even if user has no assigned subjects (fallback shows only 'all' tasks)

  return (
    <div className="space-y-6">
      
      {isAdmin && createdTaskForShare && (
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.528 1.977 14.07 1.95 11.996 1.95c-5.44 0-9.866 4.372-9.87 9.802 0 1.972.518 3.902 1.5 5.619l-.993 3.634 3.731-.977zm11.587-6.845c-.322-.16-.1.905-.333-.53-.23-.115-1.371-.675-1.564-.741-.19-.066-.33-.1-.47.1-.14.2-.54.675-.662.815-.123.14-.246.156-.568-.005-.322-.16-1.358-.5-2.586-1.597-.954-.852-1.6-1.903-1.787-2.222-.187-.32-.02-.493.14-.652.145-.143.322-.377.483-.565.162-.188.216-.322.324-.534.11-.212.055-.398-.027-.558-.083-.16-.743-1.787-1.018-2.45-.269-.646-.54-.558-.742-.568-.19-.01-.41-.01-.63-.01-.22 0-.58.083-.883.415-.303.33-1.157 1.13-1.157 2.753s1.185 3.187 1.35 3.407c.165.22 2.332 3.563 5.65 5.002.788.34 1.405.544 1.885.697.79.25 1.513.214 2.083.13.635-.093 1.953-.798 2.228-1.57.275-.77.275-1.43.193-1.57-.083-.14-.303-.22-.625-.38z"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-wider block">Deliverable Scheduled!</span>
              <p className="text-xs text-slate-200 font-semibold truncate">Share "{createdTaskForShare.title}" to WhatsApp groups instantly.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => {
                const appUrl = window.location.origin;
                const message = `📌 New Task Added\n\nTitle: ${createdTaskForShare.title}\nSubject: ${createdTaskForShare.subject}\nDeadline: ${createdTaskForShare.deadline}\nPriority: ${createdTaskForShare.priority}\n\nCheck details on BatchOS:\n${appUrl}/tasks`;
                shareOnWhatsApp(message);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/15 transition-all cursor-pointer whitespace-nowrap"
            >
              Share on WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setCreatedTaskForShare(null)}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Filter Pills */}
        <div className="bg-slate-900/40 p-1 rounded-xl border border-slate-800/80 backdrop-blur flex self-start">
          {(['pending', 'completed', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize ${
                filter === t
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-205'
              }`}
            >
              {t} ({
                subjectFilteredTasks.filter(task => {
                  const completed = isTaskCompleted(task.id);
                  return t === 'all' ? true : t === 'completed' ? completed : !completed;
                }).length
              })
            </button>
          ))}
        </div>

        {/* Add Task Toggle Button (Only for Admins) */}
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15 transition-all self-start sm:self-auto"
          >
            {showForm ? 'Cancel Add' : (
              <>
                <Plus className="w-4.5 h-4.5" /> Add Deliverable
              </>
            )}
          </button>
        )}
      </div>

      {/* Task Creation Form Dropdown (Only for Admins) */}
      {isAdmin && showForm && (
        <form onSubmit={handleAdd} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4 animate-fadeIn">
          <h3 className="text-xs font-extrabold text-slate-300 tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" /> Schedule Academic Deliverable
          </h3>
          
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-400 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Task Title */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Task Title</label>
              <input
                type="text"
                placeholder="e.g. Valuation Case Study writeup"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-205 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>

            {/* Assign To Dropdown */}
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Assign To</label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                <option value="all">All Students</option>
                <option value="subject">Subject-Specific</option>
              </select>
            </div>

            {/* Subject Dropdown */}
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Course / Domain</label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                disabled={assignedTo !== 'subject'}
                className="w-full bg-slate-950 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                {subjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Deadline Date */}
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Deadline Date</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>

            {/* Priority Select */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-2">Priority Level</label>
              <div className="flex gap-3">
                {(['low', 'medium', 'high'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border capitalize transition-all ${
                      priority === p
                        ? p === 'high' 
                          ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-md shadow-rose-500/5'
                          : p === 'medium'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/5'
                            : 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/5'
                        : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Audience Size Preview */}
            <div className="sm:col-span-2">
              <p className="text-[10px] text-slate-500 font-bold">
                Audience Size: <span className="text-indigo-400">{getTaskAudienceCount()}</span> / {students.length} students will receive this task
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/10"
            >
              {submitting ? 'Saving...' : 'Save Deliverable'}
            </button>
          </div>
        </form>
      )}

      {/* Task listing feeds */}
      <div className="space-y-6">
        
        {/* Overdue Section */}
        {overdueTasks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold px-1 uppercase tracking-wider">
              <AlertTriangle className="w-4.5 h-4.5 text-rose-450" />
              <span>Overdue Deliverables ({overdueTasks.length})</span>
            </div>
            
            <div className="space-y-3">
              {overdueTasks.map((task) => {
                const dateObj = task.deadline.toDate();
                const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                
                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl border border-rose-950/45 bg-rose-950/5 hover:border-rose-500/30 transition-all duration-200 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => toggleTaskComplete(task.id)}
                        className="text-slate-500 hover:text-indigo-400 focus:outline-none transition-transform active:scale-90 flex-shrink-0 mt-0.5"
                      >
                        <Square className="w-5 h-5 text-rose-500/50" />
                      </button>

                      <div className="space-y-0.5 min-w-0">
                        <span className="text-xs font-bold text-rose-300 block truncate leading-tight">
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-rose-450">
                          <span className="font-semibold">{task.subject}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-bold text-rose-400"><Calendar className="w-3 h-3" /> Missed: {dateLabel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-bold ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-2 rounded-lg bg-slate-950 hover:bg-rose-500/10 border border-slate-850 hover:border-rose-500/25 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Section */}
        <div className="space-y-3">
          {overdueTasks.length > 0 && activeTasks.length > 0 && (
            <div className="text-xs text-slate-400 font-bold px-1 uppercase tracking-wider pt-2">
              Upcoming Schedules
            </div>
          )}
          
          <div className="space-y-3">
            {activeTasks.map((task) => {
              const completed = isTaskCompleted(task.id);
              const dateObj = task.deadline ? task.deadline.toDate() : new Date();
              const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border backdrop-blur-sm flex items-center justify-between gap-4 transition-all duration-200 ${
                    completed 
                      ? 'bg-slate-900/30 border-slate-900 opacity-60' 
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => toggleTaskComplete(task.id)}
                      className="text-indigo-400 hover:text-indigo-300 focus:outline-none transition-transform active:scale-90 flex-shrink-0 mt-0.5 cursor-pointer"
                    >
                      {completed ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500" />
                      )}
                    </button>

                    <div className="space-y-0.5 min-w-0">
                      <span className={`text-xs font-bold text-slate-200 block truncate leading-tight ${
                        completed ? 'line-through text-slate-500' : ''
                      }`}>
                        {task.title}
                      </span>
                      
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="font-semibold">{task.subject}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due: {dateLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`hidden sm:inline-block px-2.5 py-0.5 rounded-md text-[9px] font-bold ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-2 rounded-lg bg-slate-950 hover:bg-rose-500/10 border border-slate-850 hover:border-rose-500/25 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {activeTasks.length === 0 && overdueTasks.length === 0 && (
              <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-slate-850 bg-slate-900/10">
                <ClipboardList className="w-10 h-10 text-slate-850 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-400">No deliverables found</h4>
                <p className="text-xs text-slate-500 mt-1">
                  {filter === 'pending' 
                    ? 'Excellent! No upcoming workload deliverables.' 
                    : 'No tasks match the selected filter category.'}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
