'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import AuthGuard from './AuthGuard';

interface DashboardLayoutProps {
  children: React.ReactNode;
  headerTitle?: string;
  suppressHydrationWarning?: boolean;
}

export const DashboardLayout = ({ children, headerTitle, suppressHydrationWarning }: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <AuthGuard>
      <div suppressHydrationWarning={suppressHydrationWarning} className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          activePath={pathname}
        />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header 
            onMenuOpen={() => setIsSidebarOpen(true)} 
            title={headerTitle}
          />
          
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 custom-scrollbar">
            {children}
          </div>
        </main>

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #e2e8f0;
            border-radius: 10px;
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #1e293b;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #cbd5e1;
          }
        `}</style>
      </div>
    </AuthGuard>
  );
};
