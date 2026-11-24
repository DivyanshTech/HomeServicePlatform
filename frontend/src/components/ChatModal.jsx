import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import chatService from '../services/chatService';
import useChatNotifications from '../hooks/useChatNotifications';

const phonePattern = /(?:^|[^\d])(?:\d[\s().-]*){10}(?!\d)/;

export default function ChatModal({
  isOpen,
  onClose,
  chatType,
  bookingId,
  threadUserId,
  bookingStatus,
  readOnly = false,
  title = 'In-App Chat'
}) {
  const { user } = useAuth();
  const { setActiveChatThread, refreshUnreadSummary } = useChatNotifications();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const isAdminSupport = chatType === 'admin-support';
  const canSend = !readOnly
    && (chatType !== 'booking' || ['accepted', 'in_progress'].includes(bookingStatus));

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    let firstLoad = true;
    let markingRead = false;
    let markReadAgain = false;
    const activeThread = chatType === 'booking'
      ? { type: 'booking', id: String(bookingId) }
      : { type: 'support', id: String(isAdminSupport ? threadUserId : user?.id) };
    const readThread = chatType === 'booking'
      ? { bookingId }
      : { threadUserId: isAdminSupport ? threadUserId : user?.id };
    const knownMessageIds = new Set();
    setActiveChatThread(activeThread);

    const markRead = async () => {
      if (markingRead) {
        markReadAgain = true;
        return;
      }
      markingRead = true;
      try {
        do {
          markReadAgain = false;
          await chatService.markRead(readThread);
          await refreshUnreadSummary();
        } while (markReadAgain && active);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Unable to mark messages as read');
      } finally {
        markingRead = false;
      }
    };

    const loadMessages = async () => {
      try {
        const response = isAdminSupport
          ? await chatService.getAdminSupportMessages(threadUserId)
          : chatType === 'booking'
            ? await chatService.getBookingMessages(bookingId)
            : await chatService.getSupportMessages();
        const nextMessages = response.data || [];
        const hasNewIncomingMessage = !firstLoad && nextMessages.some(message => (
          !knownMessageIds.has(String(message._id))
          && String(message.senderId) !== String(user?.id)
        ));
        nextMessages.forEach(message => knownMessageIds.add(String(message._id)));
        if (active) {
          setMessages(nextMessages);
          setError('');
        }
        if (active && hasNewIncomingMessage) markRead();
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Unable to load messages');
      } finally {
        firstLoad = false;
        if (active) setLoading(false);
      }
    };

    markRead();
    loadMessages();
    const intervalId = window.setInterval(loadMessages, 4000);
    return () => {
      active = false;
      setActiveChatThread(null);
      window.clearInterval(intervalId);
    };
  }, [
    isOpen,
    chatType,
    bookingId,
    threadUserId,
    isAdminSupport,
    user?.id,
    setActiveChatThread,
    refreshUnreadSummary
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const send = async event => {
    event.preventDefault();
    const normalizedText = text.trim();
    if (!normalizedText || sending) return;
    if (phonePattern.test(normalizedText)) {
      setError('Phone numbers cannot be shared in chat.');
      return;
    }

    setSending(true);
    setError('');
    try {
      const response = isAdminSupport
        ? await chatService.sendAdminSupportMessage(threadUserId, normalizedText)
        : chatType === 'booking'
          ? await chatService.sendBookingMessage(bookingId, normalizedText)
          : await chatService.sendSupportMessage(normalizedText);
      setMessages(current => [...current, response.data]);
      setText('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-[min(680px,92vh)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle size={19} className="text-blue-600" />
            <div>
              <h2 className="font-black text-slate-900">{title}</h2>
              {!canSend && <p className="text-xs text-slate-500">Read-only chat</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close chat" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X size={19} />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
          {loading && messages.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Loading messages...</p>}
          {!loading && messages.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No messages yet. Start the conversation.</p>}
          {messages.map(message => {
            const ownMessage = String(message.senderId) === String(user?.id);
            return (
              <div key={message._id} className={`flex ${ownMessage ? 'justify-end' : 'justify-start'}`}>
                <article className={`max-w-[85%] rounded-2xl px-3 py-2 ${ownMessage ? 'bg-blue-600 text-white' : 'border bg-white text-slate-800'}`}>
                  <p className={`mb-1 text-[11px] font-bold ${ownMessage ? 'text-blue-100' : 'text-slate-500'}`}>
                    {ownMessage ? 'You' : roleLabel(message.senderRole)}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
                  <time className={`mt-1 block text-right text-[10px] ${ownMessage ? 'text-blue-100' : 'text-slate-400'}`}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </article>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error && <p role="alert" className="border-t bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

        {canSend ? (
          <form onSubmit={send} className="flex items-end gap-2 border-t p-3">
            <textarea
              rows="2"
              maxLength="1000"
              value={text}
              onChange={event => setText(event.target.value)}
              placeholder="Write a message..."
              className="input min-h-11 flex-1 resize-none"
            />
            <button type="submit" disabled={sending || !text.trim()} aria-label="Send message" className="btn-primary h-11 min-w-11 justify-center px-3">
              <Send size={17} />
            </button>
          </form>
        ) : (
          <p className="border-t px-4 py-3 text-center text-xs text-slate-500">
            {chatType === 'booking' ? 'Chat is available after acceptance and is read-only after the job ends.' : 'This conversation is read-only.'}
          </p>
        )}
      </section>
    </div>
  );
}

function roleLabel(senderRole) {
  if (senderRole === 'admin') return 'FixIt Support';
  return senderRole === 'technician' ? 'Service Partner' : 'Customer';
}
