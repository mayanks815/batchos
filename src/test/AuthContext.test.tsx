import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../store/AuthContext';
import { getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

// Mock getDocs and other Firebase helpers
vi.mock('firebase/firestore', async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    getFirestore: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    getDoc: vi.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid: 'test-uid',
        name: 'Test Name',
        email: 'test@example.com',
        rollNumber: 'ROLL123',
        section: 'A',
        role: 'student',
        completedTasks: [],
        subjects: [],
      }),
    }),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    onSnapshot: vi.fn((docRef, callback) => {
      // Simulate real-time snapshot update with basic student role
      callback({
        exists: () => true,
        data: () => ({
          uid: 'test-uid',
          name: 'Test Name',
          email: 'test@example.com',
          rollNumber: 'ROLL123',
          section: 'A',
          role: 'student',
          completedTasks: [],
          subjects: [],
        }),
      });
      return () => {};
    }),
  };
});

vi.mock('firebase/auth', async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    getAuth: vi.fn(() => ({
      currentUser: null,
    })),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn().mockResolvedValue({
      user: {
        uid: 'new-user-uid',
        email: 'new@example.com',
        displayName: 'New User',
      },
    }),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn((auth, cb) => {
      cb(null); // start unauthenticated
      return () => {};
    }),
    updateProfile: vi.fn().mockResolvedValue(undefined),
  };
});

// Test component to consume AuthContext
const TestConsumer = () => {
  const { user, userData, role, signUpWithEmail, updateUserSubjects, toggleTaskComplete } = useAuth();
  const [signupError, setSignupError] = React.useState<string | null>(null);

  const handleSignUp = async () => {
    try {
      setSignupError(null);
      await signUpWithEmail('student@example.com', 'password', 'Alice', 'ROLL456', 'B');
    } catch (err: any) {
      setSignupError(err.message);
    }
  };

  return (
    <div>
      <div data-testid="user-email">{user?.email || 'no-user'}</div>
      <div data-testid="user-role">{role}</div>
      <div data-testid="user-name">{userData?.name || 'no-name'}</div>
      <div data-testid="user-roll">{userData?.rollNumber || 'no-roll'}</div>
      <div data-testid="signup-error">{signupError || 'no-error'}</div>
      <button
        data-testid="signup-btn"
        onClick={handleSignUp}
      >
        Sign Up
      </button>
      <button
        data-testid="subjects-btn"
        onClick={() => updateUserSubjects(['Math', 'Science'])}
      >
        Update Subjects
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders provider and shows initial loading states', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-email').textContent).toBe('no-user');
    expect(screen.getByTestId('user-role').textContent).toBe('student');
  });

  it('rejects signup if duplicate roll number exists', async () => {
    // Mock getDocs to return an existing document (duplicate found)
    const mockGetDocs = vi.mocked(getDocs);
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'existing-uid', data: () => ({ rollNumber: 'ROLL456' }) }],
    } as any);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    const signupBtn = screen.getByTestId('signup-btn');
    
    await act(async () => {
      signupBtn.click();
    });

    expect(screen.getByTestId('signup-error').textContent).toBe('This roll number is already registered.');
  });

  it('allows signup if roll number is unique', async () => {
    // Mock getDocs to return empty (no duplicate)
    const mockGetDocs = vi.mocked(getDocs);
    mockGetDocs.mockResolvedValueOnce({
      empty: true,
      docs: [],
    } as any);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    const signupBtn = screen.getByTestId('signup-btn');
    
    await act(async () => {
      signupBtn.click();
    });

    expect(createUserWithEmailAndPassword).toHaveBeenCalled();
  });

  it('prioritizes role from database document over default email checks', async () => {
    const { onSnapshot } = await import('firebase/firestore');
    
    // Mock onSnapshot to return role="admin" for a regular email address
    vi.mocked(onSnapshot).mockImplementationOnce((docRef: any, callback: any) => {
      callback({
        exists: () => true,
        data: () => ({
          uid: 'test-uid',
          name: 'Regular Name',
          email: 'regular-student@example.com',
          rollNumber: 'ROLL789',
          section: 'A',
          role: 'admin', // DB overrides the student email default
          completedTasks: [],
          subjects: [],
        }),
      });
      return () => {};
    });

    // Mock auth state changed to trigger profile loading
    const { onAuthStateChanged } = await import('firebase/auth');
    vi.mocked(onAuthStateChanged).mockImplementationOnce((auth: any, cb: any) => {
      cb({
        uid: 'test-uid',
        email: 'regular-student@example.com',
        displayName: 'Regular Name',
      });
      return () => {};
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-role').textContent).toBe('admin');
      expect(screen.getByTestId('user-name').textContent).toBe('Regular Name');
    });
  });

  it('verifies update subjects calls updateDoc in Firestore', async () => {
    // Mock active login state
    const { onAuthStateChanged } = await import('firebase/auth');
    vi.mocked(onAuthStateChanged).mockImplementationOnce((auth: any, cb: any) => {
      cb({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test',
      });
      return () => {};
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    const subjectsBtn = screen.getByTestId('subjects-btn');
    await act(async () => {
      subjectsBtn.click();
    });

    expect(updateDoc).toHaveBeenCalled();
  });
});
