import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Menu, X, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Master Data Pegawai', href: '/employees', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-30 bg-white border-r border-slate-200/60 transform transition-all duration-500 lg:translate-x-0 lg:static lg:inset-0 flex flex-col shadow-sm",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        isSidebarCollapsed ? "w-24" : "w-72"
      )}>
        <div className={cn(
          "flex items-center h-20 border-b border-slate-100 shrink-0 relative",
          isSidebarCollapsed ? "justify-center px-0" : "justify-between px-8"
        )}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <span className="text-xl font-black tracking-tighter text-slate-900 whitespace-nowrap">dataHRD</span>
            )}
          </div>
          
          {/* Desktop Collapse Toggle */}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-400 shadow-md transition-all z-50"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>

          <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                title={isSidebarCollapsed ? item.name : undefined}
                className={cn(
                  "flex items-center rounded-2xl transition-all duration-300",
                  isSidebarCollapsed ? "justify-center p-3.5" : "px-5 py-3.5 text-sm font-bold tracking-tight",
                  isActive 
                    ? "bg-slate-900 text-white shadow-xl shadow-slate-200" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", !isSidebarCollapsed && "mr-4", isActive ? "text-white" : "text-slate-400")} />
                {!isSidebarCollapsed && item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 h-20 flex items-center justify-between px-6 sm:px-8 lg:px-10 sticky top-0 z-10">
          <button 
            className="lg:hidden p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Administrator</div>
                <div className="text-sm font-bold text-slate-700 leading-none">
                  {auth.currentUser?.email?.split('@')[0]}
                </div>
              </div>
              {auth.currentUser?.photoURL ? (
                <img src={auth.currentUser.photoURL} alt="Profile" className="w-10 h-10 rounded-2xl ring-4 ring-white shadow-lg" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold shadow-sm">
                  {auth.currentUser?.email?.[0].toUpperCase() || 'A'}
                </div>
              )}
              <div className="w-px h-6 bg-slate-200 mx-1" />
              <button
                onClick={() => signOut(auth)}
                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
