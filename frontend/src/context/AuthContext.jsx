import {createContext,useEffect,useState} from 'react';import authService from '../services/authService';import userService from '../services/userService';import technicianService from '../services/technicianService';import {getToken,setToken,removeToken} from '../utils/token';
export const AuthContext=createContext(null);
export function AuthProvider({children}){const [token,setTokenState]=useState(getToken());const [user,setUser]=useState(null);const [technician,setTechnician]=useState(null);const [loading,setLoading]=useState(true);
const load=async()=>{const t=getToken();if(!t){setLoading(false);return}try{const me=await userService.getMe();setUser(me.data);if(me.data.role==='technician'){try{const p=await technicianService.getProfile();setTechnician(p.data)}catch{setTechnician(null)}}}catch{removeToken();setTokenState(null);setUser(null)}finally{setLoading(false)}};
useEffect(()=>{load()},[]);
const loginUser=async(data)=>{const r=await authService.login(data);setToken(r.data.token);setTokenState(r.data.token);setUser(r.data.user);if(r.data.user.role==='technician'){try{const p=await technicianService.getProfile();setTechnician(p.data)}catch{setTechnician(null)}}return r.data.user};
const registerUser=async(data)=>authService.register(data);const logoutUser=()=>{removeToken();setTokenState(null);setUser(null);setTechnician(null)};
const refreshUser=async()=>{const r=await userService.getMe();setUser(r.data);return r.data};
return <AuthContext.Provider value={{token,user,role:user?.role||null,technician,loading,loginUser,registerUser,logoutUser,refreshUser}}>{children}</AuthContext.Provider>}
