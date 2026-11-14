
import { useEffect, useState } from 'react';
import bookingService from '../../services/bookingService';
import { STATUS_LABELS } from '../../utils/constants';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    bookingService.technicianJobs()
      .then(r => setJobs(r.data || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  if (loading)
    return <div className="py-16 text-center">Loading jobs...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black">Incoming Jobs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Accept, start, complete or reject customer bookings.
        </p>
      </div>

      {!jobs.length ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-slate-500">
          No jobs yet.
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(j => (
            <Job key={j._id} job={j} refresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function Job({ job, refresh }) {
  const [busy, setBusy] = useState(false);

  const run = async action => {
    setBusy(true);
    try {
      await bookingService.action(job._id, action);
      refresh();
    } catch (e) {
      alert(e.response?.data?.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex justify-between gap-4">
        <div>
          <h2 className="font-black">{job.customerId?.name}</h2>
          <p className="text-sm text-blue-600">{job.category?.name}</p>
        </div>

        <span className={`status-${job.status}`}>
          {STATUS_LABELS[job.status]}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        {job.issueDescription}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <p className="text-sm">
          <span className="text-slate-400">Customer Phone</span><br />
          <b>{job.customerId?.phone || 'Not provided'}</b>
        </p>

        <p className="text-sm">
          <span className="text-slate-400">City</span><br />
          <b>{job.customerId?.city || 'Not provided'}</b>
        </p>

        <p className="text-sm sm:col-span-2">
          <span className="text-slate-400">Full Address</span><br />
          <b>{job.customerId?.address || 'Address not provided'}</b>
        </p>

        <p className="text-sm">
          <span className="text-slate-400">Service Charge</span><br />
          <b>₹{job.serviceCharge}</b>
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {job.status === 'pending' && (
          <>
            <button
              disabled={busy}
              onClick={() => run('accept')}
              className="btn-primary"
            >
              Accept
            </button>

            <button
              disabled={busy}
              onClick={() => run('reject')}
              className="btn-danger"
            >
              Reject
            </button>
          </>
        )}

        {job.status === 'accepted' && (
          <button
            disabled={busy}
            onClick={() => run('start')}
            className="btn-primary"
          >
            Start job
          </button>
        )}

        {job.status === 'in_progress' && (
          <button
            disabled={busy}
            onClick={() => run('complete')}
            className="btn-primary"
          >
            Mark completed
          </button>
        )}
      </div>
    </article>
  );
}
