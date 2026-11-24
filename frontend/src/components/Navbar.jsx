import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  ShieldCheck,
  User,
  Wrench,
  X
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import ChatModal from './ChatModal';
import useChatNotifications from '../hooks/useChatNotifications';

const nav = {
  customer: [
    ['/customer/home', 'Home', LayoutDashboard],
    ['/customer/technicians', 'Find Technicians', Search],
    ['/customer/my-requests', 'My Bookings', ClipboardList],
    ['/customer/profile', 'Profile', User]
  ],
  technician: [
    ['/technician/dashboard', 'Dashboard', LayoutDashboard],
    ['/technician/jobs', 'Jobs', ClipboardList],
    ['/technician/profile', 'Profile', User]
  ],
  admin: [
    ['/admin/dashboard', 'Dashboard', LayoutDashboard],
    ['/admin/pending-technicians', 'Applications', ShieldCheck]
  ]
};

export default function Navbar() {
  const { user, role, logoutUser } = useAuth();
  const { summary } = useChatNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const links = nav[role] || [];
  const canOpenSupport = role === 'customer' || role === 'technician';
  const supportUnread = summary.supportUnreadCount;
  const logout = () => {
    logoutUser();
    navigate('/auth/login');
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to={role === 'admin' ? '/admin/dashboard' : role === 'technician' ? '/technician/dashboard' : '/customer/home'}
            className="flex items-center gap-2 text-xl font-black text-slate-900"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white"><Wrench size={18} /></span>
            Fix<span className="text-blue-600">It</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map(([to, label, Icon]) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${location.pathname === to ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Icon size={16} />{label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-slate-800">{user?.name}</p>
              <p className="text-xs capitalize text-slate-500">{role}</p>
            </div>
            {canOpenSupport && (
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="hidden items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 sm:flex"
              >
                <MessageCircle size={16} />Support / Help Chat
                {supportUnread > 0 && <UnreadBadge count={supportUnread} />}
              </button>
            )}
            <button onClick={logout} className="hidden rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 sm:block" aria-label="Log out">
              <LogOut size={18} />
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg p-2 md:hidden" aria-label="Toggle navigation">
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-slate-200 bg-white p-3 md:hidden">
            {links.map(([to, label, Icon]) => (
              <Link key={to} onClick={() => setMenuOpen(false)} to={to} className="flex items-center gap-3 rounded-lg px-3 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                <Icon size={18} />{label}
              </Link>
            ))}
            {canOpenSupport && (
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setChatOpen(true); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 font-semibold text-blue-700 hover:bg-blue-50"
              >
                <MessageCircle size={18} />Support / Help Chat
                {supportUnread > 0 && <UnreadBadge count={supportUnread} />}
              </button>
            )}
            <button onClick={logout} className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-3 font-semibold text-red-600">
              <LogOut size={18} />Logout
            </button>
          </div>
        )}
      </header>
      {canOpenSupport && (
        <ChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} chatType="support" title="Support / Help Chat" />
      )}
    </>
  );
}

function UnreadBadge({ count }) {
  return <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">{count > 99 ? '99+' : count}</span>;
}
