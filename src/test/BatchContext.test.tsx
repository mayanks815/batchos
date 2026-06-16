import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchProvider, useBatch } from '../store/BatchContext';
import { addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';

// Mock AuthContext
vi.mock('../store/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'test-user-uid', email: 'test@example.com' },
    role: 'admin',
  })),
}));

// Mock noticeReadState
vi.mock('../lib/noticeReadState', () => ({
  getReadNotices: vi.fn(() => []),
  markNoticeRead: vi.fn(),
}));

// Mock attendanceService
vi.mock('../lib/attendanceService', () => {
  return {
    subscribeToAttendance: vi.fn((uid, cb) => {
      // Provide initial attendance records
      cb([
        {
          id: 'course-1',
          subject: 'Corporate Finance',
          totalClasses: 10,
          attendedClasses: 8, // 80% (Safe)
        },
        {
          id: 'course-2',
          subject: 'Marketing',
          totalClasses: 10,
          attendedClasses: 6, // 60% (Already below 75%)
        }
      ]);
      return () => {};
    }),
    addAttendanceRecord: vi.fn(),
    updateAttendanceRecord: vi.fn(),
    incrementAttendanceRecord: vi.fn(),
    deleteAttendanceRecord: vi.fn(),
  };
});

const TestConsumer = () => {
  const {
    addTask,
    addNotice,
    addResource,
    updateResource,
    deleteResource,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    updateAttendanceRecord,
    incrementAttendanceRecord,
    attendance,
  } = useBatch();

  return (
    <div>
      <div data-testid="attendance-count">{attendance.length}</div>
      <button
        data-testid="add-notice-global"
        onClick={() => addNotice('Global Title', 'Content', 'general', 'high', null, false, [])}
      >
        Add Global Notice
      </button>
      <button
        data-testid="add-notice-subject"
        onClick={() => addNotice('Subject Title', 'Content', 'general', 'high', null, false, ['Corporate Finance'])}
      >
        Add Subject Notice
      </button>
      <button
        data-testid="add-task"
        onClick={() => addTask('Task Title', 'Corporate Finance', Timestamp.fromDate(new Date()), 'high', 'subject')}
      >
        Add Task
      </button>
      <button
        data-testid="add-resource"
        onClick={() => addResource('Resource Title', 'Desc', 'Corporate Finance', 'pdf', 'https://drive.google.com/link')}
      >
        Add Resource
      </button>
      <button
        data-testid="update-resource"
        onClick={() => updateResource('resource-1', { title: 'Updated Resource' })}
      >
        Update Resource
      </button>
      <button
        data-testid="delete-resource"
        onClick={() => deleteResource('resource-1')}
      >
        Delete Resource
      </button>
      <button
        data-testid="add-schedule"
        onClick={() => addSchedule({ subject: 'Finance', time: '10:00 AM', room: '204', professor: 'Dr. Aris', status: 'upcoming', date: '2026-06-16' })}
      >
        Add Schedule
      </button>
      <button
        data-testid="update-schedule"
        onClick={() => updateSchedule('sched-1', { subject: 'Finance Class' })}
      >
        Update Schedule
      </button>
      <button
        data-testid="delete-schedule"
        onClick={() => deleteSchedule('sched-1')}
      >
        Delete Schedule
      </button>
      <button
        data-testid="drop-attendance-update"
        onClick={() => updateAttendanceRecord('course-1', { totalClasses: 10, attendedClasses: 7 })}
      >
        Drop Attendance Update (80% to 70%)
      </button>
      <button
        data-testid="no-drop-attendance-update"
        onClick={() => updateAttendanceRecord('course-1', { totalClasses: 10, attendedClasses: 8 })}
      >
        No Drop Attendance Update (80% to 80%)
      </button>
      <button
        data-testid="already-below-attendance-update"
        onClick={() => updateAttendanceRecord('course-2', { totalClasses: 10, attendedClasses: 5 })}
      >
        Already Below Update (60% to 50%)
      </button>
      <button
        data-testid="drop-attendance-increment"
        onClick={() => incrementAttendanceRecord('course-1', 0, 1)}
      >
        Drop Attendance Increment (8/10 to 8/11: 80% to 72%)
      </button>
    </div>
  );
};

