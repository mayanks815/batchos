'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { useNotifications } from "@/hooks/useNotifications";
import { Toaster } from "sonner";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  useNotifications();
  return (
    <div className="flex h-screen w-full bg-app-bg text-text-primary overflow-hidden">
      <Toaster richColors position="top-right" />
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Hub */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Dynamic Page Scroll Container */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:p-6 lg:p-8 pb-20 lg:pb-8 scroll-smooth">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};
