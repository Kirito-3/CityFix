import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { useSocket } from '../providers/SocketProvider';
import { 
  LayoutDashboard, 
  FileText, 
  Map, 
  LogOut, 
  User, 
  Bell, 
  Menu, 
  X, 
  Shield,
  Radio
} from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Server online', message: 'CityFix core engines synchronized successfully.', time: 'Just now' }
  ]);

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Complaints', path: '/complaints', icon: FileText },
    { name: 'Heatmap Feed', path: '/heatmap', icon: Map },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#070b14] text-gray-200 overflow-hidden font-sans">
      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Nav */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#0b101f] border-r border-[#1d273d] transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-[#1d273d]">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/30">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white font-outfit tracking-wide">CityFix</span>
              <span className="text-[10px] block font-semibold text-indigo-400 tracking-widest uppercase">Admin Panel</span>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-gray-400 hover:bg-[#1a233a] hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                    : 'text-gray-400 hover:bg-[#151c2e] hover:text-gray-200'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer profile info & sign-out */}
        <div className="border-t border-[#1d273d] p-4 bg-[#090d19]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#1b253b] border border-indigo-500/20 text-indigo-400 font-bold uppercase">
              {user?.name?.slice(0, 2) || 'AD'}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#090d19] bg-emerald-500"></span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">{user?.role || 'Admin'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Logout Session
          </button>
        </div>
      </aside>

      {/* Main panel body */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-[#1d273d] bg-[#0b101f]/80 backdrop-blur px-6 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-gray-400 hover:bg-[#1a233a] hover:text-white lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`}></span>
              <span className="text-xs text-gray-400 font-semibold flex items-center gap-1">
                <Radio className="h-3 w-3 inline text-indigo-400" />
                {connected ? 'Realtime Sync Active' : 'Offline State'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications Center */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-xl p-2 text-gray-400 hover:bg-[#1a233a] hover:text-white transition-all duration-200"
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-[#0b101f]"></span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2.5 w-80 rounded-2xl bg-[#0e1526] border border-[#1e2b47] p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="flex items-center justify-between border-b border-[#1e2b47] pb-2.5 mb-2.5">
                      <h4 className="font-bold text-white font-outfit text-sm">Notifications Feed</h4>
                      <button 
                        onClick={() => setNotifications([])}
                        className="text-[11px] font-semibold text-indigo-400 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-center text-xs text-gray-500 py-4">No active notifications</p>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} className="rounded-lg bg-[#141b2e] p-2.5 hover:bg-[#1a233a] transition-all">
                            <p className="text-xs font-bold text-white">{notif.title}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{notif.message}</p>
                            <span className="text-[9px] text-indigo-400 mt-1 block">{notif.time}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Avatar Card */}
            <div className="flex items-center gap-2 border-l border-[#1d273d] pl-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1b253b] border border-indigo-500/20 text-indigo-400 font-bold uppercase text-xs">
                {user?.name?.slice(0, 2) || 'AD'}
              </div>
              <span className="hidden text-xs font-semibold text-gray-300 md:inline">{user?.name || 'Admin'}</span>
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 overflow-y-auto bg-[#070b14] p-6 lg:p-8">
          <Outlet context={{ setNotifications }} />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