describe('BatchContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    vi.mocked(global.fetch).mockClear();
  });

  it('subscribes and loads attendance records', async () => {
    render(
      <BatchProvider>
        <TestConsumer />
      </BatchProvider>
    );

    expect(screen.getByTestId('attendance-count').textContent).toBe('2');
  });

  describe('Notice Multicast Payload Parsing', () => {
    it('sends global notice notification with audience="all"', async () => {
      render(
        <BatchProvider>
          <TestConsumer />
        </BatchProvider>
      );

      const btn = screen.getByTestId('add-notice-global');
      await act(async () => {
        btn.click();
      });

      expect(addDoc).toHaveBeenCalled();
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/send-notification',
          expect.objectContaining({
            body: expect.stringContaining('"audience":"all"'),
          })
        );
      });
    });

    it('sends subject notice notification with audience="subject"', async () => {
      render(
        <BatchProvider>
          <TestConsumer />
        </BatchProvider>
      );

      const btn = screen.getByTestId('add-notice-subject');
      await act(async () => {
        btn.click();
      });

      expect(addDoc).toHaveBeenCalled();
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/send-notification',
          expect.objectContaining({
            body: expect.stringContaining('"audience":"subject"'),
          })
        );
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/send-notification',
          expect.objectContaining({
            body: expect.stringContaining('"subject":"Corporate Finance"'),
          })
        );
      });
    });
  });

  describe('Timetable Scheduling Pushes', () => {
    it('triggers New Class Added push on addSchedule', async () => {
      render(
        <BatchProvider>
          <TestConsumer />
        </BatchProvider>
      );

      await act(async () => {
        screen.getByTestId('add-schedule').click();
      });

      expect(addDoc).toHaveBeenCalled();
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/send-notification',
          expect.objectContaining({
            body: expect.stringContaining('"title":"New Class Added"'),
          })
        );
      });
    });

    it('triggers Class Updated push on updateSchedule', async () => {
      render(
        <BatchProvider>
          <TestConsumer />
        </BatchProvider>
      );

      await act(async () => {
        screen.getByTestId('update-schedule').click();
      });

      expect(updateDoc).toHaveBeenCalled();
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/send-notification',
          expect.objectContaining({
            body: expect.stringContaining('"title":"Class Updated"'),
          })
        );
      });
    });

    it('triggers Class Removed push on deleteSchedule', async () => {
      render(
        <BatchProvider>
          <TestConsumer />
        </BatchProvider>
      );

      await act(async () => {
        screen.getByTestId('delete-schedule').click();
      });

      expect(deleteDoc).toHaveBeenCalled();
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/send-notification',
          expect.objectContaining({
            body: expect.stringContaining('"title":"Class Removed"'),
          })
        );
      });
    });
  });

  describe('Resources CRUD Operations', () => {
    it('adds resource and sends Study Resource push notification', async () => {
      render(
        <BatchProvider>
          <TestConsumer />
        </BatchProvider>
      );

      await act(async () => {
        screen.getByTestId('add-resource').click();
      });

      expect(addDoc).toHaveBeenCalled();
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/send-notification',
          expect.objectContaining({
            body: expect.stringContaining('"title":"New Study Resource"'),
          })
        );
      });
    });

    it('updates resource and deletes resource without sending notifications', async () => {
      render(
        <BatchProvider>
          <TestConsumer />
        </BatchProvider>
      );

      await act(async () => {
        screen.getByTestId('update-resource').click();
      });
      expect(updateDoc).toHaveBeenCalled();

      await act(async () => {
        screen.getByTestId('delete-resource').click();
      });
      expect(deleteDoc).toHaveBeenCalled();

      // Ensure no notification fetch was made for updates/deletes of resources
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Attendance Alerts Transition Pushes', () => {
    it('triggers notification when attendance falls below 75% via updateRecord', async () => {
      render(
        <BatchProvider>
          <TestConsumer />
        </BatchProvider>
      );

      // course-1 is 8/10 = 80%. Drop it to 7/10 = 70%.
      await act(async () => {
        screen.getByTestId('drop-attendance-update').click();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/send-notification',
          expect.objectContaining({
            body: expect.stringContaining('"title":"Attendance Alert"'),
          })
        );
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/send-notification',
          expect.objectContaining({
            body: expect.stringContaining('"body":"Your attendance in Corporate Finance dropped to 70%"'),
          })
        );
      });
    });

    it('does NOT trigger notification when attendance remains above 75%', async () => {
      render(
        <BatchProvider>
          <TestConsumer />
        </BatchProvider>
      );

      // course-1 is 8/10 = 80%. Update to 8/10 = 80%.
      await act(async () => {
        screen.getByTestId('no-drop-attendance-update').click();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('does NOT trigger notification if attendance was already below 75%', async () => {
      render(
        <BatchProvider>
          <TestConsumer />
        </BatchProvider>
      );

      // course-2 is 6/10 = 60%. Update to 5/10 = 50%.
      await act(async () => {
        screen.getByTestId('already-below-attendance-update').click();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('triggers notification when attendance falls below 75% via incrementRecord (absence)', async () => {
      render(
        <BatchProvider>
          <TestConsumer />
        </BatchProvider>
      );

      // course-1 is 8/10 = 80%. Increment by 0 attended, 1 total classes (absence). Result: 8/11 = 72.7% (rounds to 73%).
      await act(async () => {
        screen.getByTestId('drop-attendance-increment').click();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/send-notification',
          expect.objectContaining({
            body: expect.stringContaining('"title":"Attendance Alert"'),
          })
        );
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/send-notification',
          expect.objectContaining({
            body: expect.stringContaining('"body":"Your attendance in Corporate Finance dropped to 73%"'),
          })
        );
      });
    });
  });
});
