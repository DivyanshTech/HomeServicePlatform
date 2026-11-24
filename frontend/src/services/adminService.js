import api from '../api/axios';

const getDashboardStats = () => api.get('/admin/dashboard').then(r => r.data);
const getPeople = () => api.get('/admin/people').then(r => r.data);
const getComplaints = () => api.get('/admin/complaints').then(r => r.data);
const updateComplaint = (id, data) =>
  api.patch(`/admin/complaints/${id}`, data).then(r => r.data);
const setTechnicianActive = (id, isActive) =>
  api.patch(`/admin/technicians/${id}/active`, { isActive }).then(r => r.data);
const getPendingTechnicians = () =>
  api.get('/admin/technicians/pending').then(r => r.data);
const approveTechnician = id =>
  api.patch(`/admin/technicians/${id}/approve`).then(r => r.data);
const rejectTechnician = id =>
  api.patch(`/admin/technicians/${id}/reject`).then(r => r.data);

export default {
  getDashboardStats,
  getPeople,
  getComplaints,
  updateComplaint,
  setTechnicianActive,
  getPendingTechnicians,
  approveTechnician,
  rejectTechnician
};
