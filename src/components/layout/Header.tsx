'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useBatch } from '../../store/BatchContext';
import { useAuth } from '../../store/AuthContext';
import { Bell, Calendar, User, Pin, Clock, Percent, Megaphone, Moon, Sun, Sparkles, Eye, Download } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import Link from 'next/link';
import { toast } from 'sonner';

export const Header: React.FC = () => {
  const pathname = usePathname() || '/dashboard';
  const router = useRouter();
  
  const { notices, profile, attendance, tasks, timetable, markNoticeRead } = useBatch();
  const { user, userData, isTaskCompleted, role } = useAuth();
  const { canInstall, installApp } = usePWAInstall();
  
  const displayName = userData?.name || user?.displayName || profile.name;
  const avatarUrl = user?.photoURL || profile.avatarUrl;
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [readAlertIds, setReadAlertIds] = useState<string[]>([]);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState('theme-midnight');

  useEffect(() => {
    const savedTheme = localStorage.getItem('batchos-theme') || 'theme-midnight';
    setActiveTheme(savedTheme);
    const root = document.documentElement;
    root.classList.remove(
      "theme-midnight",
      "theme-paper",
      "theme-neo",
      "theme-glass"
    );
    root.classList.add(savedTheme);
  }, []);

  const changeTheme = (themeName: string) => {
    setActiveTheme(themeName);
    localStorage.setItem('batchos-theme', themeName);
    const root = document.documentElement;
    root.classList.remove(
      "theme-midnight",
      "theme-paper",
      "theme-neo",
      "theme-glass"
    );
    root.classList.add(themeName);
    root.style.colorScheme = (themeName === 'theme-paper') ? 'light' : 'dark';
    toast.success(`Theme switched to ${themeName.replace('theme-', '').toUpperCase()}`);
  };

  // Load read alerts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bos_read_alerts');
      if (stored) {
        setReadAlertIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load read alerts', e);
    }
  }, []);

  const getPageTitle = (path: string) => {
    const segment = path.split('/')[1] || 'dashboard';
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  const enrolledSubjects = userData?.subjects || [];
  const nowMs = Date.now();

  // 1. Filter and sort active (non-expired) notices targeting the user
  const activeNotices = notices.filter(n => {
    if (n.expiresAt && n.expiresAt.toMillis() < nowMs) return false;
    if (role === 'admin') return true;

    const targetSubs = n.targetSubjects || [];
    if (targetSubs.length === 0) return true;

    const normalizedTargets = targetSubs.map(sub => sub.trim().toLowerCase());
    return enrolledSubjects.some(
      sub => normalizedTargets.includes(sub.trim().toLowerCase())
    );
  });

  const sortedNotices = [...activeNotices].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });

  const unreadNotices = sortedNotices.filter(n => !n.read);

  // 2. Attendance Alerts (below 75%)
  const enrolledAttendance = attendance.filter(course =>
    enrolledSubjects.some(sub => sub.trim().toLowerCase() === course.subject.trim().toLowerCase())
  );

  const attendanceRisks = enrolledAttendance
    .filter(course => {
      if (course.totalClasses === 0) return false;
      const percent = (course.attendedClasses / course.totalClasses) * 100;
      return percent < 75;
    })
    .map(course => ({
      id: `attendance-risk-${course.id}`,
      type: 'attendance' as const,
      title: `Low attendance: ${course.subject}`,
      description: `Your attendance is ${Math.round((course.attendedClasses / course.totalClasses) * 100)}% (minimum 75% required).`,
      link: '/attendance'
    }));

  // 3. Urgent Task Deadlines (overdue or due in <= 3 days)
  const subjectFilteredTasks = tasks.filter(task => {
    const taskAssignedTo = (task.assignedTo || 'all').trim().toLowerCase();
    if (taskAssignedTo === 'all') return true;
    if (taskAssignedTo === 'subject') {
      const normalizedTaskSubject = (task.subject || '').trim().toLowerCase();
      return enrolledSubjects.some(
        sub => sub.trim().toLowerCase() === normalizedTaskSubject
      );
    }
    return false;
  });

  const urgentDeadlines = subjectFilteredTasks
    .filter(task => {
      const isCompleted = isTaskCompleted(task.id);
      if (isCompleted) return false;
      if (!task.deadline) return false;

      const deadlineMs = task.deadline.toMillis();
      const isOverdue = deadlineMs < nowMs;
      const isClose = (deadlineMs - nowMs) <= 3 * 24 * 60 * 60 * 1000;
      return isOverdue || isClose;
    })
    .map(task => {
      const deadlineMs = task.deadline.toMillis();
      const isOverdue = deadlineMs < nowMs;
      const daysLeft = Math.ceil((deadlineMs - nowMs) / (24 * 60 * 60 * 1000));
      let urgencyText = "";
      if (isOverdue) {
        urgencyText = "Overdue";
      } else if (daysLeft === 0) {
        urgencyText = "Due today";
      } else if (daysLeft === 1) {
        urgencyText = "Due tomorrow";
      } else {
        urgencyText = `Due in ${daysLeft} days`;
      }
      return {
        id: `task-deadline-${task.id}`,
        type: 'task' as const,
        title: `Urgent deadline: ${task.title}`,
        description: `${task.subject} | ${urgencyText}`,
        link: '/tasks',
        isOverdue
      };
    });

  // 4. Timetable Alerts (Today's classes)
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
  const todayDate = String(today.getDate()).padStart(2, '0');
  const todayStr = `${todayYear}-${todayMonth}-${todayDate}`;

  const todayClasses = timetable.filter(c => c.date === todayStr && (c.status === 'ongoing' || c.status === 'upcoming'));
  const timetableAlerts = todayClasses.map(c => ({
    id: `timetable-alert-${c.id}`,
    type: 'timetable' as const,
    title: `${c.status === 'ongoing' ? 'Ongoing Class' : 'Upcoming Class'}: ${c.subject}`,
    description: `${c.time} | Room ${c.room} by ${c.professor}`,
    link: '/timetable',
    status: c.status
  }));

  const allAlerts = [...attendanceRisks, ...urgentDeadlines, ...timetableAlerts];
  const unreadAlerts = allAlerts.filter(a => !readAlertIds.includes(a.id));

  const totalUnreadCount = unreadNotices.length + unreadAlerts.length;

  const handleToggleDropdown = () => {
    setIsDropdownOpen(prev => {
      const nextState = !prev;
      if (nextState) {
        // Mark unread notices read
        unreadNotices.forEach(n => {
          markNoticeRead(n.id);
        });

        // Mark all alerts read
        const alertIds = allAlerts.map(a => a.id);
        if (alertIds.length > 0) {
          try {
            const stored = localStorage.getItem('bos_read_alerts');
            const current: string[] = stored ? JSON.parse(stored) : [];
            const updated = Array.from(new Set([...current, ...alertIds]));
            localStorage.setItem('bos_read_alerts', JSON.stringify(updated));
            setReadAlertIds(updated);
          } catch (e) {
            console.error('Failed to save read alerts', e);
          }
        }
      }
      return nextState;
    });
  };

  const handleItemClick = (link: string) => {
    setIsDropdownOpen(false);
    router.push(link);
  };

  const getNoticeCategoryBadge = (category: string) => {
    switch (category) {
      case 'placement': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'academic': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'event': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'urgent': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const formatNoticeTime = (createdAt: any) => {
    if (!createdAt) return "";
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const todayStrHeader = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 py-3 lg:px-8 flex items-center justify-between">
      {/* Page Title / App Name */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2 group lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white font-extrabold text-sm tracking-tighter">B</span>
          </div>
        </Link>
        <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-4">
        {/* PWA Install Button */}
        {canInstall && (
          <button
            onClick={installApp}
            className="px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/15 transition-all cursor-pointer animate-pulse"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        )}

        {/* Date Widget */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-xs text-slate-300 font-medium">
          <Calendar className="w-3.5 h-3.5 text-indigo-450" />
          <span>{todayStrHeader}</span>
        </div>

        {/* Theme Switcher Button & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsThemeDropdownOpen(prev => !prev)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all duration-200 cursor-pointer flex items-center justify-center"
            title="Switch Theme"
          >
            {activeTheme === 'theme-midnight' && <Moon className="w-5 h-5 text-violet-400" />}
            {activeTheme === 'theme-paper' && <Sun className="w-5 h-5 text-orange-500" />}
            {activeTheme === 'theme-neo' && <Sparkles className="w-5 h-5 text-lime-400" />}
            {activeTheme === 'theme-glass' && <Eye className="w-5 h-5 text-cyan-400" />}
          </button>

          {isThemeDropdownOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsThemeDropdownOpen(false)} />
              
              {/* Dropdown Panel */}
              <div className="absolute right-0 mt-3 w-48 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-50 backdrop-blur-md overflow-hidden p-2 space-y-1 animate-fadeIn">
                <span className="block px-3 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-wider">Select Theme</span>
                {[
                  { id: 'theme-midnight', name: 'Midnight', icon: Moon, color: 'text-violet-400' },
                  { id: 'theme-paper', name: 'Paper', icon: Sun, color: 'text-orange-500' },
                  { id: 'theme-neo', name: 'Neo Brutalist', icon: Sparkles, color: 'text-lime-400' },
                  { id: 'theme-glass', name: 'Glass OS', icon: Eye, color: 'text-cyan-400' }
                ].map((t) => {
                  const ThemeIcon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        changeTheme(t.id);
                        setIsThemeDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                        activeTheme === t.id
                          ? 'bg-slate-900 text-slate-100 border border-slate-800'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                      }`}
                    >
                      <ThemeIcon className={`w-4.5 h-4.5 ${t.color}`} />
                      <span>{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Notifications Button & Dropdown */}
        <div className="relative">
          <button 
            onClick={handleToggleDropdown}
            className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all duration-200 cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {totalUnreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-gradient-to-r from-rose-500 to-red-600 border border-slate-950 flex items-center justify-center text-[10px] font-bold text-white leading-none">
                {totalUnreadCount}
              </span>
            )}
          </button>

          {isDropdownOpen && (
            <>
              {/* Backdrop Overlay to close dropdown */}
              <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsDropdownOpen(false)} />
              
              {/* Dropdown Panel Card */}
              <div className="absolute right-0 mt-3 w-80 sm:w-96 max-h-[480px] flex flex-col bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl z-50 backdrop-blur-md overflow-hidden animate-fadeIn">
                {/* Header */}
                <div className="p-4 border-b border-slate-850 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-black text-slate-200 uppercase tracking-wider">Inbox</span>
                  </div>
                  {totalUnreadCount > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {totalUnreadCount} New
                    </span>
                  )}
                </div>

                {/* List Body */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60 scrollbar-none">
                  {sortedNotices.length === 0 && allAlerts.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                      <Bell className="w-8 h-8 text-slate-800" />
                      <p className="text-xs font-bold text-slate-400">No new notifications</p>
                      <p className="text-[10px] text-slate-650">You're all caught up!</p>
                    </div>
                  ) : (
                    <>
                      {/* Section A: Recent Notices */}
                      {sortedNotices.length > 0 && (
                        <div className="py-2">
                          <span className="px-4 py-1 block text-[10px] font-black text-slate-500 uppercase tracking-wider bg-slate-900/20">
                            Recent Notices
                          </span>
                          {sortedNotices.map((notice) => (
                            <div 
                              key={notice.id} 
                              onClick={() => handleItemClick('/notices')}
                              className="px-4 py-3.5 hover:bg-slate-900/40 transition-colors flex items-start gap-3 cursor-pointer group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-900/50 flex items-center justify-center flex-shrink-0 group-hover:border-indigo-500/30 transition-all">
                                <Megaphone className="w-4 h-4 text-indigo-400" />
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${getNoticeCategoryBadge(notice.category)}`}>
                                    {notice.category}
                                  </span>
                                  {notice.pinned && <Pin className="w-3 h-3 text-indigo-400 rotate-45 shrink-0" />}
                                  <span className="text-[9px] text-slate-500 font-semibold">{formatNoticeTime(notice.createdAt)}</span>
                                </div>
                                <span className="text-xs font-bold text-slate-200 block truncate group-hover:text-indigo-300 transition-colors leading-tight">
                                  {notice.title}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Section B: System Alerts */}
                      {allAlerts.length > 0 && (
                        <div className="py-2">
                          <span className="px-4 py-1 block text-[10px] font-black text-slate-500 uppercase tracking-wider bg-slate-900/20">
                            System Alerts
                          </span>
                          {allAlerts.map((alert) => (
                            <div 
                              key={alert.id}
                              onClick={() => handleItemClick(alert.link)}
                              className="px-4 py-3.5 hover:bg-slate-900/40 transition-colors flex items-start gap-3 cursor-pointer group"
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                                alert.type === 'attendance' 
                                  ? 'bg-rose-950/60 border border-rose-900/50 group-hover:border-rose-500/30' 
                                  : alert.type === 'task' 
                                    ? 'bg-amber-950/60 border border-amber-900/50 group-hover:border-amber-500/30' 
                                    : 'bg-indigo-950/60 border border-indigo-900/50 group-hover:border-indigo-500/30'
                              }`}>
                                {alert.type === 'attendance' ? (
                                  <Percent className="w-4 h-4 text-rose-450" />
                                ) : alert.type === 'task' ? (
                                  <Clock className="w-4 h-4 text-amber-450" />
                                ) : (
                                  <Calendar className="w-4 h-4 text-indigo-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                                    alert.type === 'attendance' 
                                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                      : alert.type === 'task' 
                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                  }`}>
                                    {alert.type === 'attendance' ? 'Attendance' : alert.type === 'task' ? 'Deadline' : 'Class'}
                                  </span>
                                  {!readAlertIds.includes(alert.id) && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                  )}
                                </div>
                                <span className="text-xs font-bold text-slate-200 block truncate group-hover:text-indigo-300 transition-colors leading-tight">
                                  {alert.title}
                                </span>
                                <p className="text-[10px] text-slate-400 truncate leading-relaxed">
                                  {alert.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User profile avatar link */}
        <Link href="/profile" className="flex items-center gap-2 group">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:border-indigo-500">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-indigo-400" />
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-slate-950"></span>
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-200 leading-tight group-hover:text-white transition-colors">
              {displayName}
            </span>
            <span className="text-[10px] text-slate-400 leading-none">
              {userData?.rollNumber || profile.rollNo}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
};
