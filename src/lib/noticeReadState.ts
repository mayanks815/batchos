const LOCAL_STORAGE_KEY = 'bos_read_notices';

export function getReadNotices(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to get read notices', e);
    return [];
  }
}

export function markNoticeRead(noticeId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getReadNotices();
    if (!current.includes(noticeId)) {
      const updated = [...current, noticeId];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to mark notice as read', e);
  }
}

export function clearReadNotices(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear read notices', e);
  }
}
