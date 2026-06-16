'use client';

import React from 'react';
import { RouteGuard } from '../../components/layout/RouteGuard';
import { BatchProvider } from '../../store/BatchContext';
import { AppShell } from '../../components/layout/AppShell';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard>
      <BatchProvider>
        <AppShell>{children}</AppShell>
      </BatchProvider>
    </RouteGuard>
  );
}
