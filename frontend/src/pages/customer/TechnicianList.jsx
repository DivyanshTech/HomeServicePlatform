
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Briefcase } from 'lucide-react';
import technicianService from '../../services/technicianService';
import categoryService from '../../services/categoryService';

export default function TechnicianList() {
  const [techs, setTechs] = useState([]);
  const [cats, setCats] = useState([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load categories once
  useEffect(() => {
    categoryService.getCategories()
      .then(r => setCats(r.data || []))
      .catch(() => setError('Unable to load categories'));
  }, []);

  // Fetch technicians whenever category changes
  useEffect(() => {
    let cancelled = false;

    const loadTechnicians = async () => {
      setLoading(true);
      setError('');

      try {
        const params = category ? { category } : {};
        const response = await technicianService.getTechnicians(params);

        if (!cancelled) {
          setTechs(response.data || []);
        }
      } catch (e) {
        if (!cancelled) {
          setTechs([]);
          setError(
            e.response?.data?.message ||
            'Unable to load technicians'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTechnicians();

    return () => {
      cancelled = true;
    };
  }, [category]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Find Technicians
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Showing verified professionals serving your exact locality.
          </p>
        </div>

        <select
          className="input sm:w-64"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>

          {cats.map(c => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-500">
          Loading local technicians...
        </div>
      ) : techs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          No approved technicians are currently available in your city/locality for this category.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {techs.map(t => (
            <Card key={t._id} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ t }) {
  const u = t.userId;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {t.profileImage ? (
              <img src={t.profileImage} alt={u?.name} className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-lg font-black text-slate-400">
                {u?.name?.charAt(0) || '?'}
              </div>
            )}
            <div>
              <h2 className="text-lg font-black text-slate-900">{u?.name}</h2>
              <p className="text-sm font-semibold text-blue-600">{t.category?.name}</p>
            </div>
          </div>

          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            Verified
          </span>
        </div>

        <div className="mt-5 space-y-2 text-sm text-slate-600">
          <p className="flex gap-2">
            <MapPin size={16} />
            {u?.locality ? `${u.locality}, ` : ''}{u?.city}
          </p>

          <p className="flex gap-2">
            <Briefcase size={16} />
            {t.experience} years experience
          </p>

          <p className="flex gap-2">
            <Star size={16} className="fill-amber-400 text-amber-400" />
            {t.rating?.toFixed?.(1) || '0.0'} ({t.reviewCount || 0} reviews)
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs text-slate-500">Service charge</p>
            <p className="text-lg font-black text-slate-900">
              ₹{t.serviceCharge}
            </p>
          </div>

          <Link
            className="btn-primary"
            to={`/customer/technicians/${t._id}`}
          >
            View profile
          </Link>
        </div>
      </div>
    </article>
  );
}
