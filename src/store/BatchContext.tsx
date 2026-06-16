'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Task, Notice, CourseAttendance, ClassSession, Resource, Faculty, StudentProfile } from '../types';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { getReadNotices, markNoticeRead as dbMarkNoticeRead } from '../lib/noticeReadState';
import {
  subscribeToAttendance,
  addAttendanceRecord,
  updateAttendanceRecord,
  incrementAttendanceRecord,
  deleteAttendanceRecord
} from '../lib/attendanceService';

interface BatchContextType {
  tasks: Task[];
  tasksLoading: boolean;
  addTask: (title: string, subject: string, deadline: Timestamp, priority: 'high' | 'medium' | 'low', assignedTo: string) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  notices: Notice[];
  noticesLoading: boolean;
  addNotice: (
    title: string,
    content: string,
    category: Notice['category'],
    priority: Notice['priority'],
    expiresAt: Timestamp | null,
    pinned: boolean,
    targetSubjects?: string[]
  ) => Promise<void>;
  updateNotice: (id: string, updates: Partial<Notice>) => Promise<void>;
  deleteNotice: (id: string) => Promise<void>;
  markNoticeRead: (id: string) => void;
  
  attendance: CourseAttendance[];
  attendanceLoading: boolean;
  addAttendanceRecord: (subject: string, totalClasses: number, attendedClasses: number) => Promise<void>;
  updateAttendanceRecord: (id: string, updates: Partial<CourseAttendance>) => Promise<void>;
  incrementAttendanceRecord: (id: string, attendedChange: number, totalChange: number) => Promise<void>;
  deleteAttendanceRecord: (id: string) => Promise<void>;
  
  profile: StudentProfile;
  updateProfile: (profile: Partial<StudentProfile>) => void;
  
  timetable: ClassSession[];
  timetableLoading: boolean;
  addSchedule: (session: Omit<ClassSession, 'id'>) => Promise<void>;
  updateSchedule: (id: string, updates: Partial<ClassSession>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  
  resources: Resource[];
  resourcesLoading: boolean;
  addResource: (title: string, description: string, subject: string, type: Resource['type'], driveLink: string) => Promise<void>;
  updateResource: (id: string, updates: Partial<Resource>) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  
  faculty: Faculty[];
}

const initialProfile: StudentProfile = {
  name: "Mayank Sharma",
  rollNo: "MBA2026042",
  section: "Section A",
  specialization: "Finance & Analytics",
  gpa: "3.84/4.00",
  email: "mayank.sharma@mba.edu",
  avatarUrl: ""
};



const initialResources: Resource[] = [];

const initialFaculty: Faculty[] = [
  { id: 'f1', name: 'Dr. Aris Vasileiou', designation: 'Professor of Corporate Finance', email: 'aris.v@mba.edu', office: 'Faculty Block B - Room 204' },
  { id: 'f2', name: 'Prof. Sarah Jenkins', designation: 'Associate Professor of Marketing', email: 's.jenkins@mba.edu', office: 'Faculty Block A - Room 102' },
  { id: 'f3', name: 'Dr. Kenji Tanaka', designation: 'Assistant Professor of Data Analytics', email: 'k.tanaka@mba.edu', office: 'Lab Office 2' },
  { id: 'f4', name: 'Dr. Julia Rossi', designation: 'Professor of Operations Research', email: 'j.rossi@mba.edu', office: 'Faculty Block B - Room 301' },
  { id: 'f5', name: 'Prof. Richard Bell', designation: 'Dean & Professor of Strategy', email: 'r.bell@mba.edu', office: 'Dean Office - Main Block' },
  { id: 'f6', name: 'Dr. Ellen Vance', designation: 'Associate Professor of Economics', email: 'e.vance@mba.edu', office: 'Faculty Block C - Room 105' },
];

const BatchContext = createContext<BatchContextType | undefined>(undefined);

export const BatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  
  const [rawNotices, setRawNotices] = useState<Notice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [readNoticeIds, setReadNoticeIds] = useState<string[]>([]);

