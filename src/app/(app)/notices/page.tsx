'use client';

import React, { useState, useEffect } from 'react';
import { useBatch } from '@/store/BatchContext';
import { useAuth } from '@/store/AuthContext';
import { Notice } from '@/types';
import { db } from '@/lib/firebase';
import { Timestamp, collection, query, onSnapshot } from 'firebase/firestore';
import { SUBJECT_OPTIONS } from '@/lib/subjectOptions';
import { 
  Megaphone, 
  Pin, 
  Calendar, 
  Eye, 
  X, 
  Trash2, 
  Edit2, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Sparkles,
  Award
} from 'lucide-react';
import { shareOnWhatsApp } from '@/lib/whatsapp';

const filterTabs = [
  { id: 'All', label: 'All' },
  { id: 'academic', label: 'Academic' },
  { id: 'placement', label: 'Placement' },
  { id: 'event', label: 'Events' },
  { id: 'urgent', label: 'Urgent' }
] as const;

export default function NoticesPage() {
  const { role } = useAuth();
  const { notices, noticesLoading, addNotice, updateNotice, deleteNotice, markNoticeRead } = useBatch();
  
  const isAdmin = role === 'admin';
  const [selectedCategory, setSelectedCategory] = useState<Notice['category'] | 'All'>('All');
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null);
  
  // Admin Notice Modal state
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<Notice['category']>('academic');
  const [formPriority, setFormPriority] = useState<Notice['priority']>('medium');
  const [formPinned, setFormPinned] = useState(false);
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdNoticeForShare, setCreatedNoticeForShare] = useState<{ title: string } | null>(null);

  // targetSubjects state and students count fetcher
  const { userData } = useAuth();
  const [formTargetSubjects, setFormTargetSubjects] = useState<string[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(doc => doc.data()));
    }, (err) => {
      console.error("Failed to fetch students in notices page:", err);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleToggleFormSubject = (subject: string) => {
    if (formTargetSubjects.includes(subject)) {
      setFormTargetSubjects(prev => prev.filter(s => s !== subject));
    } else {
      setFormTargetSubjects(prev => [...prev, subject]);
    }
  };

  const getFormAudienceCount = () => {
    if (formTargetSubjects.length === 0) {
      return students.length;
    }
    const normalizedTargets = formTargetSubjects.map(sub => sub.trim().toLowerCase());
    return students.filter(student =>
      (student.subjects || []).some((sub: string) =>
        normalizedTargets.includes(sub.trim().toLowerCase())
      )
    ).length;
  };

  const handleOpenNotice = (notice: Notice) => {
    setActiveNotice(notice);
    if (!notice.read) {
      markNoticeRead(notice.id);
    }
  };

  const handleCloseNotice = () => {
    setActiveNotice(null);
  };

  const handleOpenAddModal = () => {
    setEditMode(false);
    setSelectedNoticeId(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('academic');
    setFormPriority('medium');
    setFormPinned(false);
    setFormExpiresAt('');
    setFormTargetSubjects([]);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (notice: Notice, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening details modal
    setEditMode(true);
    setSelectedNoticeId(notice.id);
    setFormTitle(notice.title);
    setFormContent(notice.content);
    setFormCategory(notice.category);
    setFormPriority(notice.priority);
    setFormPinned(notice.pinned);
    setFormExpiresAt(notice.expiresAt ? notice.expiresAt.toDate().toISOString().split('T')[0] : '');
    setFormTargetSubjects(notice.targetSubjects || []);
    setFormError(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening details modal
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteNotice(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete notice.');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;
    setSubmitting(true);
    setFormError(null);

    try {
      let expiryTimestamp: Timestamp | null = null;
      if (formExpiresAt) {
        const parts = formExpiresAt.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        const localDate = new Date(year, month, day, 23, 59, 59);
        expiryTimestamp = Timestamp.fromDate(localDate);
      }

      if (editMode && selectedNoticeId) {
        await updateNotice(selectedNoticeId, {
          title: formTitle,
          content: formContent,
          category: formCategory,
          priority: formPriority,
          expiresAt: expiryTimestamp,
          pinned: formPinned,
          targetSubjects: formTargetSubjects
        });
      } else {
        await addNotice(
          formTitle,
          formContent,
          formCategory,
          formPriority,
          expiryTimestamp,
          formPinned,
          formTargetSubjects
        );
        setCreatedNoticeForShare({
          title: formTitle
        });
      }
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryColor = (category: Notice['category']) => {
    switch (category) {
      case 'placement': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'academic': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'event': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'urgent': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    }
  };

  const getPriorityColor = (priority: Notice['priority']) => {
    switch (priority) {
      case 'high': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'low': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    }
  };

  // 1. Filter out expired notices
  const nowMs = Date.now();
  const activeNotices = notices.filter(n => !n.expiresAt || n.expiresAt.toMillis() >= nowMs);

  const enrolledSubjects = userData?.subjects || [];

  // 2. Filter by assigned subjects using normalization and backward compatibility
  const subjectFilteredNotices = activeNotices.filter(notice => {
    if (role === 'admin') return true; // Admins see all notices
    
    const targetSubs = notice.targetSubjects || [];
    if (targetSubs.length === 0) {
      return true; // Global notice -> show to everyone
    }
    
    const normalizedTargets = targetSubs.map(sub => sub.trim().toLowerCase());
    return enrolledSubjects.some(
      sub => normalizedTargets.includes(sub.trim().toLowerCase())
    );
  });

  // 3. Filter by category selection
  const filteredNotices = subjectFilteredNotices.filter(n => {
    if (selectedCategory === 'All') return true;
    return n.category === selectedCategory;
  });

  if (noticesLoading) {
    return (
      <div className="space-y-4">
        {/* Category bar loading */}
        <div className="h-14 bg-slate-900/40 rounded-2xl border border-slate-800/80 animate-pulse" />
        {/* Notices listing skeletons */}
        {[1, 2, 3].map(n => (
          <div key={n} className="p-5 rounded-2xl border border-slate-850 bg-slate-900/20 animate-pulse space-y-3">
            <div className="flex gap-2">
              <div className="w-16 h-4 bg-slate-850 rounded" />
              <div className="w-24 h-4 bg-slate-850 rounded" />
            </div>
            <div className="w-2/3 h-5 bg-slate-850 rounded" />
            <div className="w-full h-4 bg-slate-850 rounded" />
            <div className="w-5/6 h-4 bg-slate-850 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      
      {isAdmin && createdNoticeForShare && (
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.528 1.977 14.07 1.95 11.996 1.95c-5.44 0-9.866 4.372-9.87 9.802 0 1.972.518 3.902 1.5 5.619l-.993 3.634 3.731-.977zm11.587-6.845c-.322-.16-.1.905-.333-.53-.23-.115-1.371-.675-1.564-.741-.19-.066-.33-.1-.47.1-.14.2-.54.675-.662.815-.123.14-.246.156-.568-.005-.322-.16-1.358-.5-2.586-1.597-.954-.852-1.6-1.903-1.787-2.222-.187-.32-.02-.493.14-.652.145-.143.322-.377.483-.565.162-.188.216-.322.324-.534.11-.212.055-.398-.027-.558-.083-.16-.743-1.787-1.018-2.45-.269-.646-.54-.558-.742-.568-.19-.01-.41-.01-.63-.01-.22 0-.58.083-.883.415-.303.33-1.157 1.13-1.157 2.753s1.185 3.187 1.35 3.407c.165.22 2.332 3.563 5.65 5.002.788.34 1.405.544 1.885.697.79.25 1.513.214 2.083.13.635-.093 1.953-.798 2.228-1.57.275-.77.275-1.43.193-1.57-.083-.14-.303-.22-.625-.38z"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-wider block">Announcement Broadcasted!</span>
              <p className="text-xs text-slate-200 font-semibold truncate">Share "{createdNoticeForShare.title}" to WhatsApp groups instantly.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => {
                const appUrl = window.location.origin;
                const message = `📢 New Notice\n\n${createdNoticeForShare.title}\n\nCheck details on BatchOS:\n${appUrl}/notices`;
                shareOnWhatsApp(message);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/15 transition-all cursor-pointer whitespace-nowrap"
            >
              Share on WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setCreatedNoticeForShare(null)}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header controls: Tabs and Add Announcement */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Category Navigation */}
        <div className="bg-slate-900/40 p-1.5 rounded-2xl border border-slate-800/80 backdrop-blur-sm flex items-center overflow-x-auto gap-1 self-start">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-w-[70px] cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Add Announcement Button (Only for Admins) */}
        {isAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Broadcast Announcement
          </button>
        )}
      </div>

      {/* Notices Feed */}
      <div className="space-y-4">
        {filteredNotices.map((notice) => {
          const isImportant = notice.pinned;
          const dateLabel = notice.createdAt
            ? notice.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '';
          
          return (
            <div
              key={notice.id}
              onClick={() => handleOpenNotice(notice)}
              className={`p-5 rounded-2xl border backdrop-blur-sm transition-all duration-300 relative cursor-pointer group ${
                isImportant 
                  ? 'bg-indigo-950/20 border-indigo-500/35 hover:border-indigo-500/50' 
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700/60'
              }`}
            >
              {/* Pinned / Priority badges */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                {isImportant && (
                  <span className="flex items-center gap-1 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-md text-[9px] font-bold text-indigo-400">
                    <Pin className="w-3 h-3 rotate-45" /> PINNED
                  </span>
                )}
                {isAdmin && (
                  <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleOpenEditModal(notice, e)}
                      className="p-1.5 rounded-lg bg-slate-950 border border-slate-850 hover:border-indigo-500/20 text-slate-500 hover:text-indigo-400 transition-all"
                      title="Edit announcement"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(notice.id, e)}
                      className="p-1.5 rounded-lg bg-slate-950 border border-slate-850 hover:border-rose-500/20 text-slate-500 hover:text-rose-455 transition-all"
                      title="Delete announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 pr-20">
                {/* Meta details */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide ${getCategoryColor(notice.category)}`}>
                    {notice.category}
                  </span>
                  
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide ${getPriorityColor(notice.priority)}`}>
                    {notice.priority} priority
                  </span>

                  {(notice.targetSubjects || []).map(sub => (
                    <span key={sub} className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
                      {sub}
                    </span>
                  ))}
                  
                  <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {dateLabel}
                  </span>

                  {!notice.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" title="Unread" />
                  )}
                </div>

                {/* Title */}
                <h3 className={`text-base font-bold transition-colors group-hover:text-indigo-400 ${
                  notice.read ? 'text-slate-350' : 'text-slate-100 font-extrabold'
                }`}>
                  {notice.title}
                </h3>

                {/* Snippet */}
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {notice.content}
                </p>

                {/* Footer trigger */}
                <div className="pt-1 flex items-center gap-1.5 text-[10px] text-slate-500 font-bold group-hover:text-indigo-400 transition-colors">
                  <Eye className="w-3.5 h-3.5" /> Read Announcement
                </div>
              </div>
            </div>
          );
        })}

        {filteredNotices.length === 0 && (
          <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-slate-800 bg-slate-900/10">
            <Megaphone className="w-10 h-10 text-slate-800 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-400">No Announcements</h4>
            <p className="text-xs text-slate-500 mt-1">
              There are no notices published in the "{selectedCategory}" folder.
            </p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {activeNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={handleCloseNotice} />
          
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl z-10 animate-zoomIn max-h-[90vh] overflow-y-auto">
            <button
              onClick={handleCloseNotice}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${getCategoryColor(activeNotice.category)}`}>
                {activeNotice.category}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">
                {activeNotice.createdAt ? activeNotice.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
              </span>
              {activeNotice.pinned && (
                <span className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md text-[9px] font-bold text-indigo-400 ml-auto">
                  <Pin className="w-2.5 h-2.5 rotate-45" /> Important
                </span>
              )}
            </div>

            <h3 className="text-lg font-black text-slate-100 mb-4 leading-snug">
              {activeNotice.title}
            </h3>

            <div className="text-sm text-slate-350 leading-relaxed space-y-4 border-t border-slate-850 pt-4 mb-6 whitespace-pre-line">
              {activeNotice.content}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] text-slate-500 pt-3 border-t border-slate-850">
              <span>Broadcasted by: <strong className="text-slate-300">{activeNotice.createdBy}</strong></span>
              {activeNotice.expiresAt && (
                <span>Expires: <strong className="text-rose-400">{activeNotice.expiresAt.toDate().toLocaleDateString()}</strong></span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Add / Edit Modal */}
      {isAdmin && showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 animate-zoomIn max-h-[95vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-extrabold text-slate-250 tracking-wider uppercase flex items-center gap-1.5 mb-5">
              <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
              {editMode ? 'Edit Announcement' : 'Create Batch Announcement'}
            </h3>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-455 text-xs flex items-center gap-1.5 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Title Heading</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Notice title summary"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-455 font-bold uppercase mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as Notice['category'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="academic">Academic</option>
                    <option value="placement">Placement</option>
                    <option value="event">Event</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-455 font-bold uppercase mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as Notice['priority'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-455 font-bold uppercase mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={formExpiresAt}
                    onChange={e => setFormExpiresAt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 mt-5 px-1">
                  <input
                    type="checkbox"
                    id="modal-pinned-check"
                    checked={formPinned}
                    onChange={e => setFormPinned(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-805 text-indigo-600 cursor-pointer"
                  />
                  <label htmlFor="modal-pinned-check" className="text-xs text-slate-300 font-semibold cursor-pointer">
                    Pin notice (Stay on top)
                  </label>
                </div>
              </div>

              {/* Target Elective Subjects Badges */}
              <div className="space-y-2">
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-2">Target Elective Subjects (Optional - Global if None)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SUBJECT_OPTIONS.map(opt => {
                    const isSelected = formTargetSubjects.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleToggleFormSubject(opt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-505 text-white shadow shadow-indigo-600/20'
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 font-bold">
                  Audience Size: <span className="text-indigo-400">{getFormAudienceCount()}</span> / {students.length} students will receive this notice
                </p>
              </div>

              <div>
                <label className="block text-[10px] text-slate-455 font-bold uppercase mb-1">Content Details</label>
                <textarea
                  rows={5}
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  placeholder="Enter notice details, links, schedules..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-805 text-slate-400 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
