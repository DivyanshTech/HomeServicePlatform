import api from '../api/axios';

const create = (bookingId, description) =>
  api.post(`/complaints/bookings/${bookingId}`, { description }).then(r => r.data);
const myComplaints = () => api.get('/complaints/my').then(r => r.data);
const technicianComplaints = () => api.get('/complaints/technician').then(r => r.data);

export default { create, myComplaints, technicianComplaints };
