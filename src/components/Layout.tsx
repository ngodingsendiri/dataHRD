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
        "fixed inset-y-0 left-0 z-30 bg-white border-r border-slate-200 transform transition-all duration-300 lg:translate-x-0 lg:static lg:inset-0 flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className={cn(
          "flex items-center h-16 border-b border-slate-100 shrink-0 relative",
          isSidebarCollapsed ? "justify-center px-0" : "justify-between px-6"
        )}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm shrink-0">
              <Users className="w-4 h-4 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <span className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">dataHRD</span>
            )}
          </div>
          
          {/* Desktop Collapse Toggle */}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-900 shadow-sm transition-all z-50"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>

          <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                title={isSidebarCollapsed ? item.name : undefined}
                className={cn(
                  "flex items-center rounded-xl transition-all duration-200",
                  isSidebarCollapsed ? "justify-center p-2.5" : "px-4 py-2.5 text-sm font-medium",
                  isActive 
                    ? "bg-slate-900 text-white shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", !isSidebarCollapsed && "mr-3", isActive ? "text-white" : "text-slate-400")} />
                {!isSidebarCollapsed && item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <button 
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700 hidden sm:block">
                {auth.currentUser?.email}
              </span>
              {auth.currentUser?.photoURL ? (
                <img src={auth.currentUser.photoURL} alt="Profile" className="w-8 h-8 rounded-full ring-2 ring-white shadow-sm" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-medium shadow-sm">
                  {auth.currentUser?.email?.[0].toUpperCase() || 'A'}
                </div>
              )}
              <button
                onClick={() => signOut(auth)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
