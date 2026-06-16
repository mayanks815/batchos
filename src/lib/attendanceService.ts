import { db } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  increment,
  Timestamp 
} from 'firebase/firestore';
import { CourseAttendance } from '@/types';

const getAttendanceColRef = (uid: string) => {
  return collection(db, 'users', uid, 'attendance');
};

const getAttendanceDocRef = (id: string, uid: string) => {
  return doc(db, 'users', uid, 'attendance', id);
};

export const subscribeToAttendance = (
  uid: string | undefined,
  onUpdate: (data: CourseAttendance[]) => void,
  onError?: (err: any) => void
) => {
  if (!uid) {
    onUpdate([]);
    return () => {};
  }
  const colRef = getAttendanceColRef(uid);
  const q = query(colRef, orderBy('subject', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const records: CourseAttendance[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        subject: data.subject || '',
        totalClasses: Number(data.totalClasses) || 0,
        attendedClasses: Number(data.attendedClasses) || 0,
        createdAt: data.createdAt
      };
    });
    onUpdate(records);
  }, (err) => {
    if (onError) onError(err);
  });
};

export const addAttendanceRecord = async (
  uid: string | undefined,
  subject: string,
  totalClasses: number,
  attendedClasses: number
) => {
  if (!uid) throw new Error("UID is required to add attendance.");
  const colRef = getAttendanceColRef(uid);
  await addDoc(colRef, {
    subject,
    totalClasses,
    attendedClasses,
    createdAt: serverTimestamp()
  });
};

export const updateAttendanceRecord = async (
  uid: string | undefined,
  id: string,
  updates: Partial<Omit<CourseAttendance, 'id' | 'createdAt'>>
) => {
  if (!uid) throw new Error("UID is required to update attendance.");
  const docRef = getAttendanceDocRef(id, uid);
  await updateDoc(docRef, updates);
};

export const incrementAttendanceRecord = async (
  uid: string | undefined,
  id: string,
  attendedChange: number,
  totalChange: number
) => {
  if (!uid) throw new Error("UID is required to increment attendance.");
  const docRef = getAttendanceDocRef(id, uid);
  const updates: any = {};

  if (attendedChange !== 0) {
    updates.attendedClasses = increment(attendedChange);
  }
  if (totalChange !== 0) {
    updates.totalClasses = increment(totalChange);
  }

  await updateDoc(docRef, updates);
};

export const deleteAttendanceRecord = async (
  uid: string | undefined,
  id: string
) => {
  if (!uid) throw new Error("UID is required to delete attendance.");
  const docRef = getAttendanceDocRef(id, uid);
  await deleteDoc(docRef);
};
