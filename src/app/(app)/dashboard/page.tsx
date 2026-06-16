'use client';

import React from 'react';
import { useBatch } from '@/store/BatchContext';
import { useAuth } from '@/store/AuthContext';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Megaphone,
  Percent,
  PlusCircle,
  User,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { tasks, notices, attendance, profile, timetable } = useBatch();
  const { user, userData, isTaskCompleted, role } = useAuth();

  const userName = userData?.name || user?.displayName || profile.name;
  const enrolledSubjects = userData?.subjects || [];

  // Find active or upcoming classes for today
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
  const todayDate = String(today.getDate()).padStart(2, '0');
  const todayStr = `${todayYear}-${todayMonth}-${todayDate}`;
  
  const currentClass = timetable.find(c => c.date === todayStr && c.status === 'ongoing');
  const upcomingClass = timetable.find(c => c.date === todayStr && c.status === 'upcoming');

  // Calculate overall attendance for enrolled subjects only
  const enrolledAttendance = attendance.filter(course =>
    enrolledSubjects.some(sub => sub.trim().toLowerCase() === course.subject.trim().toLowerCase())
  );
  const totalAttended = enrolledAttendance.reduce((acc, curr) => acc + curr.attendedClasses, 0);
  const totalClasses = enrolledAttendance.reduce((acc, curr) => acc + curr.totalClasses, 0);
  const overallAttendancePercent = totalClasses > 0
    ? Math.round((totalAttended / totalClasses) * 100)
    : 0;

  // Filter active notices (exclude expired ones, and filter by enrolled subjects for students)
  const nowMs = Date.now();
  const activeNotices = notices.filter(n => {
    // 1. Exclude expired
    if (n.expiresAt && n.expiresAt.toMillis() < nowMs) return false;
    
    // 2. Admin sees everything
    if (role === 'admin') return true;
    
    // 3. Filter by assigned subjects with normalization and backward compatibility
    const targetSubs = n.targetSubjects || [];
    if (targetSubs.length === 0) return true; // Global notice -> show to everyone
    
    const normalizedTargets = targetSubs.map(sub => sub.trim().toLowerCase());
    return enrolledSubjects.some(
      sub => normalizedTargets.includes(sub.trim().toLowerCase())
    );
  });

  // Sort them: pinned first, then by createdAt descending
  const sortedNotices = [...activeNotices].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });

  const top3Notices = sortedNotices.slice(0, 3);
  const unreadNoticesCount = activeNotices.filter(n => !n.read).length;

  // Filter pending upcoming tasks (incomplete, deadline in the future relative to now, filtered by subjects)
  const pendingTasks = tasks.filter(t => {
    const isCompleted = isTaskCompleted(t.id);
    const isUpcoming = t.deadline && t.deadline.toMillis() >= nowMs;
    
    const taskAssignedTo = (t.assignedTo || 'all').trim().toLowerCase();
    if (taskAssignedTo === 'all') {
      return !isCompleted && isUpcoming;
    }
    
    if (taskAssignedTo === 'subject') {
      const normalizedTaskSubject = (t.subject || '').trim().toLowerCase();
      const isEnrolled = enrolledSubjects.some(
        sub => sub.trim().toLowerCase() === normalizedTaskSubject
      );
      return !isCompleted && isUpcoming && isEnrolled;
    }
    
    return false;
  }).slice(0, 3);

  // Greeting based on time
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  } as const;

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="show" 
      className="space-y-8 pb-10"
    >
      {enrolledSubjects.length === 0 && (
        <motion.div 
          variants={itemVariants}
          className="flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5 text-amber-255"
        >
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-300">Request Subject Assignment</h4>
            <p className="text-xs text-amber-500/80 mt-1">
              Your enrolled subjects are managed by your administrator. Please contact your representative/administrator to assign subjects to your profile so we can filter tasks, resources, and track attendance.
            </p>
          </div>
        </motion.div>
      )}

      {/* Editorial Title Block */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight leading-tight">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">Real-time cohort overview, upcoming schedules, and task tracker.</p>
        </div>
      </motion.div>

      {/* Welcome Greeting Banner */}
      <motion.div 
        variants={itemVariants} 
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 via-violet-900/40 to-slate-900 border border-indigo-500/15 p-6 sm:p-8 hover:border-indigo-500/30 transition-all duration-300"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs tracking-wider uppercase mb-1">
               <span>Section: {profile.section || "A"}</span>
               <span>•</span>
               <span>{profile.specialization || "General Management"}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              {getGreeting()}, {userName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-lg leading-relaxed">
              Welcome back! You have {pendingTasks.length} pending academic deliverables and {unreadNoticesCount} unread notices.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-4 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center border border-indigo-500/10">
              <Percent className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-black tracking-wider uppercase block leading-none">OVERALL ATTENDANCE</span>
              <span className={`text-xl font-black tracking-tight ${overallAttendancePercent >= 75 ? 'text-emerald-400' : 'text-rose-455'
                }`}>
                {overallAttendancePercent}%
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Grid Layout for Modules - Asymmetric Column layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

        {/* Left/Middle Column (Class schedule & Notices) - Asymmetric 2/3 width */}
        <div className="md:col-span-2 space-y-6">

          {/* Class Tracker Card */}
          <motion.div variants={itemVariants} className="premium-card p-6 sm:p-8 relative overflow-hidden">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" /> Today's Lecture Status
            </h3>

            {currentClass ? (
              <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/25 shadow-inner">
                <div className="flex items-center justify-between mb-3.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider badge-ongoing">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    ONGOING NOW
                  </span>
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Room: {currentClass.room}
                  </span>
                </div>
                <h4 className="text-xl font-extrabold text-slate-100">{currentClass.subject}</h4>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 text-xs text-slate-400 gap-2">
                  <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-indigo-450" /> {currentClass.professor}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-450" /> {currentClass.time}</span>
                </div>
              </div>
            ) : upcomingClass ? (
              <div className="p-5 rounded-2xl bg-slate-950 border border-border-main">
                <div className="flex items-center justify-between mb-3.5">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider badge-upcoming">
                    UPCOMING NEXT
                  </span>
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Room: {upcomingClass.room}
                  </span>
                </div>
                <h4 className="text-xl font-extrabold text-slate-200">{upcomingClass.subject}</h4>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 text-xs text-slate-400 gap-2">
                  <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-indigo-450" /> {upcomingClass.professor}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-450" /> {upcomingClass.time}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 px-4 border border-dashed border-border-main rounded-2xl">
                <p className="text-xs text-slate-500 font-semibold">No scheduled lectures in session right now.</p>
                <Link href="/timetable" className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-350 font-bold mt-3 transition-colors cursor-pointer">
                  View Full Schedule <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </motion.div>

          {/* Important Notices */}
          <motion.div variants={itemVariants} className="premium-card p-6 sm:p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-400" /> Announcements ({unreadNoticesCount} unread)
              </h3>
              <Link href="/notices" className="text-xs font-bold text-indigo-400 hover:text-indigo-350 transition-colors cursor-pointer">
                View All ({activeNotices.length})
              </Link>
            </div>

            <div className="space-y-4">
              {top3Notices.map((notice) => {
                const dateLabel = notice.createdAt
                  ? notice.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '';
                const isUrgent = notice.category === 'urgent';
                return (
                  <div key={notice.id} className="p-5 rounded-2xl bg-slate-950/40 border border-border-main hover:border-slate-700/60 transition-colors relative group">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                        isUrgent 
                          ? 'badge-urgent' 
                          : notice.category === 'placement'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : notice.category === 'event'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {notice.category}
                      </span>
                      <div className="flex items-center gap-2">
                        {notice.pinned && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider badge-pinned">PINNED</span>
                        )}
                        <span className="text-[10px] text-slate-500 font-bold">{dateLabel}</span>
                        {!notice.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" title="Unread" />
                        )}
                      </div>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-200 line-clamp-1 group-hover:text-indigo-400 transition-colors leading-tight">{notice.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">{notice.content}</p>
                  </div>
                );
              })}
              {top3Notices.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">No notices posted recently.</p>
              )}
            </div>
          </motion.div>

        </div>

        {/* Right Column (Tasks Panel) - Asymmetric 1/3 width */}
        <div className="space-y-6">

          {/* Attendance Alerts Card */}
          <motion.div variants={itemVariants} className="premium-card p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-455" /> Attendance Alerts
              </h3>
              <Link href="/attendance" className="text-xs font-bold text-indigo-400 hover:text-indigo-355 transition-colors cursor-pointer">
                Track
              </Link>
            </div>

            <div className="space-y-3">
              {enrolledAttendance.filter(course => {
                const percent = course.totalClasses > 0 ? (course.attendedClasses / course.totalClasses) * 100 : 0;
                return percent < 75 && course.totalClasses > 0;
              }).map(course => {
                const percent = Math.round((course.attendedClasses / course.totalClasses) * 100);
                const neededClasses = (3 * course.totalClasses) - (4 * course.attendedClasses);
                return (
                  <div key={course.id} className="p-4 rounded-xl bg-rose-950/10 border border-rose-500/20 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-rose-455 flex items-center gap-1.5 leading-none">
                        ⚠ {course.subject}
                      </span>
                      <span className="text-xs font-black text-rose-400 bg-rose-500/10 border border-rose-505/20 px-1.5 py-0.5 rounded leading-none">{percent}%</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Need <strong className="text-slate-200">{neededClasses}</strong> consecutive class{neededClasses > 1 ? 'es' : ''} to recover.
                    </p>
                  </div>
                );
              })}
              {enrolledAttendance.filter(course => {
                const percent = course.totalClasses > 0 ? (course.attendedClasses / course.totalClasses) * 100 : 0;
                return percent < 75 && course.totalClasses > 0;
              }).length === 0 && (
                <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-950/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-450 shrink-0" />
                  <span>You're safe across all subjects</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Upcoming Tasks Card */}
          <motion.div variants={itemVariants} className="premium-card p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Urgent Deliverables
              </h3>
              <Link href="/tasks" className="text-xs font-bold text-indigo-400 hover:text-indigo-350 transition-colors cursor-pointer">
                Manage
              </Link>
            </div>

            <div className="flex-1 space-y-3">
              {pendingTasks.map((task) => {
                const dateLabel = task.deadline
                  ? task.deadline.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '';
                const isHigh = task.priority === 'high';
                return (
                  <div key={task.id} className="p-4 rounded-xl bg-slate-950/40 border border-border-main flex flex-col gap-2 hover:border-slate-700/60 transition-all group duration-300">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] text-indigo-400 font-black tracking-wide truncate max-w-[120px]">{task.subject}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border leading-none ${
                        isHigh
                          ? 'badge-urgent'
                          : task.priority === 'medium'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {task.priority.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-200 leading-snug line-clamp-2 group-hover:text-indigo-400 transition-colors">{task.title}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Due: {dateLabel}</span>
                    </div>
                  </div>
                );
              })}
              {pendingTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/30 mb-2" />
                  <p className="text-xs text-slate-500 font-bold">All cleared! No pending deliverables.</p>
                </div>
              )}
            </div>

            {/* Quick Add Button */}
            <div className="mt-4 pt-4 border-t border-border-main">
              <Link href="/tasks" className="premium-button w-full py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15 cursor-pointer">
                <PlusCircle className="w-4 h-4" /> Add Academic Task
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
