'use client';

import React, { useState, useEffect } from 'react';
import { useBatch } from '@/store/BatchContext';
import { useAuth } from '@/store/AuthContext';
import { Notice, ClassSession, Resource, CourseAttendance, Task } from '@/types';
import { db } from '@/lib/firebase';
import { Timestamp, collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { seedDefaultSchedules } from '@/lib/seedSchedules';
import { SUBJECT_OPTIONS } from '@/lib/subjectOptions';
import { 
  Megaphone, 
  Send, 
  Users, 
  GraduationCap, 
  ShieldAlert, 
  Mail, 
  MapPin,
  Calendar,
  Clock,
  Trash2,
  Plus,
  RefreshCw,
  Sparkles,
  X,
  BookOpen,
  FileText,
  Video,
  Link2,
  FolderOpen,
  Edit2,
  CheckSquare,
  Percent,
  AlertCircle
} from 'lucide-react';
import { shareOnWhatsApp } from '@/lib/whatsapp';
import { normalizeDriveLink, detectResourceType } from '@/lib/drive';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  subscribeToAttendance, 
  addAttendanceRecord, 
  updateAttendanceRecord, 
  deleteAttendanceRecord 
} from '@/lib/attendanceService';

const AccordionItem: React.FC<{
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  activeSection: string | null;
  toggleSection: (id: string) => void;
  children: React.ReactNode;
}> = ({ id, title, subtitle, icon: Icon, activeSection, toggleSection, children }) => {
  const isOpen = activeSection === id;
  return (
    <div className={`rounded-3xl border transition-all duration-300 overflow-hidden bg-slate-900/40 backdrop-blur-md ${
      isOpen ? 'border-indigo-500/40 shadow-lg shadow-indigo-505 bg-slate-900/60' : 'border-slate-800/80 hover:border-slate-700/60'
    }`}>
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full px-6 py-4 flex items-center justify-between gap-4 cursor-pointer text-left focus:outline-none"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${
            isOpen ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400' : 'bg-slate-950 border-slate-850 text-slate-400'
          }`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">{title}</h4>
            <p className="text-[10px] text-slate-500 font-semibold truncate leading-tight mt-0.5">{subtitle}</p>
          </div>
        </div>
        
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-slate-505 hover:text-slate-350 shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
          >
            <div className="px-6 pb-6 pt-2 border-t border-slate-850/40">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: number;
  icon: any;
}> = ({ title, value, icon: Icon }) => (
  <div className="p-4 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md flex items-center justify-between hover:border-slate-700/60 transition-all duration-300 group hover:shadow-lg hover:shadow-indigo-505">
    <div className="space-y-1">
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">{title}</span>
      <span className="text-xl font-black text-slate-100 tracking-tight block leading-none">{value}</span>
    </div>
    <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all duration-300">
      <Icon className="w-5 h-5" />
    </div>
  </div>
);

export default function AdminPage() {
  const { role } = useAuth();
  const { 
    notices,
    addNotice, 
    faculty, 
    timetable, 
    addSchedule, 
    updateSchedule, 
    deleteSchedule,
    resources,
    addResource,
    updateResource,
    deleteResource,
    tasks,
    addTask,
    deleteTask
  } = useBatch();
  
  const isAdmin = role === 'admin';

  // Accordion active state
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const toggleSection = (id: string) => {
    setActiveSection(prev => prev === id ? null : id);
  };

  // Task Publisher Form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState('Corporate Finance');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskPriority, setTaskPriority] = useState<Task['priority']>('medium');
  const [taskAssignedTo, setTaskAssignedTo] = useState('all');
  const [taskSuccess, setTaskSuccess] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Attendance controls state
  const [selectedStudentAttendance, setSelectedStudentAttendance] = useState<CourseAttendance[]>([]);
  const [attSubject, setAttSubject] = useState('Corporate Finance');
  const [attTotal, setAttTotal] = useState(0);
  const [attAttended, setAttAttended] = useState(0);
  const [editingAttId, setEditingAttId] = useState<string | null>(null);

  // Notice Form state
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeCategory, setNoticeCategory] = useState<Notice['category']>('academic');
  const [noticePriority, setNoticePriority] = useState<Notice['priority']>('medium');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticePinned, setNoticePinned] = useState(false);
  const [noticeExpiresAt, setNoticeExpiresAt] = useState('');
  const [noticePublished, setNoticePublished] = useState(false);

  // Timetable Form state
  const [classSubject, setClassSubject] = useState('');
  const [classDate, setClassDate] = useState('');
  const [classTime, setClassTime] = useState('09:00 AM - 10:30 AM');
  const [classRoom, setClassRoom] = useState('LHC-101');
  const [classProfessor, setClassProfessor] = useState('');
  const [classStatus, setClassStatus] = useState<ClassSession['status']>('upcoming');
  
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [seedingLoading, setSeedingLoading] = useState(false);
  const [crudError, setCrudError] = useState<string | null>(null);
  const [lastScheduleActionForShare, setLastScheduleActionForShare] = useState<{
    action: 'added' | 'updated' | 'removed';
    subject: string;
    date: string;
    time: string;
    room: string;
  } | null>(null);

  // Subject Assignment module states
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [adminSelectedSubjectOption, setAdminSelectedSubjectOption] = useState('');
  const [adminCustomSubjectInput, setAdminCustomSubjectInput] = useState('');

  // Resource Manager state
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceDescription, setResourceDescription] = useState('');
  const [resourceSubject, setResourceSubject] = useState('Corporate Finance');
  const [resourceType, setResourceType] = useState<'pdf' | 'ppt' | 'doc' | 'link' | 'video'>('pdf');
  const [resourceDriveLink, setResourceDriveLink] = useState('');
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [resourceSuccess, setResourceSuccess] = useState<string | null>(null);
  const [resourceSubmitting, setResourceSubmitting] = useState(false);

  // Notice creation state: targetSubjects
  const [noticeTargetSubjects, setNoticeTargetSubjects] = useState<string[]>([]);

  const handleToggleNoticeSubject = (subject: string) => {
    if (noticeTargetSubjects.includes(subject)) {
      setNoticeTargetSubjects(prev => prev.filter(s => s !== subject));
    } else {
      setNoticeTargetSubjects(prev => [...prev, subject]);
    }
  };

  const getNoticeAudienceCount = () => {
    if (noticeTargetSubjects.length === 0) {
      return students.length;
    }
    const normalizedTargets = noticeTargetSubjects.map(sub => sub.trim().toLowerCase());
    return students.filter(student =>
      (student.subjects || []).some((sub: string) =>
        normalizedTargets.includes(sub.trim().toLowerCase())
      )
    ).length;
  };

  // Fetch all students in real-time
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uList = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      setStudents(uList);
    }, (err) => {
      console.error("Failed to fetch students:", err);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  // Sync selectedStudent from database real-time snapshot
  const activeStudentData = selectedStudent
    ? students.find(s => s.uid === selectedStudent.uid) || selectedStudent
    : null;

  const filteredStudents = students.filter(s =>
    (s.name || '').toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
    (s.rollNumber || '').toLowerCase().includes(searchStudentQuery.toLowerCase())
  );

  const handleAddSubjectToStudent = async (subjectName: string) => {
    if (!activeStudentData || !subjectName.trim()) return;
    const sanitized = subjectName.trim();
    const currentSubjects = activeStudentData.subjects || [];
    const isDuplicate = currentSubjects.some(
      (sub: string) => sub.toLowerCase() === sanitized.toLowerCase()
    );
    if (isDuplicate) {
      alert(`Subject "${sanitized}" is already assigned to this student.`);
      return;
    }
    const updated = [...currentSubjects, sanitized];
    try {
      const userRef = doc(db, 'users', activeStudentData.uid);
      await updateDoc(userRef, { subjects: updated });
    } catch (err: any) {
      alert(err.message || "Failed to add subject");
    }
  };

  const handleRemoveSubjectFromStudent = async (subjectToRemove: string) => {
    if (!activeStudentData) return;
    const currentSubjects = activeStudentData.subjects || [];
    const updated = currentSubjects.filter((sub: string) => sub !== subjectToRemove);
    try {
      const userRef = doc(db, 'users', activeStudentData.uid);
      await updateDoc(userRef, { subjects: updated });
    } catch (err: any) {
      alert(err.message || "Failed to remove subject");
    }
  };

  const handlePublishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;
    setCrudError(null);
    
    try {
      let expiryTimestamp: Timestamp | null = null;
      if (noticeExpiresAt) {
        const parts = noticeExpiresAt.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        const localDate = new Date(year, month, day, 23, 59, 59);
        expiryTimestamp = Timestamp.fromDate(localDate);
      }
      await addNotice(
        noticeTitle,
        noticeContent,
        noticeCategory,
        noticePriority,
        expiryTimestamp,
        noticePinned,
        noticeTargetSubjects
      );
      setNoticeTitle('');
      setNoticeContent('');
      setNoticeCategory('academic');
      setNoticePriority('medium');
      setNoticePinned(false);
      setNoticeExpiresAt('');
      setNoticeTargetSubjects([]);
      setNoticePublished(true);
      setTimeout(() => setNoticePublished(false), 3000);
    } catch (err: any) {
      setCrudError(err.message || 'Failed to post notice.');
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classSubject.trim() || !classDate || !classProfessor.trim()) return;
    setCrudError(null);

    try {
      await addSchedule({
        subject: classSubject,
        date: classDate,
        time: classTime,
        room: classRoom,
        professor: classProfessor,
        status: classStatus
      });

      setLastScheduleActionForShare({
        action: 'added',
        subject: classSubject,
        date: classDate,
        time: classTime,
        room: classRoom
      });

      setClassSubject('');
      setClassDate('');
      setClassProfessor('');
      setScheduleSuccess(true);
      setTimeout(() => setScheduleSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setCrudError(err.message || 'Failed to add class schedule.');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: ClassSession['status']) => {
    setCrudError(null);
    let newStatus: ClassSession['status'] = 'ongoing';
    if (currentStatus === 'ongoing') newStatus = 'completed';
    else if (currentStatus === 'completed') newStatus = 'upcoming';

    const session = timetable.find(t => t.id === id);
    try {
      await updateSchedule(id, { status: newStatus });
      if (session) {
        setLastScheduleActionForShare({
          action: 'updated',
          subject: session.subject,
          date: session.date,
          time: session.time,
          room: session.room
        });
      }
    } catch (err: any) {
      setCrudError(err.message || 'Failed to update schedule status.');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class slot?')) return;
    setCrudError(null);
    const session = timetable.find(t => t.id === id);
    try {
      if (session) {
        setLastScheduleActionForShare({
          action: 'removed',
          subject: session.subject,
          date: session.date,
          time: session.time,
          room: session.room
        });
      }
      await deleteSchedule(id);
    } catch (err: any) {
      setCrudError(err.message || 'Failed to delete schedule.');
    }
  };

  const handleDriveLinkChange = (val: string) => {
    setResourceDriveLink(val);
    if (val) {
      const detected = detectResourceType(val);
      if (detected !== 'link') {
        setResourceType(detected);
      }
    }
  };

  const handleAddOrUpdateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceTitle.trim() || !resourceDriveLink.trim()) return;
    setCrudError(null);
    setResourceSubmitting(true);
    setResourceSuccess(null);

    try {
      const normalizedLink = normalizeDriveLink(resourceDriveLink);

      if (selectedResourceId) {
        await updateResource(selectedResourceId, {
          title: resourceTitle,
          description: resourceDescription,
          subject: resourceSubject,
          type: resourceType,
          driveLink: normalizedLink
        });
        setResourceSuccess("Resource updated successfully!");
      } else {
        await addResource(
          resourceTitle,
          resourceDescription,
          resourceSubject,
          resourceType,
          normalizedLink
        );
        setResourceSuccess("Resource uploaded successfully!");
      }

      // Reset form
      setResourceTitle('');
      setResourceDescription('');
      setResourceSubject('Corporate Finance');
      setResourceType('pdf');
      setResourceDriveLink('');
      setSelectedResourceId(null);
      setTimeout(() => setResourceSuccess(null), 3000);
    } catch (err: any) {
      setCrudError(err.message || 'Failed to save resource.');
    } finally {
      setResourceSubmitting(false);
    }
  };

  const handleSelectEditResource = (res: Resource) => {
    setSelectedResourceId(res.id);
    setResourceTitle(res.title);
    setResourceDescription(res.description || '');
    setResourceSubject(res.subject);
    setResourceType(res.type);
    setResourceDriveLink(res.driveLink);
    
    // Scroll to form or highlight
    const el = document.getElementById('resource-form-header');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this study resource?')) return;
    setCrudError(null);
    setResourceSuccess(null);
    try {
      await deleteResource(id);
      if (selectedResourceId === id) {
        setSelectedResourceId(null);
        setResourceTitle('');
        setResourceDescription('');
        setResourceDriveLink('');
      }
      setResourceSuccess("Resource deleted successfully!");
      setTimeout(() => setResourceSuccess(null), 3000);
    } catch (err: any) {
      setCrudError(err.message || 'Failed to delete resource.');
    }
  };

  const handleSeedSchedules = async () => {
    setSeedingLoading(true);
    setCrudError(null);
    try {
      await seedDefaultSchedules(db);
      alert('Timetable collection seeded with current calendar week dates successfully!');
    } catch (err: any) {
      console.error(err);
      setCrudError(err.message || 'Failed to seed schedules database.');
    } finally {
      setSeedingLoading(false);
    }
  };

  // Selected Student Attendance Subscription
  useEffect(() => {
    if (!selectedStudent) {
      setSelectedStudentAttendance([]);
      return;
    }
    const unsubscribe = subscribeToAttendance(
      selectedStudent.uid,
      (records) => {
        setSelectedStudentAttendance(records);
      },
      (error) => {
        console.error("Failed to load selected student attendance", error);
      }
    );
    return () => unsubscribe();
  }, [selectedStudent]);

  // Attendance Controls Handlers
  const handleAddOrUpdateStudentAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    
    try {
      if (editingAttId) {
        await updateAttendanceRecord(selectedStudent.uid, editingAttId, {
          totalClasses: Number(attTotal),
          attendedClasses: Number(attAttended)
        });
        setEditingAttId(null);
        toast.success("Attendance record updated successfully!");
      } else {
        await addAttendanceRecord(selectedStudent.uid, attSubject, Number(attTotal), Number(attAttended));
        toast.success("Attendance record added successfully!");
      }
      setAttTotal(0);
      setAttAttended(0);
    } catch (err: any) {
      alert(err.message || "Failed to save attendance");
    }
  };

  const handleDeleteStudentAttendance = async (id: string) => {
    if (!selectedStudent || !confirm("Are you sure you want to delete this attendance record?")) return;
    try {
      await deleteAttendanceRecord(selectedStudent.uid, id);
      if (editingAttId === id) {
        setEditingAttId(null);
        setAttTotal(0);
        setAttAttended(0);
      }
      toast.success("Attendance record deleted successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to delete attendance");
    }
  };

  // Task Publisher Handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDeadline) return;
    setCrudError(null);
    setTaskSubmitting(true);
    setTaskSuccess(false);

    try {
      const parts = taskDeadline.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const localDate = new Date(year, month, day, 23, 59, 59);
      const deadlineTimestamp = Timestamp.fromDate(localDate);

      await addTask(taskTitle, taskSubject, deadlineTimestamp, taskPriority, taskAssignedTo);
      
      setTaskTitle('');
      setTaskDeadline('');
      setTaskPriority('medium');
      setTaskAssignedTo('all');
      setTaskSuccess(true);
      setTimeout(() => setTaskSuccess(false), 3000);
    } catch (err: any) {
      setCrudError(err.message || 'Failed to create task.');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task deliverable?')) return;
    setCrudError(null);
    try {
      await deleteTask(id);
      toast.success("Task deleted successfully!");
    } catch (err: any) {
      setCrudError(err.message || 'Failed to delete task.');
    }
  };

  const avgAttendance = 83; // cohort avg %
  const cohortGpa = "3.42 / 4.00";
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="space-y-6 pb-10"
    >
      
      {/* SaaS Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight leading-tight">Admin Hub</h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">Control center to publish notices, manage schedules, and track cohort metrics.</p>
        </div>
      </div>
      
      {isAdmin && lastScheduleActionForShare && (
        <div className="p-4 rounded-3xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.528 1.977 14.07 1.95 11.996 1.95c-5.44 0-9.866 4.372-9.87 9.802 0 1.972.518 3.902 1.5 5.619l-.993 3.634 3.731-.977zm11.587-6.845c-.322-.16-.1.905-.333-.53-.23-.115-1.371-.675-1.564-.741-.19-.066-.33-.1-.47.1-.14.2-.54.675-.662.815-.123.14-.246.156-.568-.005-.322-.16-1.358-.5-2.586-1.597-.954-.852-1.6-1.903-1.787-2.222-.187-.32-.02-.493.14-.652.145-.143.322-.377.483-.565.162-.188.216-.322.324-.534.11-.212.055-.398-.027-.558-.083-.16-.743-1.787-1.018-2.45-.269-.646-.54-.558-.742-.568-.19-.01-.41-.01-.63-.01-.22 0-.58.083-.883.415-.303.33-1.157 1.13-1.157 2.753s1.185 3.187 1.35 3.407c.165.22 2.332 3.563 5.65 5.002.788.34 1.405.544 1.885.697.79.25 1.513.214 2.083.13.635-.093 1.953-.798 2.228-1.57.275-.77.275-1.43.193-1.57-.083-.14-.303-.22-.625-.38z"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-wider block">Timetable Update Published!</span>
              <p className="text-xs text-slate-200 font-semibold truncate">Class "{lastScheduleActionForShare.subject}" ({lastScheduleActionForShare.action}). Share to WhatsApp.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => {
                const appUrl = window.location.origin;
                const dateObj = new Date(lastScheduleActionForShare.date);
                const formattedDate = isNaN(dateObj.getTime()) 
                  ? lastScheduleActionForShare.date 
                  : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const message = `📅 Timetable Update\n\n${lastScheduleActionForShare.subject}\n${formattedDate}\n${lastScheduleActionForShare.time}\nRoom: ${lastScheduleActionForShare.room}\n\nCheck BatchOS:\n${appUrl}/timetable`;
                shareOnWhatsApp(message);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/15 transition-all cursor-pointer whitespace-nowrap"
            >
              Share Update on WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setLastScheduleActionForShare(null)}
              className="p-2 rounded-xl bg-slate-955 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Role Banner warning */}
      <div className={`p-4 rounded-3xl border flex items-center gap-3 ${
        isAdmin 
          ? 'bg-indigo-955/20 border-indigo-500/10' 
          : 'bg-rose-505/5 border-rose-505/15'
      }`}>
        <ShieldAlert className={`w-5 h-5 flex-shrink-0 ${isAdmin ? 'text-indigo-400' : 'text-rose-455'}`} />
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider block">
            {isAdmin ? 'Representative Privileges Active' : 'Student Access Mode'}
          </span>
          <p className="text-[11px] text-slate-400 leading-normal">
            {isAdmin 
              ? 'You have permission to mutate notices and class schedules database records in Cloud Firestore.' 
              : 'You are viewing the Rep panel as a Student. Timetable database CRUD writes are disabled.'}
          </p>
        </div>
      </div>

      {/* CRUD Error Alert */}
      {crudError && (
        <div className="p-3.5 rounded-2xl bg-rose-505/5 border border-rose-505/15 text-rose-455 text-xs font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          <span>{crudError}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard title="Total Students" value={students.length} icon={Users} />
        <MetricCard title="Active Tasks" value={tasks.length} icon={CheckSquare} />
        <MetricCard title="Live Notices" value={notices.length} icon={Megaphone} />
        <MetricCard title="Uploaded Resources" value={resources.length} icon={FolderOpen} />
        <MetricCard title="Scheduled Classes" value={timetable.length} icon={Calendar} />
      </div>

      {/* Accordions Stack */}
      <div className="space-y-4">
        
        {/* Accordion 1: Schedule Management */}
        <AccordionItem 
          id="schedule" 
          title="Schedule Management" 
          subtitle="Manage class timetables, rooms, and seeder diagnostics" 
          icon={Calendar}
          activeSection={activeSection}
          toggleSection={toggleSection}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl bg-slate-950/40 border border-slate-900 p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" /> Schedule New Class Slot
                </h3>
                <form onSubmit={handleCreateSchedule} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Subject Topic</label>
                      <input
                        type="text"
                        placeholder="e.g. Valuation Models"
                        value={classSubject}
                        onChange={e => setClassSubject(e.target.value)}
                        disabled={!isAdmin}
                        className="w-full bg-slate-950 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Calendar Date</label>
                      <input
                        type="date"
                        value={classDate}
                        onChange={e => setClassDate(e.target.value)}
                        disabled={!isAdmin}
                        className="w-full bg-slate-950 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-3 py-2 text-xs text-slate-355 focus:outline-none focus:border-indigo-505 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Time Range</label>
                      <input
                        type="text"
                        value={classTime}
                        onChange={e => setClassTime(e.target.value)}
                        disabled={!isAdmin}
                        className="w-full bg-slate-950 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">LHC Lecture Room</label>
                      <input
                        type="text"
                        value={classRoom}
                        onChange={e => setClassRoom(e.target.value)}
                        disabled={!isAdmin}
                        className="w-full bg-slate-950 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Instructor</label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Aris Vasileiou"
                        value={classProfessor}
                        onChange={e => setClassProfessor(e.target.value)}
                        disabled={!isAdmin}
                        className="w-full bg-slate-950 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Session status</label>
                      <select
                        value={classStatus}
                        onChange={e => setClassStatus(e.target.value as ClassSession['status'])}
                        disabled={!isAdmin}
                        className="w-full bg-slate-950 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end items-center gap-4 pt-2">
                    {scheduleSuccess && (
                      <span className="text-xs text-emerald-400 font-bold">Class Scheduled Live!</span>
                    )}
                    <button
                      type="submit"
                      disabled={!isAdmin}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Publish Class Slot
                    </button>
                  </div>
                </form>
              </div>
            </div>
            <div className="space-y-6">
              <div className="rounded-2xl bg-slate-950/40 border border-slate-900 p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" /> Database Seeding
                </h3>
                <p className="text-[11px] text-slate-500 leading-normal mb-4">
                  Seed the Firestore `schedules` collection with standard mock MBA classes.
                </p>
                <button
                  onClick={handleSeedSchedules}
                  disabled={!isAdmin || seedingLoading}
                  className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-indigo-600 border border-slate-800 hover:border-indigo-500 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {seedingLoading ? (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" /> Seed Calendar Schedules
                    </>
                  )}
                </button>
              </div>
              
              <div className="rounded-2xl bg-slate-950/40 border border-slate-900 p-5 flex flex-col max-h-[300px]">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" /> Timetable Slots ({timetable.length})
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-900/60">
                  {timetable.map((session) => (
                    <div key={session.id} className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-indigo-400 truncate max-w-[120px]">{session.subject}</span>
                        <button
                          onClick={() => handleToggleStatus(session.id, session.status)}
                          disabled={!isAdmin}
                          className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 cursor-pointer"
                        >
                          {session.status}
                        </button>
                      </div>
                      <div className="flex flex-col gap-0.5 text-[10px] text-slate-500">
                        <div>Date: {session.date}</div>
                        <div>Time: {session.time}</div>
                        <div>Room: {session.room}</div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleDeleteSchedule(session.id)}
                          disabled={!isAdmin}
                          className="text-rose-500 hover:text-rose-455 disabled:opacity-30 disabled:cursor-not-allowed p-1 bg-slate-905 hover:bg-rose-500/10 rounded-lg border border-slate-850 hover:border-rose-500/20 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {timetable.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-6">No schedules found.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </AccordionItem>

        {/* Accordion 2: Notice Broadcast */}
        <AccordionItem 
          id="notices" 
          title="Notice Broadcast" 
          subtitle="Publish announcements and target elective groups" 
          icon={Megaphone}
          activeSection={activeSection}
          toggleSection={toggleSection}
        >
          <div className="rounded-2xl bg-slate-950/40 border border-slate-900 p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-indigo-400" /> Broadcast Notice to Batch
            </h3>
            <form onSubmit={handlePublishNotice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Notice Heading</label>
                  <input
                    type="text"
                    placeholder="e.g. Goldman Sachs placement talk changes"
                    value={noticeTitle}
                    onChange={e => setNoticeTitle(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full bg-slate-950 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-655 focus:outline-none focus:border-indigo-505 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Category</label>
                  <select
                    value={noticeCategory}
                    onChange={e => setNoticeCategory(e.target.value as Notice['category'])}
                    disabled={!isAdmin}
                    className="w-full bg-slate-950 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-3 py-2.5 text-xs text-slate-350 focus:outline-none"
                  >
                    <option value="academic">Academic</option>
                    <option value="placement">Placement</option>
                    <option value="event">Event</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Priority</label>
                  <select
                    value={noticePriority}
                    onChange={e => setNoticePriority(e.target.value as Notice['priority'])}
                    disabled={!isAdmin}
                    className="w-full bg-slate-950 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-3 py-2.5 text-xs text-slate-355 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={noticeExpiresAt}
                    onChange={e => setNoticeExpiresAt(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full bg-slate-950 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none focus:border-indigo-505 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2 mt-4 sm:mt-6 px-1">
                  <input
                    type="checkbox"
                    id="pinned-check"
                    checked={noticePinned}
                    onChange={e => setNoticePinned(e.target.checked)}
                    disabled={!isAdmin}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-600 cursor-pointer"
                  />
                  <label htmlFor="pinned-check" className="text-xs text-slate-300 font-semibold cursor-pointer">
                    Pin notice (Stay on Top)
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-2">Target Elective Subjects (Optional - Global if None)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {SUBJECT_OPTIONS.map(opt => {
                      const isSelected = noticeTargetSubjects.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleToggleNoticeSubject(opt)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-505 text-white shadow shadow-indigo-600/20'
                              : 'bg-slate-955 border-slate-850 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-505 font-bold">
                    Audience Size: <span className="text-indigo-400">{getNoticeAudienceCount()}</span> / {students.length} students will receive this notice
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Announcement Details</label>
                  <textarea
                    rows={4}
                    placeholder="Details for the broadcast..."
                    value={noticeContent}
                    onChange={e => setNoticeContent(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full bg-slate-955 border border-slate-805 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 py-2.5 text-xs text-slate-205 placeholder-slate-655 focus:outline-none focus:border-indigo-505 transition-colors resize-none leading-relaxed"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end items-center gap-4 pt-2">
                {noticePublished && (
                  <span className="text-xs text-emerald-400 font-bold">Notice broadcasted successfully!</span>
                )}
                <button
                  type="submit"
                  disabled={!isAdmin}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Send className="w-4 h-4" /> Publish Broadcast
                </button>
              </div>
            </form>
          </div>
        </AccordionItem>

        {/* Accordion 3: Task Publisher */}
        <AccordionItem 
          id="tasks" 
          title="Task Publisher" 
          subtitle="Schedule deliverable assignments and deadlines" 
          icon={CheckSquare}
          activeSection={activeSection}
          toggleSection={toggleSection}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl bg-slate-950/40 border border-slate-900 p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-indigo-400" /> Schedule deliverable task
                </h3>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Task Deliverable Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Finance Term Paper Submission"
                        value={taskTitle}
                        onChange={e => setTaskTitle(e.target.value)}
                        disabled={!isAdmin || taskSubmitting}
                        className="w-full bg-slate-955 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-505 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Calendar Deadline</label>
                      <input
                        type="date"
                        value={taskDeadline}
                        onChange={e => setTaskDeadline(e.target.value)}
                        disabled={!isAdmin || taskSubmitting}
                        className="w-full bg-slate-955 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none focus:border-indigo-505 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Course / Domain</label>
                      <select
                        value={taskSubject}
                        onChange={e => setTaskSubject(e.target.value)}
                        disabled={!isAdmin || taskSubmitting}
                        className="w-full bg-slate-955 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-505"
                      >
                        {SUBJECT_OPTIONS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Urgency Priority</label>
                      <select
                        value={taskPriority}
                        onChange={e => setTaskPriority(e.target.value as any)}
                        disabled={!isAdmin || taskSubmitting}
                        className="w-full bg-slate-955 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-505"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Assigned Target Audience</label>
                      <select
                        value={taskAssignedTo}
                        onChange={e => setTaskAssignedTo(e.target.value)}
                        disabled={!isAdmin || taskSubmitting}
                        className="w-full bg-slate-955 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-505"
                      >
                        <option value="all">Entire Batch (Global)</option>
                        <option value="subject">Elective Enrolled Only</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end items-center gap-4 pt-2">
                    {taskSuccess && (
                      <span className="text-xs text-emerald-400 font-bold">Deliverable Published Successfully!</span>
                    )}
                    <button
                      type="submit"
                      disabled={!isAdmin || taskSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      {taskSubmitting ? 'Publishing...' : 'Schedule Deliverable'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
            
            <div className="rounded-2xl bg-slate-950/40 border border-slate-900 p-5 flex flex-col max-h-[360px]">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-405" /> Existing Tasks ({tasks.length})
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 divide-y divide-slate-900/60">
                {tasks.map((task) => (
                  <div key={task.id} className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-450 border border-indigo-900/50 text-[9px] font-bold uppercase tracking-wider">
                        {task.subject}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                        task.priority === 'high' ? 'bg-rose-500/10 text-rose-455 border border-rose-505/20' :
                        task.priority === 'medium' ? 'bg-amber-500/10 text-amber-450 border border-amber-505/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                    <span className="font-bold text-xs text-slate-205 block truncate">{task.title}</span>
                    <span className="text-[10px] text-slate-500">
                      Due: {task.deadline ? new Date(task.deadline.toMillis()).toLocaleDateString() : 'N/A'}
                    </span>
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        disabled={!isAdmin}
                        className="text-rose-500 hover:text-rose-455 disabled:opacity-30 disabled:cursor-not-allowed p-1.5 bg-slate-955 border border-slate-850 hover:border-rose-500/20 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-xs text-slate-505 text-center py-6">No scheduled tasks found.</p>
                )}
              </div>
            </div>
          </div>
        </AccordionItem>

        {/* Accordion 4: Resource Manager */}
        <AccordionItem 
          id="resources" 
          title="Resource Manager" 
          subtitle="Upload and share Google Drive academic files" 
          icon={FolderOpen}
          activeSection={activeSection}
          toggleSection={toggleSection}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl bg-slate-950/40 border border-slate-900 p-5 space-y-6">
                <h3 id="resource-form-header" className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-indigo-400" /> 
                  {selectedResourceId ? 'Edit Study Resource' : 'Add Study Resource'}
                </h3>
                {resourceSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 text-xs font-medium">
                    {resourceSuccess}
                  </div>
                )}
                <form onSubmit={handleAddOrUpdateResource} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Resource Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Valuation Case Study templates"
                        value={resourceTitle}
                        onChange={e => setResourceTitle(e.target.value)}
                        disabled={!isAdmin || resourceSubmitting}
                        className="w-full bg-slate-955 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 py-2.5 text-xs text-slate-205 placeholder-slate-650 focus:outline-none focus:border-indigo-505 transition-colors"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Description</label>
                      <textarea
                        rows={2}
                        placeholder="Add brief details about the file, links, instructions..."
                        value={resourceDescription}
                        onChange={e => setResourceDescription(e.target.value)}
                        disabled={!isAdmin || resourceSubmitting}
                        className="w-full bg-slate-955 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 py-2.5 text-xs text-slate-205 placeholder-slate-655 focus:outline-none focus:border-indigo-505 transition-colors resize-none leading-relaxed"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Google Drive Link</label>
                      <input
                        type="url"
                        placeholder="Paste docs.google.com/presentation, docs.google.com/document or drive.google.com/file..."
                        value={resourceDriveLink}
                        onChange={e => handleDriveLinkChange(e.target.value)}
                        disabled={!isAdmin || resourceSubmitting}
                        className="w-full bg-slate-955 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 py-2.5 text-xs text-slate-205 placeholder-slate-650 focus:outline-none focus:border-indigo-505 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Course / Domain</label>
                      <select
                        value={resourceSubject}
                        onChange={e => setResourceSubject(e.target.value)}
                        disabled={!isAdmin || resourceSubmitting}
                        className="w-full bg-slate-955 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-505 transition-colors cursor-pointer"
                      >
                        {SUBJECT_OPTIONS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">File Type Override</label>
                      <select
                        value={resourceType}
                        onChange={e => setResourceType(e.target.value as any)}
                        disabled={!isAdmin || resourceSubmitting}
                        className="w-full bg-slate-955 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-505 transition-colors cursor-pointer"
                      >
                        <option value="pdf">PDF</option>
                        <option value="ppt">PPT / Slide</option>
                        <option value="doc">DOC / Document</option>
                        <option value="link">Web Link</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end items-center gap-2 pt-2">
                    {selectedResourceId && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedResourceId(null);
                          setResourceTitle('');
                          setResourceDescription('');
                          setResourceDriveLink('');
                          setResourceSubject('Corporate Finance');
                          setResourceType('pdf');
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-955 hover:bg-slate-900 border border-slate-850 text-slate-450 text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!isAdmin || resourceSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      {resourceSubmitting ? 'Saving...' : selectedResourceId ? 'Save Resource' : 'Add Resource'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
            
            <div className="rounded-2xl bg-slate-955/20 border border-slate-900 p-5 flex flex-col max-h-[365px]">
              <span className="block text-[10px] text-slate-455 font-bold uppercase tracking-wider mb-3">Existing Study Resources ({resources.length})</span>
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 divide-y divide-slate-900/60">
                {resources.length === 0 ? (
                  <p className="text-xs text-slate-505 text-center py-4">No study resources uploaded yet.</p>
                ) : (
                  resources.map((res) => {
                    const typeLabels: Record<string, string> = {
                      pdf: "PDF Document",
                      ppt: "PowerPoint Slide",
                      doc: "Word Document",
                      link: "Reference Link",
                      video: "Video Recording"
                    };
                    return (
                      <div 
                        key={res.id} 
                        className={`flex items-start justify-between p-3.5 transition-colors rounded-xl border ${
                          selectedResourceId === res.id 
                            ? 'bg-indigo-950/20 border-indigo-500/40' 
                            : 'bg-slate-955/40 border-slate-855/80 hover:border-slate-800'
                        } mt-2`}
                      >
                        <div className="min-w-0 flex-1 pr-4">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-900/60 text-[9px] font-bold uppercase tracking-wider">
                              {res.subject}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-805 text-[9px] font-semibold">
                              {typeLabels[res.type] || res.type.toUpperCase()}
                            </span>
                          </div>
                          <span className="font-bold text-xs text-slate-200 block truncate">{res.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSelectEditResource(res)}
                            disabled={!isAdmin}
                            className="p-1.5 rounded-lg bg-slate-955 border border-slate-850 hover:border-indigo-500/20 text-slate-450 hover:text-indigo-400 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteResource(res.id)}
                            disabled={!isAdmin}
                            className="p-1.5 rounded-lg bg-slate-955 border border-slate-850 hover:border-rose-500/20 text-slate-455 hover:text-rose-455 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </AccordionItem>

        {/* Accordion 5: Subject Assignment */}
        <AccordionItem 
          id="assignment" 
          title="Subject Assignment" 
          subtitle="Assign student custom and predefined course electives" 
          icon={Users}
          activeSection={activeSection}
          toggleSection={toggleSection}
        >
          <div className="rounded-2xl bg-slate-950/40 border border-slate-900 p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" /> Subject Assignment Module
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Search Student</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by student name or email..."
                    value={searchStudentQuery}
                    onChange={e => setSearchStudentQuery(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full bg-slate-955 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-205 placeholder-slate-655 focus:outline-none focus:border-indigo-505"
                  />
                  <div className="absolute left-3 top-3.5">
                    <svg className="w-3.5 h-3.5 text-slate-505" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  </div>
                </div>
              </div>

              <div className="max-h-[160px] overflow-y-auto border border-slate-850 rounded-xl bg-slate-950/65 divide-y divide-slate-850">
                {filteredStudents.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No students found.</p>
                ) : (
                  filteredStudents.map(student => (
                    <button
                      key={student.uid}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full flex items-center justify-between p-2.5 text-left text-xs transition-colors hover:bg-slate-900/60 cursor-pointer ${
                        activeStudentData?.uid === student.uid ? 'bg-indigo-600/10 text-indigo-300' : 'text-slate-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold block truncate">{student.name || 'No Name'}</span>
                        <span className="text-[10px] text-slate-500 block truncate">{student.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 uppercase">
                          {student.role || 'student'}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-955 text-indigo-400 border border-indigo-900">
                          {(student.subjects || []).length} subjects
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {activeStudentData && (
                <div className="p-4 bg-slate-955 border border-slate-850 rounded-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                    <div>
                      <h4 className="text-xs font-bold text-slate-205">{activeStudentData.name}</h4>
                      <p className="text-[10px] text-slate-500">{activeStudentData.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-350 cursor-pointer"
                    >
                      Deselect
                    </button>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Assigned Subjects</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(activeStudentData.subjects || []).length === 0 ? (
                        <span className="text-xs text-slate-505 italic py-1">No subjects assigned yet.</span>
                      ) : (
                        (activeStudentData.subjects || []).map((sub: string) => (
                          <div
                            key={sub}
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 pl-2.5 pr-1.5 py-1 rounded"
                          >
                            <span>{sub}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSubjectFromStudent(sub)}
                              className="text-indigo-400 hover:text-rose-455 p-0.5 cursor-pointer"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="border-t border-slate-850 pt-3.5 space-y-3">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assign New Subject</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[9px] text-slate-500 font-bold uppercase">Predefined Options</label>
                        <div className="flex gap-2">
                          <select
                            value={adminSelectedSubjectOption}
                            onChange={e => setAdminSelectedSubjectOption(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none"
                          >
                            <option value="">-- Choose suggested --</option>
                            {SUBJECT_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              if (adminSelectedSubjectOption) {
                                handleAddSubjectToStudent(adminSelectedSubjectOption);
                                setAdminSelectedSubjectOption('');
                              }
                            }}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[9px] text-slate-505 font-bold uppercase">Custom Name (Electives)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. Behavioral Finance"
                            value={adminCustomSubjectInput}
                            onChange={e => setAdminCustomSubjectInput(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-205 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (adminCustomSubjectInput.trim()) {
                                handleAddSubjectToStudent(adminCustomSubjectInput);
                                setAdminCustomSubjectInput('');
                              }
                            }}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </AccordionItem>

        {/* Accordion 6: Attendance Controls */}
        <AccordionItem 
          id="attendance" 
          title="Attendance Controls" 
          subtitle="Track and modify student attendance logs" 
          icon={Percent}
          activeSection={activeSection}
          toggleSection={toggleSection}
        >
          <div className="rounded-2xl bg-slate-950/40 border border-slate-900 p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Percent className="w-4 h-4 text-indigo-400" /> Attendance Controls Module
            </h3>
            
            {activeStudentData ? (
              <div className="space-y-6">
                <div className="p-4 bg-slate-955 border border-slate-850 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Managing Attendance for</span>
                    <h4 className="text-xs font-bold text-slate-205 mt-0.5">{activeStudentData.name} ({activeStudentData.email})</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="text-[10px] font-black text-rose-455 hover:text-rose-350 cursor-pointer"
                  >
                    Deselect Student
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Form */}
                  <div className="md:col-span-1 p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-4">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      {editingAttId ? 'Edit Attendance Record' : 'Add Attendance Record'}
                    </span>
                    <form onSubmit={handleAddOrUpdateStudentAttendance} className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Subject</label>
                        {editingAttId ? (
                          <input
                            type="text"
                            value={attSubject}
                            disabled
                            className="w-full bg-slate-900 border border-slate-800 disabled:opacity-50 rounded-xl px-3 py-2 text-xs text-slate-400"
                          />
                        ) : (
                          <select
                            value={attSubject}
                            onChange={e => setAttSubject(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none"
                          >
                            {SUBJECT_OPTIONS.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-455 font-bold uppercase mb-1">Attended</label>
                          <input
                            type="number"
                            min="0"
                            value={attAttended}
                            onChange={e => setAttAttended(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-455 font-bold uppercase mb-1">Total</label>
                          <input
                            type="number"
                            min="0"
                            value={attTotal}
                            onChange={e => setAttTotal(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        {editingAttId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAttId(null);
                              setAttTotal(0);
                              setAttAttended(0);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 text-[10px] font-bold border border-slate-850 cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Save Record
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Listing */}
                  <div className="md:col-span-2 space-y-3">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Student Attendance Logs ({(activeStudentData.subjects || []).length} Course Assignments)
                    </span>
                    <div className="border border-slate-850 rounded-xl overflow-hidden divide-y divide-slate-850 bg-slate-900/10">
                      {selectedStudentAttendance.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-8 bg-slate-950/20">No attendance logs found for this student. Use the form to seed logs.</p>
                      ) : (
                        selectedStudentAttendance.map(record => {
                          const percent = record.totalClasses > 0 ? (record.attendedClasses / record.totalClasses) * 100 : 0;
                          return (
                            <div key={record.id} className="p-3.5 flex items-center justify-between gap-4 bg-slate-950/20 hover:bg-slate-950/40 transition-colors">
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-slate-200 block truncate">{record.subject}</span>
                                <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                                  Classes: {record.attendedClasses} / {record.totalClasses}
                                </span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={`text-xs font-black px-2 py-0.5 rounded border ${
                                  percent >= 75 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-455 border-rose-505/20'
                                }`}>
                                  {Math.round(percent)}%
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => {
                                      setEditingAttId(record.id);
                                      setAttSubject(record.subject);
                                      setAttTotal(record.totalClasses);
                                      setAttAttended(record.attendedClasses);
                                    }}
                                    className="p-1 rounded bg-slate-955 border border-slate-850 text-slate-400 hover:text-indigo-400 hover:border-indigo-505/20 cursor-pointer"
                                    title="Edit logs"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStudentAttendance(record.id)}
                                    className="p-1 rounded bg-slate-955 border border-slate-850 text-slate-405 hover:text-rose-455 hover:border-rose-505/20 cursor-pointer"
                                    title="Delete logs"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-3 bg-slate-950/30 border border-dashed border-slate-850 rounded-2xl animate-fadeIn">
                <AlertCircle className="w-8 h-8 text-slate-605" />
                <div className="max-w-sm">
                  <h4 className="text-xs font-bold text-slate-350">No Student Selected</h4>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Please search and select a student from the **Subject Assignment** section above to load and manage their attendance logs.
                  </p>
                </div>
              </div>
            )}
          </div>
        </AccordionItem>

        {/* Accordion 7: Faculty Directory */}
        <AccordionItem 
          id="faculty" 
          title="Faculty Directory" 
          subtitle="View and copy instructor contact coordinates" 
          icon={GraduationCap}
          activeSection={activeSection}
          toggleSection={toggleSection}
        >
          <div className="rounded-2xl bg-slate-950/40 border border-slate-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-400" /> Faculty Directories
              </h3>
              <span className="text-[10px] text-slate-505 font-semibold">Total: {faculty.length}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {faculty.map((member) => (
                <div key={member.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-indigo-405 font-bold block">{member.designation}</span>
                    <h4 className="text-sm font-bold text-slate-205 mt-0.5">{member.name}</h4>
                    <div className="space-y-1 mt-3 text-xs text-slate-450">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="text-[11px] text-slate-400 leading-tight truncate">{member.office}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-505 flex-shrink-0" />
                        <span className="text-[11px] text-slate-400 leading-tight truncate">{member.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={async () => {
                        try {
                          if (navigator.clipboard) {
                            await navigator.clipboard.writeText(member.email);
                            toast.success("Professor email copied to clipboard");
                          } else {
                            throw new Error("Clipboard API not available");
                          }
                        } catch (err) {
                          window.location.href = `mailto:${member.email}`;
                        }
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-500 border border-indigo-505 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow shadow-indigo-650/10"
                    >
                      <Mail className="w-3 h-3" /> Copy Email
                    </button>
                    <button 
                      onClick={() => {
                        window.location.href = `mailto:${member.email}`;
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-450 hover:text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      title="Open Mail Client"
                    >
                      Open Mail
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AccordionItem>

      </div>

    </motion.div>
  );
}
