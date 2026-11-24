import { useEffect, useState } from 'react';
import technicianService from '../../services/technicianService';
import useAuth from '../../hooks/useAuth';

export default function Profile() {
  const { refreshUser } = useAuth();
  const [p, setP] = useState(null);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', city: '', locality: '', address: '',
    experience: 0, serviceCharge: 0, availability: true, profileImage: ''
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    technicianService.getProfile().then(r => {
      setP(r.data);
      const u = r.data.userId;
      setForm({
        name: u.name, phone: u.phone, email: u.email || '', city: u.city,
        locality: u.locality || '', address: u.address || '',
        experience: r.data.experience, serviceCharge: r.data.serviceCharge,
        availability: r.data.availability, profileImage: r.data.profileImage || ''
      });
    });
  }, []);

  const selectPhoto = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG or WebP photo');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Profile photo must be smaller than 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm(current => ({ ...current, profileImage: reader.result }));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const save = async event => {
    event.preventDefault();
    setError('');
    setMsg('');
    try {
      const r = await technicianService.updateProfile({
        ...form,
        experience: Number(form.experience),
        serviceCharge: Number(form.serviceCharge)
      });
      setP(r.data);
      await refreshUser();
      setMsg('Profile updated');
    } catch (e) {
      setError(e.response?.data?.message || 'Update failed');
    }
  };

  if (!p) return <div className="py-16 text-center">Loading profile...</div>;

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black">Technician Profile</h1>
          <p className="text-sm text-slate-500">Verified profiles are visible only in their configured service area.</p>
        </div>
        <span className="status-completed">Verified</span>
      </div>
      {msg && <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}
      {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={save} className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 flex items-center gap-5">
          {form.profileImage ? (
            <img src={form.profileImage} alt="Technician profile" className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-400">No photo</div>
          )}
          <div>
            <label className="block text-sm font-semibold">Profile photo (optional)</label>
            <input className="mt-2 block text-sm" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} />
            {form.profileImage && (
              <button type="button" className="mt-2 text-sm font-bold text-red-600" onClick={() => setForm(current => ({ ...current, profileImage: '' }))}>
                Remove photo
              </button>
            )}
          </div>
        </div>
        {['name', 'phone', 'email', 'city', 'locality', 'address'].map(k => (
          <label key={k}>
            <span className="mb-1.5 block text-sm font-semibold capitalize">{k}</span>
            <input className="input" value={form[k]} onChange={e => setForm(current => ({ ...current, [k]: e.target.value }))} />
          </label>
        ))}
        <label>
          <span className="mb-1.5 block text-sm font-semibold">Experience (years)</span>
          <input className="input" type="number" min="0" value={form.experience} onChange={e => setForm(current => ({ ...current, experience: e.target.value }))} />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-semibold">Service charge (₹)</span>
          <input className="input" type="number" min="0" value={form.serviceCharge} onChange={e => setForm(current => ({ ...current, serviceCharge: e.target.value }))} />
        </label>
        <label className="flex items-center gap-3 sm:col-span-2">
          <input type="checkbox" checked={form.availability} onChange={e => setForm(current => ({ ...current, availability: e.target.checked }))} />
          <span className="font-semibold">Available for new bookings</span>
        </label>
        <button className="btn-primary sm:col-span-2">Save profile</button>
      </form>
    </div>
  );
}
