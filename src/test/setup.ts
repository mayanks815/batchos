import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock browser Notification API
global.Notification = vi.fn().mockImplementation((title, options) => ({
  title,
  options,
  onshow: vi.fn(),
  onerror: vi.fn(),
  onclick: vi.fn(),
})) as any;
(global.Notification as any).permission = 'granted';
(global.Notification as any).requestPermission = vi.fn().mockResolvedValue('granted');

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

// Mock window.open
global.window.open = vi.fn();

// Mock Firebase App SDK
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  getApp: vi.fn(),
}));

// Mock Firebase Auth SDK
vi.mock('firebase/auth', () => {
  return {
    getAuth: vi.fn(() => ({
      currentUser: {
        uid: 'test-user-uid',
        email: 'test@example.com',
        displayName: 'Test User',
      },
    })),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn((auth, cb) => {
      // Simulate authenticated user immediately
      cb({
        uid: 'test-user-uid',
        email: 'test@example.com',
        displayName: 'Test User',
      });
      return () => {};
    }),
    updateProfile: vi.fn(),
    connectAuthEmulator: vi.fn(),
  };
});

// Mock Firebase Firestore SDK
vi.mock('firebase/firestore', () => {
  return {
    getFirestore: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(),
    getDoc: vi.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin',
        subjects: ['Corporate Finance'],
      }),
    }),
    getDocs: vi.fn().mockResolvedValue({
      docs: [],
    }),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    onSnapshot: vi.fn((q, cb) => {
      // Mock snapshot return
      cb({
        docs: [],
        forEach: (fn: any) => [],
      });
      return () => {};
    }),
    connectFirestoreEmulator: vi.fn(),
    serverTimestamp: vi.fn(() => ({
      toMillis: () => Date.now(),
      toDate: () => new Date(),
    })),
    arrayUnion: vi.fn((...args) => args),
    arrayRemove: vi.fn((...args) => args),
    increment: vi.fn((n) => n),
    Timestamp: {
      now: vi.fn(() => ({
        toMillis: () => Date.now(),
        toDate: () => new Date(),
      })),
      fromDate: vi.fn((date) => ({
        toMillis: () => date.getTime(),
        toDate: () => date,
      })),
    },
  };
});

// Mock global fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({ success: true }),
});

