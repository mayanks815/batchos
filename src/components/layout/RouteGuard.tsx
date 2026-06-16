'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

interface RouteGuardProps {
  children: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Loading animation shell
  if (loading) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-slate-950 flex flex-col items-center justify-center z-50">
        <div className="relative flex flex-col items-center gap-4">
          {/* Pulsing ring indicator */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 animate-pulse">
            <span className="text-white font-black text-2xl tracking-tighter select-none">B</span>
          </div>
          
          <div className="flex flex-col items-center mt-2">
            <span className="text-sm font-extrabold text-slate-100 tracking-wider uppercase">
              Batch<span className="text-indigo-400">OS</span>
            </span>
            <span className="text-[10px] text-slate-500 font-bold tracking-widest mt-1 uppercase animate-pulse">
              Authenticating session...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // If we have a user, render the children
  return user ? <>{children}</> : null;
};
