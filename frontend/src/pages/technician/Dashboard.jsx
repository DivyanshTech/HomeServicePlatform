
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import technicianService from '../../services/technicianService';
import bookingService from '../../services/bookingService';

export default function Dashboard() {
  const [p, setP] = useState(null);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    technicianService.getProfile().then(r => setP(r.data));
    bookingService.technicianJobs().then(r => setJobs(r.data || []));
  }, []);

  if (!p) {
    return <div className="py-16 text-center">Loading dashboard...</div>;
  }

  const active = jobs.filter(j =>
    ['pending', 'accepted', 'in_progress'].includes(j.status)
  ).length;

  const reviews = jobs.filter(j => j.review?.rating);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-slate-900 p-7 text-white">
        <p className="text-sm text-blue-300">Technician workspace</p>

        <h1 className="mt-2 text-3xl font-black">
          Welcome, {p.userId?.name}
        </h1>

        <p className="mt-2 text-slate-300">
          {p.category?.name} · {p.userId?.city}
        </p>

        <Link className="btn-primary mt-6" to="/technician/jobs">
          Manage jobs
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat title="Active jobs" value={active} />
        <Stat title="Completed" value={p.totalJobs || 0} />
        <Stat
          title="Rating"
          value={`${p.rating?.toFixed?.(1) || '0.0'} / 5`}
        />
      </div>

      {/* Customer Reviews */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-black">Customer Reviews</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ratings and comments submitted by your customers.
          </p>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
            No customer reviews yet.
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map(job => (
              <article
                key={job._id}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold">
                      {job.customerId?.name || 'Customer'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {job.category?.name || 'Service'}
                    </p>
                  </div>

                  <span className="font-bold text-amber-500">
                    {'★'.repeat(job.review.rating)}
                    {'☆'.repeat(5 - job.review.rating)}
                    <span className="ml-2 text-slate-700">
                      {job.review.rating}/5
                    </span>
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-700">
                  {job.review.comment?.trim()
                    ? job.review.comment
                    : 'No written comment provided.'}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}
