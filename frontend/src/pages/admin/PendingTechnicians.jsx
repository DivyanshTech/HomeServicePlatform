import { useCallback, useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import { MapPin, Phone, ShieldCheck } from 'lucide-react';

export default function PendingTechnicians() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await adminService.getPendingTechnicians();
      setList(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load technician applications:', err);
      setError(
        err?.response?.data?.message ||
          'Unable to load technician applications.'
      );
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        Loading applications...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h2 className="text-lg font-bold text-red-700">
          Unable to load applications
        </h2>

        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>

        <button
          type="button"
          onClick={load}
          className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black">
          Technician Applications
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Verify submitted details before allowing a technician into the marketplace.
        </p>
      </div>

      {!list.length ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-slate-500">
          No pending applications.
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((technician) => (
            <Application
              key={technician._id}
              t={technician}
              refresh={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Application({ t, refresh }) {
  const [busy, setBusy] = useState(false);

  const act = async (type) => {
    const actionText = type === 'approve' ? 'approve' : 'reject';

    if (
      !window.confirm(
        `Are you sure you want to ${actionText} this application?`
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      if (type === 'approve') {
        await adminService.approveTechnician(t._id);
      } else {
        await adminService.rejectTechnician(t._id);
      }

      await refresh();
    } catch (err) {
      console.error(`Failed to ${actionText} technician:`, err);

      window.alert(
        err?.response?.data?.message ||
          `Unable to ${actionText} this application.`
      );
    } finally {
      setBusy(false);
    }
  };

  const name = t?.userId?.name || 'Unknown technician';
  const category = t?.category?.name || 'Category not available';
  const phone = t?.userId?.phone || 'Not provided';
  const locality = t?.userId?.locality || 'Not provided';
  const city = t?.userId?.city || 'Not provided';
  const address = t?.userId?.address || 'Not provided';

  return (
    <article className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          {t.profileImage ? (
            <img src={t.profileImage} alt={name} className="h-20 w-20 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-slate-100 text-xl font-black text-slate-400">
              {name.charAt(0)}
            </div>
          )}
          <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black">
              {name}
            </h2>

            <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
              Pending
            </span>
          </div>

          <p className="mt-1 font-semibold text-blue-600">
            {category}
          </p>

          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <p>
              <Phone size={15} className="mr-1 inline" />
              {phone}
            </p>

            <p>
              <MapPin size={15} className="mr-1 inline" />
              {locality}, {city}
            </p>

            <p>
              Experience:{' '}
              <b>{t?.experience ?? 0} years</b>
            </p>

            <p>
              Charge:{' '}
              <b>₹{t?.serviceCharge ?? 0}</b>
            </p>

            <p className="sm:col-span-2">
              Address: <b>{address}</b>
            </p>
          </div>
        </div>
        </div>
        <div className="flex gap-2 lg:min-w-48 lg:flex-col">
          <button
            type="button"
            disabled={busy}
            onClick={() => act('approve')}
            className="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldCheck size={17} />
            {busy ? 'Processing...' : 'Approve'}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => act('reject')}
            className="btn-danger justify-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Processing...' : 'Reject'}
          </button>
        </div>
      </div>
    </article>
  );
}