  const [attendance, setAttendance] = useState<CourseAttendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile>(initialProfile);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  
  const [timetable, setTimetable] = useState<ClassSession[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from local storage
  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem('bos_profile');

      if (storedProfile) setProfile(JSON.parse(storedProfile));
    } catch (e) {
      console.error('Failed to load storage', e);
    }
    setReadNoticeIds(getReadNotices());
    setIsHydrated(true);
  }, []);

  const notices = rawNotices.map((n) => ({
    ...n,
    read: readNoticeIds.includes(n.id)
  }));

  // Sync real-time Firestore timetable/schedules
  useEffect(() => {
    setTimetableLoading(true);
    const schedulesCol = collection(db, 'schedules');
    
    const unsubscribe = onSnapshot(schedulesCol, (snapshot) => {
      const docsList: ClassSession[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          subject: data.subject || '',
          time: data.time || '',
          room: data.room || '',
          professor: data.professor || '',
          status: data.status || 'upcoming',
          date: data.date || ''
        };
      });
      
      const sorted = docsList.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });
      
      setTimetable(sorted);
      setTimetableLoading(false);
    }, (error) => {
      console.error('Firestore schedules listener failed:', error);
      setTimetableLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync real-time Firestore tasks
  useEffect(() => {
    setTasksLoading(true);
    const tasksCol = collection(db, 'tasks');
    
    const unsubscribe = onSnapshot(tasksCol, (snapshot) => {
      const docsList: Task[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          subject: data.subject || '',
          deadline: data.deadline, // Firestore Timestamp
          priority: data.priority || 'medium',
          assignedTo: data.assignedTo || 'all',
          createdAt: data.createdAt
        };
      });
      
      // Sort tasks by deadline ascending
      const sorted = docsList.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.toMillis() - b.deadline.toMillis();
      });
      
      setTasks(sorted);
      setTasksLoading(false);
    }, (error) => {
      console.error('Firestore tasks listener failed:', error);
      setTasksLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync real-time Firestore notices
  useEffect(() => {
    setNoticesLoading(true);
    const noticesCol = collection(db, 'notices');
    
    // Primary query ordered by pinned (desc) and createdAt (desc)
    const primaryQuery = query(noticesCol, orderBy('pinned', 'desc'), orderBy('createdAt', 'desc'));
    
    const handleSnapshot = (snapshot: any) => {
      const docsList: Notice[] = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          content: data.content || '',
          category: data.category || 'general',
          priority: data.priority || 'medium',
          createdBy: data.createdBy || '',
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          pinned: !!data.pinned,
          targetSubjects: data.targetSubjects || []
        };
      });
      setRawNotices(docsList);
      setNoticesLoading(false);
    };

    let unsubscribe = onSnapshot(primaryQuery, handleSnapshot, (error) => {
      console.warn('Firestore primary notices query failed (missing index). Falling back to basic query...', error);
      
      const fallbackQuery = query(noticesCol, orderBy('createdAt', 'desc'));
      
      unsubscribe = onSnapshot(fallbackQuery, (snapshot) => {
        const docsList: Notice[] = snapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || '',
            content: data.content || '',
            category: data.category || 'general',
            priority: data.priority || 'medium',
            createdBy: data.createdBy || '',
            createdAt: data.createdAt,
            expiresAt: data.expiresAt,
            pinned: !!data.pinned,
            targetSubjects: data.targetSubjects || []
          };
        });
        
        // Sort client-side so pinned notices float on top, then newest first
        const sorted = docsList.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        
        setRawNotices(sorted);
        setNoticesLoading(false);
      }, (fallbackError) => {
        console.error('Firestore fallback notices query failed:', fallbackError);
        setNoticesLoading(false);
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sync real-time Firestore attendance
  useEffect(() => {
    setAttendanceLoading(true);
    const unsubscribe = subscribeToAttendance(
      user?.uid,
      (records) => {
        setAttendance(records);
        setAttendanceLoading(false);
      },
      (error) => {
        console.error('Firestore attendance listener failed:', error);
        setAttendanceLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem('bos_profile', JSON.stringify(profile));
  }, [profile, isHydrated]);

  // Sync real-time Firestore resources
  useEffect(() => {
    setResourcesLoading(true);
    const resourcesCol = collection(db, 'resources');
    const q = query(resourcesCol, orderBy('createdAt', 'desc'));

    const handleSnapshot = (snapshot: any) => {
      const docsList: Resource[] = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          subject: data.subject || '',
          type: data.type || 'link',
          driveLink: data.driveLink || '',
          uploadedBy: data.uploadedBy || '',
          createdAt: data.createdAt
        };
      });
      setResources(docsList);
      setResourcesLoading(false);
    };

    let unsubscribe = onSnapshot(q, handleSnapshot, (error) => {
      console.warn('Firestore primary resources query failed (missing index). Falling back to basic query...', error);
      
      const fallbackQuery = query(resourcesCol);
      unsubscribe = onSnapshot(fallbackQuery, (snapshot) => {
        const docsList: Resource[] = snapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || '',
            description: data.description || '',
            subject: data.subject || '',
            type: data.type || 'link',
            driveLink: data.driveLink || '',
            uploadedBy: data.uploadedBy || '',
            createdAt: data.createdAt
          };
        });
        
        // Sort client-side by newest first
        const sorted = docsList.sort((a, b) => {
          const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        
        setResources(sorted);
        setResourcesLoading(false);
      }, (fallbackError) => {
        console.error('Firestore fallback resources query failed:', fallbackError);
        setResourcesLoading(false);
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const addNotice = async (
    title: string,
    content: string,
    category: Notice['category'],
    priority: Notice['priority'],
    expiresAt: Timestamp | null,
    pinned: boolean,
    targetSubjects: string[] = []
  ) => {
    validateRepRole();
    try {
      await addDoc(collection(db, 'notices'), {
        title,
        content,
        category,
        priority,
        expiresAt,
        pinned,
        targetSubjects,
        createdBy: profile.name || 'Admin',
        createdAt: serverTimestamp()
      });
      console.log("notice created");

      // Non-blocking trigger for push notification
      (async () => {
        try {
          const hasTargets = targetSubjects && targetSubjects.length > 0;
          const payload: any = {
            title: "New Notice",
            body: title,
            type: "notice",
            link: "/notices",
            audience: hasTargets ? "subject" : "all",
          };
          if (hasTargets) {
            payload.subject = targetSubjects[0];
          }

          const response = await fetch('/api/send-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          });
          const resData = await response.json();
          if (resData.success) {
            console.log("notice notification triggered");
          } else {
            console.log("notice notification failed", resData.error);
          }
        } catch (err) {
          console.log("notice notification failed", err);
        }
      })();

    } catch (error) {
      console.error('Error adding notice:', error);
      throw error;
    }
  };

  const updateNotice = async (id: string, updates: Partial<Notice>) => {
    validateRepRole();
    try {
      const docRef = doc(db, 'notices', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating notice:', error);
      throw error;
    }
  };

  const deleteNotice = async (id: string) => {
    validateRepRole();
    try {
      const docRef = doc(db, 'notices', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting notice:', error);
      throw error;
    }
  };

  const markNoticeRead = (id: string) => {
    dbMarkNoticeRead(id);
    setReadNoticeIds(getReadNotices());
  };

  const addAttendanceRecordContext = async (subject: string, totalClasses: number, attendedClasses: number) => {
    try {
      await addAttendanceRecord(
        user?.uid,
        subject,
        totalClasses,
        attendedClasses
      );
    } catch (error) {
      console.error('Error adding attendance record:', error);
      throw error;
    }
  };

  const updateAttendanceRecordContext = async (id: string, updates: Partial<CourseAttendance>) => {
    try {
      const { id: _, createdAt: __, ...cleanUpdates } = updates;
      const record = attendance.find(a => a.id === id);
      let transitionAlert = false;
      let subjectName = "";
      let newPercentRounded = 0;

      if (record) {
        subjectName = record.subject;
        const oldTotal = record.totalClasses;
        const oldAttended = record.attendedClasses;
        const oldPercent = oldTotal > 0 ? (oldAttended / oldTotal) * 100 : 100;

        const newTotal = updates.totalClasses !== undefined ? Number(updates.totalClasses) : oldTotal;
        const newAttended = updates.attendedClasses !== undefined ? Number(updates.attendedClasses) : oldAttended;
        const newPercent = newTotal > 0 ? (newAttended / newTotal) * 100 : 0;
        newPercentRounded = Math.round(newPercent);

        if (oldPercent >= 75 && newPercent < 75) {
          transitionAlert = true;
        }
      }

      await updateAttendanceRecord(user?.uid, id, cleanUpdates);
      console.log("attendance updated");

      if (transitionAlert) {
        (async () => {
          try {
            const response = await fetch('/api/send-notification', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: "Attendance Alert",
                body: `Your attendance in ${subjectName} dropped to ${newPercentRounded}%`,
                type: "attendance",
                link: "/attendance",
                audience: "self",
                uid: user?.uid
              })
            });
            const resData = await response.json();
            if (resData.success) {
              console.log("attendance notification triggered");
            } else {
              console.log("attendance notification failed", resData.error);
            }
          } catch (err) {
            console.log("attendance notification failed", err);
          }
        })();
      }
    } catch (error) {
      console.error('Error updating attendance record:', error);
      throw error;
    }
  };

  const incrementAttendanceRecordContext = async (id: string, attendedChange: number, totalChange: number) => {
    try {
      const record = attendance.find(a => a.id === id);
      let transitionAlert = false;
      let subjectName = "";
      let newPercentRounded = 0;

      if (record) {
        subjectName = record.subject;
        const oldTotal = record.totalClasses;
        const oldAttended = record.attendedClasses;
        const oldPercent = oldTotal > 0 ? (oldAttended / oldTotal) * 100 : 100;

        const newTotal = oldTotal + totalChange;
        const newAttended = oldAttended + attendedChange;
        const newPercent = newTotal > 0 ? (newAttended / newTotal) * 100 : 0;
        newPercentRounded = Math.round(newPercent);

        if (oldPercent >= 75 && newPercent < 75) {
          transitionAlert = true;
        }
      }

      await incrementAttendanceRecord(
        user?.uid,
        id,
        attendedChange,
        totalChange
      );
      console.log("attendance updated");

      if (transitionAlert) {
        (async () => {
          try {
            const response = await fetch('/api/send-notification', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: "Attendance Alert",
                body: `Your attendance in ${subjectName} dropped to ${newPercentRounded}%`,
                type: "attendance",
                link: "/attendance",
                audience: "self",
                uid: user?.uid
              })
            });
            const resData = await response.json();
            if (resData.success) {
              console.log("attendance notification triggered");
            } else {
              console.log("attendance notification failed", resData.error);
            }
          } catch (err) {
            console.log("attendance notification failed", err);
          }
        })();
      }
    } catch (error) {
      console.error('Error incrementing attendance record:', error);
      throw error;
    }
  };

  const deleteAttendanceRecordContext = async (id: string) => {
    try {
      await deleteAttendanceRecord(user?.uid, id);
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      throw error;
    }
  };

  const updateProfile = (updatedProfile: Partial<StudentProfile>) => {
    setProfile(prev => ({ ...prev, ...updatedProfile }));
  };

  const addResourceContext = async (
    title: string,
    description: string,
    subject: string,
    type: Resource['type'],
    driveLink: string
  ) => {
    validateRepRole();
    try {
      await addDoc(collection(db, 'resources'), {
        title,
        description,
        subject,
        type,
        driveLink,
        uploadedBy: profile.name || 'Admin',
        createdAt: serverTimestamp()
      });
      console.log("resource created");

      // Non-blocking trigger for push notification
      (async () => {
        try {
          const response = await fetch('/api/send-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: "New Study Resource",
              body: `${title} uploaded for ${subject}`,
              subject,
              type: "resource",
              link: "/resources",
              audience: "subject"
            })
          });
          const resData = await response.json();
          if (resData.success) {
            console.log("resource notification triggered");
          } else {
            console.log("resource notification failed", resData.error);
          }
        } catch (err) {
          console.log("resource notification failed", err);
        }
      })();
    } catch (error) {
      console.error('Error adding resource:', error);
      throw error;
    }
  };

  const updateResourceContext = async (id: string, updates: Partial<Resource>) => {
    validateRepRole();
    try {
      const docRef = doc(db, 'resources', id);
      const { id: _, createdAt: __, ...cleanUpdates } = updates;
      await updateDoc(docRef, cleanUpdates);
      console.log("resource updated");
    } catch (error) {
      console.error('Error updating resource:', error);
      throw error;
    }
  };

  const deleteResourceContext = async (id: string) => {
    validateRepRole();
    try {
      const docRef = doc(db, 'resources', id);
      await deleteDoc(docRef);
      console.log("resource deleted");
    } catch (error) {
      console.error('Error deleting resource:', error);
      throw error;
    }
  };

  // Firestore Schedule CRUD Actions with Role validation
  const validateRepRole = () => {
    if (role !== 'admin') {
      throw new Error('Unauthorized access: Only Batch Representatives (Admins) are authorized to make modifications.');
    }
  };

  const addSchedule = async (session: Omit<ClassSession, 'id'>) => {
    validateRepRole();
    try {
      await addDoc(collection(db, 'schedules'), session);
      console.log("schedule created");

      // Non-blocking trigger for push notification
      (async () => {
        try {
          const response = await fetch('/api/send-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: "New Class Added",
              body: `${session.subject} at ${session.time}`,
              type: "schedule",
              link: "/timetable",
              audience: "all"
            })
          });
          const resData = await response.json();
          if (resData.success) {
            console.log("schedule notification triggered");
          } else {
            console.log("schedule notification failed", resData.error);
          }
        } catch (err) {
          console.log("schedule notification failed", err);
        }
      })();

    } catch (error) {
      console.error('Error adding schedule:', error);
      throw error;
    }
  };

  const updateSchedule = async (id: string, updates: Partial<ClassSession>) => {
    validateRepRole();
    try {
      const docRef = doc(db, 'schedules', id);
      await updateDoc(docRef, updates);
      console.log("schedule updated");

      const currentSession = timetable.find(s => s.id === id);
      const subjectName = updates.subject || currentSession?.subject || "Class";

      // Non-blocking trigger for push notification
      (async () => {
        try {
          const response = await fetch('/api/send-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: "Class Updated",
              body: `${subjectName} updated`,
              type: "schedule",
              link: "/timetable",
              audience: "all"
            })
          });
          const resData = await response.json();
          if (resData.success) {
            console.log("schedule notification triggered");
          } else {
            console.log("schedule notification failed", resData.error);
          }
        } catch (err) {
          console.log("schedule notification failed", err);
        }
      })();

    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error;
    }
  };

  const deleteSchedule = async (id: string) => {
    validateRepRole();
    const currentSession = timetable.find(s => s.id === id);
    const subjectName = currentSession?.subject || "Class";
    try {
      const docRef = doc(db, 'schedules', id);
      await deleteDoc(docRef);
      console.log("schedule deleted");

      // Non-blocking trigger for push notification
      (async () => {
        try {
          const response = await fetch('/api/send-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: "Class Removed",
              body: `${subjectName} has been removed`,
              type: "schedule",
              link: "/timetable",
              audience: "all"
            })
          });
          const resData = await response.json();
          if (resData.success) {
            console.log("schedule notification triggered");
          } else {
            console.log("schedule notification failed", resData.error);
          }
        } catch (err) {
          console.log("schedule notification failed", err);
        }
      })();

    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }
  };

  // Firestore Tasks CRUD Actions with Role validation
  const addTask = async (
    title: string,
    subject: string,
    deadline: Timestamp,
    priority: 'high' | 'medium' | 'low',
    assignedTo: string = 'all'
  ) => {
    validateRepRole();
    try {
      await addDoc(collection(db, 'tasks'), {
        title,
        subject,
        deadline,
        priority,
        assignedTo,
        createdAt: serverTimestamp()
      });
      console.log("task created");

      // Non-blocking trigger for push notification
      (async () => {
        try {
          const audience = assignedTo === 'subject' ? 'subject' : 'all';
          const response = await fetch('/api/send-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: "New Task Added",
              body: `${title} for ${subject}`,
              subject,
              type: "task",
              link: "/tasks",
              audience
            })
          });
          const resData = await response.json();
          if (resData.success) {
            console.log("notification triggered");
          } else {
            console.log("notification failed", resData.error);
          }
        } catch (err) {
          console.log("notification failed", err);
        }
      })();

    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    validateRepRole();
    try {
      const docRef = doc(db, 'tasks', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const deleteTask = async (id: string) => {
    validateRepRole();
    try {
      const docRef = doc(db, 'tasks', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  return (
    <BatchContext.Provider value={{
      tasks,
      tasksLoading,
      addTask,
      updateTask,
      deleteTask,
      notices,
      noticesLoading,
      addNotice,
      updateNotice,
      deleteNotice,
      markNoticeRead,
      attendance,
      attendanceLoading,
      addAttendanceRecord: addAttendanceRecordContext,
      updateAttendanceRecord: updateAttendanceRecordContext,
      incrementAttendanceRecord: incrementAttendanceRecordContext,
      deleteAttendanceRecord: deleteAttendanceRecordContext,
      profile,
      updateProfile,
      timetable,
      timetableLoading,
      addSchedule,
      updateSchedule,
      deleteSchedule,
      resources,
      resourcesLoading,
      addResource: addResourceContext,
      updateResource: updateResourceContext,
      deleteResource: deleteResourceContext,
      faculty: initialFaculty
    }}>
      {children}
    </BatchContext.Provider>
  );
};

export const useBatch = () => {
  const context = useContext(BatchContext);
  if (!context) {
    throw new Error('useBatch must be used within a BatchProvider');
  }
  return context;
};
