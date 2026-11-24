import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import chatService from '../../services/chatService';
import ChatModal from '../../components/ChatModal';
import useChatNotifications from '../../hooks/useChatNotifications';

const statusLabels = {
  pending: 'Pending',
  in_review: 'Under review',
  resolved: 'Resolved',
  dismissed: 'Dismissed'
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [people, setPeople] = useState({ customers: [], technicians: [] });
  const [complaints, setComplaints] = useState([]);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [accountActionId, setAccountActionId] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const load = async () => {
    setError('');
    try {
      const [statsResponse, peopleResponse, complaintResponse] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getPeople(),
        adminService.getComplaints()
      ]);
      setStats(statsResponse.data);
      setPeople(peopleResponse.data);
      setComplaints(complaintResponse.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load admin dashboard');
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      adminService.getDashboardStats(),
      adminService.getPeople(),
      adminService.getComplaints()
    ]).then(([statsResponse, peopleResponse, complaintResponse]) => {
      if (!active) return;
      setStats(statsResponse.data);
      setPeople(peopleResponse.data);
      setComplaints(complaintResponse.data);
    }).catch(requestError => {
      if (active) setError(requestError.response?.data?.message || 'Unable to load admin dashboard');
    });
    return () => {
      active = false;
    };
  }, []);

  const updateCase = async (complaint, status) => {
    setSavingId(complaint._id);
    setError('');
    try {
      await adminService.updateComplaint(complaint._id, {
        status,
        adminNote: notes[complaint._id] ?? complaint.adminNote ?? ''
      });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update complaint');
    } finally {
      setSavingId('');
    }
  };

  const setTechnicianActive = async technician => {
    const isActive = !technician.userId?.isActive;
    const action = isActive ? 'reactivate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${action} ${technician.userId?.name || 'this technician'}?`)) return;
    setAccountActionId(technician._id);
    setError('');
    try {
      await adminService.setTechnicianActive(technician._id, isActive);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Unable to ${action} technician`);
    } finally {
      setAccountActionId('');
    }
  };

  if (error && !stats) {
    return (
      <div className="rounded-xl bg-red-50 p-5 text-red-700">
        <p>{error}</p>
        <button onClick={load} className="mt-3 font-bold underline">Try again</button>
      </div>
    );
  }
  if (!stats) return <div className="py-16 text-center">Loading admin dashboard...</div>;

  const cards = [
    ['Customers', stats.customers],
    ['Technicians', stats.technicians],
    ['Approved technicians', stats.approvedTechnicians],
    ['Pending applications', stats.pendingTechnicians],
    ['Total bookings', stats.bookings],
    ['Completed bookings', stats.completedBookings],
    ['Open complaints', stats.openComplaints ?? 0]
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Administration</p>
        <h1 className="mt-1 text-3xl font-black">FixIt Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Manage people, service activity, and customer complaints.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-3" role="tablist" aria-label="Admin dashboard sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          className={`rounded-lg px-4 py-2 text-sm font-bold ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'support'}
          onClick={() => setActiveTab('support')}
          className={`rounded-lg px-4 py-2 text-sm font-bold ${activeTab === 'support' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          Support Inbox
        </button>
      </div>

      {activeTab === 'support' ? <SupportInbox /> : <div className="space-y-8">
      {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </div>

      {stats.pendingTechnicians > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-black">{stats.pendingTechnicians} technician application{stats.pendingTechnicians > 1 ? 's' : ''} awaiting review</h2>
          <Link className="mt-3 inline-flex font-bold text-blue-700" to="/admin/pending-technicians">Review applications →</Link>
        </div>
      )}

      <section className="space-y-4">
        <SectionHeading title="Customer complaints" description="Review reports directly submitted by customers and keep an audit status." />
        {!complaints.length ? (
          <Empty text="No customer complaints yet." />
        ) : complaints.map(complaint => (
          <article key={complaint._id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-black">{complaint.customerId?.name || 'Customer'} reported {complaint.technicianId?.userId?.name || 'technician'}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {complaint.technicianId?.category?.name || complaint.bookingId?.category?.name || 'Service'} · Booking {complaint.bookingId?._id?.slice(-6) || '—'} · {new Date(complaint.createdAt).toLocaleDateString()}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{complaint.description}</p>
                <p className="mt-2 text-sm text-slate-500">
                  Customer: {complaint.customerId?.phone || 'No phone'} · Technician: {complaint.technicianId?.userId?.phone || 'No phone'}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${complaint.status === 'pending' ? 'bg-amber-50 text-amber-700' : complaint.status === 'in_review' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                {statusLabels[complaint.status]}
              </span>
            </div>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Admin note (visible to technician)</span>
              <textarea
                className="input"
                rows="2"
                maxLength="1000"
                value={notes[complaint._id] ?? complaint.adminNote ?? ''}
                onChange={event => setNotes(current => ({ ...current, [complaint._id]: event.target.value }))}
                placeholder="Add the review outcome or guidance"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {['in_review', 'resolved', 'dismissed'].map(status => (
                <button
                  key={status}
                  disabled={savingId === complaint._id || complaint.status === status}
                  onClick={() => updateCase(complaint, status)}
                  className="rounded-lg border px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
                >
                  {savingId === complaint._id ? 'Saving…' : `Mark ${statusLabels[status].toLowerCase()}`}
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-4">
        <SectionHeading title={`Customers (${people.customers.length})`} description="Customer names and contact/service-area details." />
        {!people.customers.length ? <Empty text="No customer accounts yet." /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {people.customers.map(customer => (
              <PersonCard key={customer._id} name={customer.name} phone={customer.phone} email={customer.email} city={customer.city} locality={customer.locality} address={customer.address} joined={customer.createdAt} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading title={`Technicians (${people.technicians.length})`} description="Professional profile, service area, availability, and approval status." />
        {!people.technicians.length ? <Empty text="No technician profiles yet." /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {people.technicians.map(technician => (
              <PersonCard
                key={technician._id}
                name={technician.userId?.name || 'Unknown technician'}
                phone={technician.userId?.phone}
                email={technician.userId?.email}
                city={technician.userId?.city}
                locality={technician.userId?.locality}
                address={technician.userId?.address}
                joined={technician.createdAt}
                details={`${technician.category?.name || 'Uncategorized'} · ${technician.experience || 0} years experience · ₹${technician.serviceCharge} · ★ ${Number(technician.rating || 0).toFixed(1)} (${technician.reviewCount || 0} reviews) · ${technician.totalJobs || 0} jobs`}
                status={!technician.userId?.isActive ? 'Account suspended' : technician.isApproved ? (technician.availability ? 'Approved · Available' : 'Approved · Unavailable') : 'Pending approval'}
                action={
                  <button
                    type="button"
                    disabled={accountActionId === technician._id}
                    onClick={() => setTechnicianActive(technician)}
                    className={`mt-4 rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-50 ${technician.userId?.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                  >
                    {accountActionId === technician._id ? 'Saving…' : technician.userId?.isActive ? 'Suspend account' : 'Reactivate account'}
                  </button>
                }
              />
            ))}
          </div>
        )}
      </section>
      </div>}
    </div>
  );
}

