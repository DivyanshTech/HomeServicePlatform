import {useEffect,useState} from 'react';
import {useNavigate,useParams} from 'react-router-dom';
import technicianService from '../../services/technicianService';
import bookingService from '../../services/bookingService';

export default function CreateRequest(){
  const {technicianId}=useParams();
  const nav=useNavigate();
  const [t,setT]=useState(null);
  const [issue,setIssue]=useState('');
  const [scheduledFor,setScheduledFor]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    let active=true;
    setError('');
    technicianService.getTechnicianById(technicianId)
      .then(r=>{
        const value=r?.data;
        if(!value?._id || !value?.userId || !value?.category?._id){
          throw new Error('Technician profile is incomplete. Please go back and choose another technician.');
        }
        if(active)setT(value);
      })
      .catch(e=>{if(active)setError(e.response?.data?.message||e.message||'Unable to load technician')});
    return ()=>{active=false};
  },[technicianId]);

  const submit=async e=>{
    e.preventDefault();
    if(!t?.category?._id){setError('This technician does not have a valid service category.');return}
    setBusy(true);setError('');
    try{
      await bookingService.create({technicianId,category:t.category._id,issueDescription:issue.trim(),scheduledFor:scheduledFor||null});
      nav('/customer/my-requests',{replace:true});
    }catch(e){
      setError(e.response?.data?.message||'Booking failed. Please try again.');
    }finally{setBusy(false)}
  };

  if(error)return <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"><h1 className="font-black">Unable to open booking</h1><p className="mt-2 text-sm">{error}</p><button type="button" onClick={()=>nav('/customer/technicians')} className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm">Back to technicians</button></div>;
  if(!t)return <div className="py-16 text-center text-slate-500">Loading booking...</div>;

  return <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h1 className="text-2xl font-black">Book {t.userId.name}</h1>
    <p className="mt-1 text-sm text-slate-500">{t.category.name} · ₹{t.serviceCharge}</p>
    <form onSubmit={submit} className="mt-6 space-y-5">
      <label className="block"><span className="mb-1.5 block text-sm font-semibold">Describe the issue</span><textarea required rows="6" maxLength="1000" value={issue} onChange={e=>setIssue(e.target.value)} className="input" placeholder="Tell the technician what needs to be repaired..."/></label>
      <label className="block"><span className="mb-1.5 block text-sm font-semibold">Preferred date & time (optional)</span><input type="datetime-local" value={scheduledFor} onChange={e=>setScheduledFor(e.target.value)} className="input"/></label>
      <div className="rounded-xl bg-blue-50 p-4"><p className="text-sm text-blue-800">Quoted service charge</p><p className="text-2xl font-black text-blue-900">₹{t.serviceCharge}</p></div>
      <button disabled={busy} className="btn-primary w-full justify-center">{busy?'Creating booking...':'Confirm booking'}</button>
    </form>
  </div>;
}
