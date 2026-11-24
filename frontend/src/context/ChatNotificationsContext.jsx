import { useCallback, useEffect, useRef, useState } from 'react';
import useAuth from '../hooks/useAuth';
import chatService from '../services/chatService';
import ChatNotificationsContext from './chatNotificationsStore';

function emptySummary() {
  return {
    totalUnread: 0,
    bookingUnreadMap: {},
    supportUnreadCount: 0,
    supportUnreadMap: {}
  };
}

function normalizeSummary(value = {}) {
  return {
    totalUnread: Number(value.totalUnread) || 0,
    bookingUnreadMap: value.bookingUnreadMap || {},
    supportUnreadCount: Number(value.supportUnreadCount) || 0,
    supportUnreadMap: value.supportUnreadMap || {}
  };
}

function hasUnreadIncrease(previous, next, activeThread, user) {
  for (const [bookingId, count] of Object.entries(next.bookingUnreadMap)) {
    if (Number(count) > Number(previous.bookingUnreadMap[bookingId] || 0)
      && !(activeThread?.type === 'booking' && activeThread.id === bookingId)) {
      return true;
    }
  }

  if (user.role === 'admin') {
    for (const [threadUserId, count] of Object.entries(next.supportUnreadMap)) {
      if (Number(count) > Number(previous.supportUnreadMap[threadUserId] || 0)
        && !(activeThread?.type === 'support' && activeThread.id === threadUserId)) {
        return true;
      }
    }
  } else if (next.supportUnreadCount > previous.supportUnreadCount
    && !(activeThread?.type === 'support' && activeThread.id === String(user.id))) {
    return true;
  }

  return false;
}

function playNotificationChime() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.onended = () => {
      audioContext.close().catch(error => console.warn('Unable to close notification audio context', error));
    };
    oscillator.start(now);
    oscillator.stop(now + 0.19);
    audioContext.resume().catch(error => console.warn('Notification audio is unavailable', error));
  } catch (error) {
    console.warn('Notification audio is unavailable', error);
  }
}

export function ChatNotificationsProvider({ children }) {
  const { token, user, role } = useAuth();
  const [summary, setSummary] = useState(emptySummary);
  const [toastVisible, setToastVisible] = useState(false);
  const summaryRef = useRef(null);
  const activeThreadRef = useRef(null);
  const toastTimerRef = useRef(null);

  const notifyNewMessage = useCallback(() => {
    setToastVisible(true);
    playNotificationChime();
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastVisible(false), 4500);
  }, []);

  const applySummary = useCallback(value => {
    const next = normalizeSummary(value);
    const previous = summaryRef.current;
    if (previous
      && user?.id
      && next.totalUnread > previous.totalUnread
      && hasUnreadIncrease(previous, next, activeThreadRef.current, { id: user.id, role })) {
      notifyNewMessage();
    }
    summaryRef.current = next;
    setSummary(next);
  }, [notifyNewMessage, role, user]);

  const setActiveChatThread = useCallback(thread => {
    activeThreadRef.current = thread;
  }, []);

  const refreshUnreadSummary = useCallback(async () => {
    const response = await chatService.getUnreadSummary();
    const next = normalizeSummary(response.data);
    applySummary(next);
    return next;
  }, [applySummary]);

  useEffect(() => {
    summaryRef.current = null;
    activeThreadRef.current = null;
    if (!token || !user?.id) return undefined;
    let active = true;

    const poll = async () => {
      try {
        const response = await chatService.getUnreadSummary();
        if (!active) return;
        applySummary(response.data);
      } catch (error) {
        if (active) console.warn('Unable to poll chat unread summary', error);
      }
    };

    poll();
    const intervalId = window.setInterval(poll, 5000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [token, user?.id, applySummary]);

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  return (
    <ChatNotificationsContext.Provider value={{
      summary,
      setActiveChatThread,
      refreshUnreadSummary
    }}>
      {children}
      {toastVisible && (
        <div role="alert" className="fixed right-4 top-20 z-[80] flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">
          <span>New message received!</span>
          <button type="button" onClick={() => setToastVisible(false)} aria-label="Dismiss notification" className="rounded px-1 text-slate-300 hover:text-white">
            ×
          </button>
        </div>
      )}
    </ChatNotificationsContext.Provider>
  );
}
