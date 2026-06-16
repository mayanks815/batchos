'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CalendarDays, 
  CheckSquare, 
  Megaphone, 
  FolderOpen, 
  Percent, 
  ShieldAlert, 
  UserCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Timetable', href: '/timetable', icon: CalendarDays },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Notices', href: '/notices', icon: Megaphone },
  { name: 'Resources', href: '/resources', icon: FolderOpen },
  { name: 'Attendance', href: '/attendance', icon: Percent },
  { name: 'Admin Hub', href: '/admin', icon: ShieldAlert },
  { name: 'My Profile', href: '/profile', icon: UserCircle },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname() || '/dashboard';

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-sidebar-bg border-r border-border-main flex-shrink-0">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center border-b border-border-main gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <span className="text-white font-black text-base tracking-tighter">B</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-extrabold text-slate-100 tracking-wide uppercase leading-none">
            Batch<span className="text-indigo-400">OS</span>
          </span>
          <span className="text-[10px] text-slate-500 font-semibold tracking-wider mt-0.5">
            MBA MANAGEMENT
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                Active
                  ? 'text-indigo-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              {Active && (
                <motion.span
                  layoutId="activeNavIndicator"
                  className="absolute inset-0 bg-indigo-500/10 border border-indigo-500/20 rounded-xl -z-10 shadow-inner"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {Active && (
                <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-md bg-gradient-to-b from-indigo-500 to-violet-500" />
              )}
              <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105 duration-200 ${
                Active ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-350'
              }`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Banner */}
      <div className="p-4 border-t border-border-main">
        <div className="p-3.5 rounded-2xl bg-card-bg border border-border-main flex flex-col gap-1.5 shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-emerald-400 font-bold tracking-wide uppercase">Offline Ready</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            All data is saved locally on your device for immediate offline access.
          </p>
        </div>
      </div>
    </aside>
  );
};