function SupportInbox() {
  const { summary } = useChatNotifications();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sortedThreads = [...threads].sort((first, second) => {
    const firstUnread = summary.supportUnreadMap[first.threadUser._id] ?? first.unreadCount ?? 0;
    const secondUnread = summary.supportUnreadMap[second.threadUser._id] ?? second.unreadCount ?? 0;
    if (firstUnread !== secondUnread) return secondUnread - firstUnread;
    return new Date(second.latestMessage.createdAt) - new Date(first.latestMessage.createdAt);
  });

  const loadThreads = useCallback(async () => {
    try {
      const response = await chatService.getSupportThreads();
      setThreads(response.data || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load support conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const pollThreads = () => {
      chatService.getSupportThreads().then(response => {
        if (!active) return;
        setThreads(response.data || []);
        setError('');
      }).catch(requestError => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load support conversations');
      }).finally(() => {
        if (active) setLoading(false);
      });
    };
    pollThreads();
    const intervalId = window.setInterval(pollThreads, 4000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Support Inbox</h2>
          <p className="mt-1 text-sm text-slate-500">Reply to customer and service partner help conversations.</p>
        </div>
        <button type="button" onClick={loadThreads} className="rounded-lg border px-3 py-2 text-sm font-bold text-slate-700">
          Refresh
        </button>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading ? <p className="py-8 text-center text-slate-500">Loading support conversations...</p> : !threads.length ? (
        <Empty text="No support conversations yet." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sortedThreads.map(thread => {
            const unreadCount = summary.supportUnreadMap[thread.threadUser._id] ?? thread.unreadCount ?? 0;
            return (
            <button
              key={thread.threadUser._id}
              type="button"
              onClick={() => setSelectedThread(thread)}
              className="rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black">{thread.threadUser.name}</h3>
                  <p className="mt-1 text-xs capitalize text-slate-500">{thread.threadUser.role}</p>
                </div>
                <time className="shrink-0 text-xs text-slate-400">
                  {new Date(thread.latestMessage.createdAt).toLocaleString()}
                </time>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-slate-600">{thread.latestMessage.text}</p>
              <p className="mt-2 flex items-center justify-between gap-2 text-xs font-semibold text-blue-700">
                <span>{thread.messageCount} message{thread.messageCount === 1 ? '' : 's'} · Open conversation</span>
                {unreadCount > 0 && <UnreadBadge count={unreadCount} />}
              </p>
            </button>
            );
          })}
        </div>
      )}
      {selectedThread && (
        <ChatModal
          key={selectedThread.threadUser._id}
          isOpen
          onClose={() => setSelectedThread(null)}
          chatType="admin-support"
          threadUserId={selectedThread.threadUser._id}
          title={`Support: ${selectedThread.threadUser.name}`}
        />
      )}
    </section>
  );
}

function SectionHeading({ title, description }) {
  return <div><h2 className="text-2xl font-black">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}

function Empty({ text }) {
  return <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">{text}</div>;
}

function UnreadBadge({ count }) {
  return <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">{count > 99 ? '99+' : count}</span>;
}

function PersonCard({ name, phone, email, city, locality, address, joined, details, status, action }) {
  return (
    <article className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-black">{name}</h3>
        {status && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{status}</span>}
      </div>
      {details && <p className="mt-2 text-sm font-semibold text-slate-700">{details}</p>}
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <Info label="Phone" value={phone} />
        <Info label="Email" value={email} />
        <Info label="City / locality" value={[city, locality].filter(Boolean).join(' · ')} />
        <Info label="Address" value={address} />
        <Info label="Joined" value={joined ? new Date(joined).toLocaleDateString() : ''} />
      </dl>
      {action}
    </article>
  );
}

function Info({ label, value }) {
  return <div><dt className="text-xs text-slate-400">{label}</dt><dd className="break-words font-semibold text-slate-700">{value || 'Not provided'}</dd></div>;
}
