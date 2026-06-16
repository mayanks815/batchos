'use client';

import React from 'react';
import { BatchProvider } from '../../store/BatchContext';
import { AppShell } from './AppShell';

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
}

export const ClientLayoutWrapper: React.FC<ClientLayoutWrapperProps> = ({ children }) => {
  return (
    <BatchProvider>
      <AppShell>{children}</AppShell>
    </BatchProvider>
  );
};
