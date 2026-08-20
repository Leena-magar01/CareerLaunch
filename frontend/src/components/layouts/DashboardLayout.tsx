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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleSelectNav = (id: string) => {
    onSelectItem(id);
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FCFCFC] text-[#243447] flex flex-col font-sans">
      <Header
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className="flex flex-1 relative">
        {/* Mobile backdrop */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {user && (
          <Sidebar
            role={user.role}
            activeItem={activeItem}
            onSelect={handleSelectNav}
            isOpenMobile={isMobileSidebarOpen}
          />
        )}

        <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full overflow-x-hidden">
          {(pageTitle || pageSubtitle || headerAction) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8E2E6] pb-4">
              <div>
                {pageTitle && <h1 className="text-2xl sm:text-3xl font-extrabold text-[#243447] tracking-tight">{pageTitle}</h1>}
                {pageSubtitle && <p className="text-xs sm:text-sm text-[#667085] mt-1">{pageSubtitle}</p>}
              </div>
              {headerAction && <div>{headerAction}</div>}
            </div>
          )}

          {children}
        </main>
      </div>

      <AICopilotDrawer isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />
    </div>
  );
};
