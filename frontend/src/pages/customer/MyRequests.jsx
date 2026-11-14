
import { useEffect, useState } from 'react';
import bookingService from '../../services/bookingService';
import { STATUS_LABELS } from '../../utils/constants';
import { Star } from 'lucide-react';

export default function MyRequests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () =>
    bookingService.myBookings()
      .then(r => setItems(r.data || []))
      .catch(e => setError(e.response?.data?.message || 'Unable to load bookings'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
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
            <Booking key={b._id} b={b} refresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function Booking({ b, refresh }) {
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

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

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <span className="text-slate-400">Charge</span>
          <p className="font-bold">₹{b.serviceCharge}</p>
        </div>
        <div>
          <span className="text-slate-400">Phone</span>
          <p className="font-bold">{tech?.userId?.phone}</p>
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
    </article>
  );
}
