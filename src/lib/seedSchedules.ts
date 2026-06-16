import { Firestore, collection, addDoc, getDocs, deleteDoc, writeBatch, doc } from 'firebase/firestore';

interface SeedClass {
  subject: string;
  time: string;
  room: string;
  professor: string;
  status: 'ongoing' | 'upcoming' | 'completed';
  weekday: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
}

const defaultMockSchedules: SeedClass[] = [
  // Monday
  { subject: 'Corporate Finance', time: '09:00 AM - 10:30 AM', room: 'LHC-101', professor: 'Dr. Aris Vasileiou', status: 'completed', weekday: 'Monday' },
  { subject: 'Marketing Management II', time: '10:45 AM - 12:15 PM', room: 'LHC-101', professor: 'Prof. Sarah Jenkins', status: 'ongoing', weekday: 'Monday' },
  { subject: 'Business Data Analytics', time: '02:00 PM - 03:30 PM', room: 'Lab-3', professor: 'Dr. Kenji Tanaka', status: 'upcoming', weekday: 'Monday' },
  
  // Tuesday
  { subject: 'Operations Research', time: '09:00 AM - 10:30 AM', room: 'LHC-102', professor: 'Dr. Julia Rossi', status: 'upcoming', weekday: 'Tuesday' },
  { subject: 'Strategy & Governance', time: '10:45 AM - 12:15 PM', room: 'LHC-102', professor: 'Prof. Richard Bell', status: 'upcoming', weekday: 'Tuesday' },
  { subject: 'Macroeconomics', time: '02:00 PM - 03:30 PM', room: 'LHC-101', professor: 'Dr. Ellen Vance', status: 'upcoming', weekday: 'Tuesday' },

  // Wednesday
  { subject: 'Corporate Finance', time: '09:00 AM - 10:30 AM', room: 'LHC-101', professor: 'Dr. Aris Vasileiou', status: 'upcoming', weekday: 'Wednesday' },
  { subject: 'Business Data Analytics', time: '10:45 AM - 12:15 PM', room: 'Lab-3', professor: 'Dr. Kenji Tanaka', status: 'upcoming', weekday: 'Wednesday' },

  // Thursday
  { subject: 'Operations Research', time: '09:00 AM - 10:30 AM', room: 'LHC-102', professor: 'Dr. Julia Rossi', status: 'upcoming', weekday: 'Thursday' },
  { subject: 'Strategy & Governance', time: '10:45 AM - 12:15 PM', room: 'LHC-102', professor: 'Prof. Richard Bell', status: 'upcoming', weekday: 'Thursday' },

  // Friday
  { subject: 'Marketing Management II', time: '09:00 AM - 10:30 AM', room: 'LHC-101', professor: 'Prof. Sarah Jenkins', status: 'upcoming', weekday: 'Friday' },
  { subject: 'Macroeconomics', time: '10:45 AM - 12:15 PM', room: 'LHC-101', professor: 'Dr. Ellen Vance', status: 'upcoming', weekday: 'Friday' },
];

/**
 * Calculates current calendar week dates (Monday to Friday)
 * Returns a dictionary mapping weekday name to date string in YYYY-MM-DD format
 */
export function getWeekDates(): { [key: string]: string } {
  const dates: { [key: string]: string } = {};
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sun, 1 is Mon, 6 is Sat
  
  // Calculate offset to get to Monday of the current week (Sunday starts the week, so Sun maps to upcoming Mon)
  const distance = 1 - currentDay;
  
  const monday = new Date(today);
  monday.setDate(today.getDate() + distance);

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  weekdays.forEach((day, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    
    // Format YYYY-MM-DD in local timezone to avoid UTC shifting issues
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateStr = String(d.getDate()).padStart(2, '0');
    dates[day] = `${year}-${month}-${dateStr}`;
  });
  
  return dates;
}

/**
 * Clear existing schedules and write default mock schedules with current week's dates
 */
export async function seedDefaultSchedules(db: Firestore): Promise<void> {
  const schedulesCol = collection(db, 'schedules');
  
  // 1. Clear existing schedules
  const snapshot = await getDocs(schedulesCol);
  const deleteBatch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    deleteBatch.delete(doc.ref);
  });
  await deleteBatch.commit();
  
  // 2. Fetch current week's dates
  const weekDates = getWeekDates();
  
  // 3. Write default date-based schedules in batch
  const writeBatchInstance = writeBatch(db);
  defaultMockSchedules.forEach((item) => {
    const newDocRef = doc(collection(db, 'schedules'));
    const dateStr = weekDates[item.weekday];
    
    writeBatchInstance.set(newDocRef, {
      subject: item.subject,
      time: item.time,
      room: item.room,
      professor: item.professor,
      status: item.status,
      date: dateStr
    });
  });
  
  await writeBatchInstance.commit();
  console.log('Successfully seeded schedules with current week\'s dates:', weekDates);
}
