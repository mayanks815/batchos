'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CalendarDays, 
  CheckSquare, 
  Megaphone, 
  MoreHorizontal,
  FolderOpen, 
  Percent, 
  ShieldAlert, 
  UserCircle,
  X
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const pathname = usePathname() || '/dashboard';
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const mainNavItems = [
    { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Schedule', href: '/timetable', icon: CalendarDays },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Notices', href: '/notices', icon: Megaphone },
  ];

  const secondaryNavItems = [
    { name: 'Resources', href: '/resources', icon: FolderOpen },
    { name: 'Attendance', href: '/attendance', icon: Percent },
    { name: 'Admin Hub', href: '/admin', icon: ShieldAlert },
    { name: 'My Profile', href: '/profile', icon: UserCircle },
  ];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <>
      {/* Mobile bottom nav bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border-main bg-header-bg/95 backdrop-blur-lg px-2 pb-safe-bottom flex items-center justify-around h-16 shadow-2xl">
        {mainNavItems.map((item) => {
          const Active = isActive(item.href) && !isMenuOpen;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-colors ${
                Active ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-205'
              }`}
            >
              <Icon className={`w-5.5 h-5.5 mb-1 transition-transform active:scale-95 duration-100 ${
                Active ? 'text-indigo-400' : 'text-slate-450'
              }`} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={toggleMenu}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-colors ${
            isMenuOpen || secondaryNavItems.some(i => isActive(i.href))
              ? 'text-indigo-400' 
              : 'text-slate-400 hover:text-slate-205'
          }`}
        >
          <MoreHorizontal className={`w-5.5 h-5.5 mb-1 transition-transform active:scale-95 duration-100 ${
            isMenuOpen || secondaryNavItems.some(i => isActive(i.href)) ? 'text-indigo-400' : 'text-slate-450'
          }`} />
          <span>More</span>
        </button>
      </nav>

      {/* Slide-up Menu Drawer */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-955/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={toggleMenu}
          />
          
          {/* Menu Card */}
          <div className="relative w-full bg-card-bg border-t border-border-main rounded-t-3xl px-6 pt-5 pb-8 shadow-2xl z-10 transition-transform duration-300 transform translate-y-0">
            {/* Handle bar */}
            <div className="w-12 h-1 bg-border-main rounded-full mx-auto mb-6" />
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-450 tracking-wider uppercase">More Modules</h3>
              <button 
                onClick={toggleMenu}
                className="p-1 rounded-full bg-app-bg hover:bg-slate-900 border border-border-main text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid layout for remaining modules */}
            <div className="grid grid-cols-2 gap-4">
              {secondaryNavItems.map((item) => {
                const Active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={toggleMenu}
                    className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-medium transition-all ${
                      Active 
                        ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30 font-bold' 
                        : 'bg-app-bg text-slate-300 border-border-main active:bg-slate-900'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${Active ? 'bg-indigo-500/15' : 'bg-slate-950 border border-border-main'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
