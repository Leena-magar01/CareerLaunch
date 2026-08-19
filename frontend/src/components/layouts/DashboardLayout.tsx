import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { AICopilotDrawer } from '../AICopilotDrawer';
import { useAuth } from '../../context/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeItem: string;
  onSelectItem: (id: string) => void;
  pageTitle?: string;
  pageSubtitle?: string;
  headerAction?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeItem,
  onSelectItem,
  pageTitle,
  pageSubtitle,
  headerAction
}) => {
  const { user } = useAuth();
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      <Header onOpenCopilot={() => setIsCopilotOpen(true)} />

      <div className="flex flex-1">
        {user && (
          <Sidebar
            role={user.role}
            activeItem={activeItem}
            onSelect={onSelectItem}
          />
        )}

        <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {(pageTitle || pageSubtitle || headerAction) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                {pageTitle && <h1 className="text-2xl font-black text-white tracking-tight">{pageTitle}</h1>}
                {pageSubtitle && <p className="text-xs text-slate-400 mt-1">{pageSubtitle}</p>}
              </div>
              {headerAction && <div>{headerAction}</div>}
            </div>
          )}

          <div>{children}</div>
        </main>
      </div>

      <AICopilotDrawer isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />
    </div>
  );
};
