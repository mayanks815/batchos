'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { ADMIN_EMAILS } from '../lib/adminEmails';
import { UserData } from '../types';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  role: 'student' | 'admin';
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, rollNumber: string, section: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isTaskCompleted: (taskId: string) => boolean;
  toggleTaskComplete: (taskId: string) => Promise<void>;
  updateUserSubjects: (subjects: string[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [loading, setLoading] = useState(true);

  // Sync user doc to Firestore initially (only creates if missing, updates name if customName provided)
  const syncUserToFirestore = async (
    firebaseUser: User, 
    customName?: string, 
    rollNumber?: string, 
    section?: string
  ): Promise<void> => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      const email = (firebaseUser.email || '').trim().toLowerCase();

      if (!userSnap.exists()) {
        const userRole = ADMIN_EMAILS.includes(email) ? 'admin' : 'student';
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          name: customName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student',
          email,
          rollNumber: rollNumber || '',
          section: section || '',
          role: userRole,
          completedTasks: [],
          subjects: [],
          createdAt: serverTimestamp()
        }, { merge: true });
      } else {
        if (customName) {
          const existingData = userSnap.data();
          if (existingData?.name !== customName) {
            await updateDoc(userRef, { name: customName });
          }
        }
      }
    } catch (error) {
      console.error('Error syncing user to Firestore:', error);
    }
  };

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      
      // Unsubscribe previous document listener
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (currentUser) {
        setUser(currentUser);
        
        // Seeding database doc if new user
        await syncUserToFirestore(currentUser);

        // Listen in real-time to user changes (e.g. role updates or completedTasks adjustments)
        unsubscribeUserDoc = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const uData: UserData = {
              uid: data.uid || '',
              name: data.name || '',
              email: data.email || '',
              rollNumber: data.rollNumber || '',
              section: data.section || '',
              role: data.role || (ADMIN_EMAILS.includes(currentUser.email || '') ? 'admin' : 'student'),
              completedTasks: data.completedTasks || [],
              subjects: data.subjects || [],
              createdAt: data.createdAt
            };
            setUserData(uData);
            setRole(uData.role);
          }
          setLoading(false);
        }, (error) => {
          console.error('Error in user doc snapshot listener:', error);
          setLoading(false);
        });
      } else {
        setUser(null);
        setUserData(null);
        setRole('student');
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string, rollNumber: string, section: string) => {
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedRollNumber = rollNumber.trim().toUpperCase();

      // Check roll number uniqueness before creating user
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('rollNumber', '==', normalizedRollNumber));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        throw new Error('This roll number is already registered.');
      }

      const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      if (result.user) {
        await updateProfile(result.user, { displayName: name });
        await syncUserToFirestore(result.user, name, normalizedRollNumber, section.trim());
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        await syncUserToFirestore(result.user);
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setUserData(null);
      setRole('student');
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Helper checks decoupled from UI array queries
  const isTaskCompleted = (taskId: string): boolean => {
    if (!userData || !userData.completedTasks) return false;
    return userData.completedTasks.includes(taskId);
  };

  const toggleTaskComplete = async (taskId: string) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const completed = isTaskCompleted(taskId);
    
    try {
      await updateDoc(userRef, {
        completedTasks: completed ? arrayRemove(taskId) : arrayUnion(taskId)
      });
    } catch (error) {
      console.error('Error toggling task completion state:', error);
      throw error;
    }
  };

  const updateUserSubjects = async (subjects: string[]) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userRef, {
        subjects
      });
    } catch (error) {
      console.error('Error updating user subjects:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userData,
      role,
      loading,
      loginWithEmail,
      signUpWithEmail,
      loginWithGoogle,
      logout,
      isTaskCompleted,
      toggleTaskComplete,
      updateUserSubjects
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
