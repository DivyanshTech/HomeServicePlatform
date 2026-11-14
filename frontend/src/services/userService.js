import api from '../api/axios';
export const getMe=()=>api.get('/users/me').then(r=>r.data);export const updateMe=data=>api.patch('/users/me',data).then(r=>r.data);export default {getMe,updateMe};
