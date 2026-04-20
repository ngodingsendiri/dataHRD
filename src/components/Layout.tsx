import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Menu, X, LogOut, ChevronLeft, ChevronRight, Settings, Printer, MessageSquare } from 'lucide-react';
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
    { name: 'Cetak', href: '/print', icon: Printer },
    { name: 'Pengaturan', href: '/settings', icon: Settings },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
  ];

  return (
    <div className="h-screen w-full bg-white flex overflow-hidden font-sans antialiased text-slate-900 print:block print:h-auto print:overflow-visible">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[2px] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-100 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col h-full print:hidden",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        {/* Logo Area */}
        <div className={cn(
          "flex items-center h-16 shrink-0 px-6",
          isSidebarCollapsed && "justify-center px-0"
        )}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <span className="text-base font-bold tracking-tight text-slate-900">HRCube</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-4 flex flex-col overflow-y-auto">
          <nav className="space-y-0.5">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center rounded-lg transition-colors group",
                    isSidebarCollapsed ? "justify-center p-3" : "px-3 py-2 text-[13px] font-medium",
                    isActive 
                      ? "bg-slate-50 text-slate-900 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]" 
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/50"
                  )}
                >
                  <item.icon className={cn(
                    "w-4 h-4 transition-colors", 
                    !isSidebarCollapsed && "mr-3",
                    isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                  )} />
                  {!isSidebarCollapsed && item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {/* User Profile */}
        <div className="p-4 border-t border-slate-50">
          <div className={cn("flex items-center gap-3", isSidebarCollapsed ? "justify-center" : "px-2")}>
            <div className="relative shrink-0">
              {auth.currentUser?.photoURL ? (
                <img src={auth.currentUser.photoURL} alt="Profile" className="w-8 h-8 rounded-full grayscale hover:grayscale-0 transition-all shadow-sm" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-bold">
                  {auth.currentUser?.email?.[0].toUpperCase() || 'A'}
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden flex-1">
                <div className="text-[12px] font-semibold text-slate-900 truncate">{auth.currentUser?.email?.split('@')[0]}</div>
                <div className="text-[10px] font-medium text-slate-400 truncate">Administrator</div>
              </div>
            )}
            {!isSidebarCollapsed && (
              <button
                onClick={() => signOut(auth)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:block print:overflow-visible">
        
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-100 h-14 px-4 flex items-center justify-between shrink-0 sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-slate-900 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">HRCube</span>
          </div>
          <button 
            className="p-2 -mr-2 text-slate-500"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8 p-4 md:p-8 lg:p-10 print:block print:overflow-visible print:p-0">
          <Outlet />
        </main>

        {/* BOTTOM NAV (Mobile Only) - Simplified */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-2 safe-bottom z-30 flex items-center justify-between shadow-[0_-1px_0_0_rgba(0,0,0,0.05)] print:hidden">
          {navigation.slice(0, 4).map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 transition-colors",
                  isActive ? "text-slate-900" : "text-slate-400"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                <span className="text-[9px] font-bold uppercase tracking-wider">{item.name === 'Master Data Pegawai' ? 'Data' : item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
