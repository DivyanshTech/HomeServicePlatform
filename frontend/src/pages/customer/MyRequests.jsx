
import { useEffect, useState } from 'react';
import bookingService from '../../services/bookingService';
import complaintService from '../../services/complaintService';
import { STATUS_LABELS } from '../../utils/constants';
import { Star } from 'lucide-react';
import ChatModal from '../../components/ChatModal';
import useChatNotifications from '../../hooks/useChatNotifications';

export default function MyRequests() {
  const [items, setItems] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const [bookingResponse, complaintResponse] = await Promise.all([
        bookingService.myBookings(),
        complaintService.myComplaints()
      ]);
      setItems(bookingResponse.data || []);
      setComplaints(complaintResponse.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([bookingService.myBookings(), complaintService.myComplaints()])
      .then(([bookingResponse, complaintResponse]) => {
        if (!active) return;
        setItems(bookingResponse.data || []);
        setComplaints(complaintResponse.data || []);
      })
      .catch(e => {
        if (active) setError(e.response?.data?.message || 'Unable to load bookings');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading)
    return <div className="py-16 text-center">Loading bookings...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black">My Bookings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track every service request from booking to completion.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!items.length ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-slate-500">
          No bookings yet.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(b => (
            <Booking
              key={b._id}
              b={b}
              refresh={load}
              complaint={complaints.find(item => item.bookingId === b._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Booking({ b, refresh, complaint }) {
  const { summary } = useChatNotifications();
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintText, setComplaintText] = useState('');
  const [complaintError, setComplaintError] = useState('');
  const [complaintSubmitted, setComplaintSubmitted] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const bookingUnread = summary.bookingUnreadMap[b._id] || 0;

  const tech = b.technicianId;

  const act = async () => {
    setBusy(true);
    try {
      await bookingService.action(b._id, 'cancel');
      refresh();
    } catch (e) {
      alert(e.response?.data?.message || 'Unable to cancel');
    } finally {
      setBusy(false);
    }
  };

  const review = async () => {
    setBusy(true);
    try {
      await bookingService.review(b._id, {
        rating: Number(rating),
        comment
      });
      refresh();
    } catch (e) {
      alert(e.response?.data?.message || 'Unable to review');
    } finally {
      setBusy(false);
    }
  };

  const submitComplaint = async event => {
    event.preventDefault();
    setBusy(true);
    setComplaintError('');
    try {
      await complaintService.create(b._id, complaintText);
      setComplaintSubmitted(true);
      setShowComplaintForm(false);
      refresh();
    } catch (e) {
      setComplaintError(e.response?.data?.message || 'Unable to submit complaint');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-black text-slate-900">{tech?.userId?.name}</h2>
          <p className="text-sm text-blue-600">{b.category?.name}</p>
        </div>
        <span className={`status-${b.status}`}>
          {STATUS_LABELS[b.status]}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        {b.issueDescription}
      </p>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <span className="text-slate-400">Charge</span>
          <p className="font-bold">₹{b.serviceCharge}</p>
        </div>
        <div>
          <span className="text-slate-400">Created</span>
          <p className="font-bold">
            {new Date(b.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {['pending', 'accepted'].includes(b.status) && (
        <button
          onClick={act}
          disabled={busy}
          className="mt-5 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600"
        >
          Cancel booking
        </button>
      )}

      {b.chatEnabledAt && ['accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled'].includes(b.status) && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="mt-4 rounded-lg border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
        >
          <span className="inline-flex items-center gap-2">
            In-App Chat
            {bookingUnread > 0 && <UnreadBadge count={bookingUnread} />}
          </span>
        </button>
      )}

      <ChatModal
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        chatType="booking"
        bookingId={b._id}
        bookingStatus={b.status}
        readOnly={!['accepted', 'in_progress'].includes(b.status)}
        title="Booking Chat"
      />

      {b.status === 'completed' && !b.review?.rating && (
        <div className="mt-5 border-t pt-5">
          <p className="font-black">Rate your technician</p>

          <div className="mt-3 flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => setRating(n)}>
                <Star className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
              </button>
            ))}
          </div>

          <textarea
            className="input mt-3"
            rows="3"
            placeholder="Write a review (optional)"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />

          <button onClick={review} disabled={busy} className="btn-primary mt-3">
            Submit review
          </button>
        </div>
      )}

      {b.review?.rating && (
        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm">
          <b>Your review:</b> {'⭐'.repeat(b.review.rating)} {b.review.comment}
        </div>
      )}

      <div className="mt-5 border-t pt-4">
        {complaint || complaintSubmitted ? (
          <p className="text-sm font-semibold text-blue-700">
            Complaint sent to admin · {complaint?.status?.replace('_', ' ') || 'pending review'}
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowComplaintForm(value => !value)}
              className="text-sm font-bold text-red-700 hover:underline"
            >
              Report a problem with this technician
            </button>
            {showComplaintForm && (
              <form onSubmit={submitComplaint} className="mt-3 space-y-3">
                <p className="text-xs leading-5 text-slate-500">
                  Your report goes directly to the admin team for review. Please include clear details.
                </p>
                <textarea
                  className="input"
                  rows="4"
                  minLength="10"
                  maxLength="2000"
                  required
                  value={complaintText}
                  onChange={event => setComplaintText(event.target.value)}
                  placeholder="Describe what happened (10–2000 characters)"
                />
                {complaintError && <p role="alert" className="text-sm text-red-600">{complaintError}</p>}
                <button type="submit" disabled={busy} className="btn-danger">
                  {busy ? 'Sending…' : 'Send complaint to admin'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </article>
  );
}

function UnreadBadge({ count }) {
  return <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">{count > 99 ? '99+' : count}</span>;
}
