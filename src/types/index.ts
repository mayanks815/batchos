import { Timestamp } from 'firebase/firestore';

export interface Task {
  id: string;
  title: string;
  subject: string;
  deadline: Timestamp;
  priority: 'high' | 'medium' | 'low';
  assignedTo?: string;
  createdAt?: Timestamp;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  category: 'academic' | 'placement' | 'event' | 'urgent';
  priority: 'low' | 'medium' | 'high';
  createdBy: string;
  createdAt: Timestamp;
  expiresAt: Timestamp | null;
  pinned: boolean;
  read?: boolean;
  targetSubjects?: string[];
}

export interface CourseAttendance {
  id: string;
  subject: string;
  totalClasses: number;
  attendedClasses: number;
  createdAt?: Timestamp;
}

export interface ClassSession {
  id: string;
  subject: string;
  time: string;
  room: string;
  professor: string;
  status: 'ongoing' | 'upcoming' | 'completed';
  date: string; // YYYY-MM-DD
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  subject: string;
  type: "pdf" | "ppt" | "doc" | "link" | "video";
  driveLink: string;
  uploadedBy: string;
  createdAt?: Timestamp;
}

export interface Faculty {
  id: string;
  name: string;
  designation: string;
  email: string;
  office: string;
  phone?: string;
}

export interface StudentProfile {
  name: string;
  rollNo: string;
  section: string;
  specialization: string;
  gpa: string;
  email: string;
  avatarUrl?: string;
}

export interface UserData {
  uid: string;
  name: string;
  email: string;
  rollNumber: string;
  section: string;
  role: 'student' | 'admin';
  completedTasks?: string[];
  subjects?: string[];
  createdAt: any;
}
