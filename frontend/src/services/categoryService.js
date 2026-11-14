import api from '../api/axios';export const getCategories=()=>api.get('/categories').then(r=>r.data);export default {getCategories};
