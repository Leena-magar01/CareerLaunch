import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { GraduationCap, LogOut, Bell, Sparkles, Check, CheckCheck, Menu, X } from 'lucide-react';

interface HeaderProps {
  onOpenCopilot?: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCopilot, onToggleMobileSidebar }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoadingNotifications(true);
      const res = await api.get('/notifications?pageSize=10');
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.meta?.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // 30s polling
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'STUDENT': return 'bg-[#E9F3FD] text-[#4874A0] border-[#66A3BF]/30';
      case 'COMPANY': return 'bg-[#E9F3FD] text-[#4874A0] border-[#66A3BF]/30';
      case 'TNP': return 'bg-[#C9963E]/10 text-[#C9963E] border-[#C9963E]/30';
      case 'MENTOR': return 'bg-[#4F8A68]/10 text-[#4F8A68] border-[#4F8A68]/30';
      default: return 'bg-[#F2EFE6] text-[#243447] border-[#D8E2E6]';
    }
  };

  return (
    <header className="bg-white px-4 sm:px-6 py-3 flex items-center justify-between border-b border-[#D8E2E6] sticky top-0 z-30 shadow-xs">
      <div className="flex items-center space-x-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-lg text-[#667085] hover:text-[#243447] hover:bg-[#E9F3FD] transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="w-9 h-9 rounded-lg bg-[#66A3BF] flex items-center justify-center text-white shadow-sm shrink-0">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <span className="text-sm sm:text-base font-bold text-[#243447] tracking-tight">
            InternSync <span className="text-[#66A3BF]">AI</span>
          </span>
          <span className="hidden sm:block text-[10px] text-[#667085] font-medium tracking-wide">
            Enterprise Internship Management
          </span>
        </div>
      </div>

      {user && (
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
          {/* AI Copilot Action */}
          {onOpenCopilot && (
            <button
              onClick={onOpenCopilot}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#E9F3FD] text-[#4874A0] border border-[#66A3BF]/30 hover:bg-[#66A3BF] hover:text-white transition-colors font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>
          )}

          {/* Centralized Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-[#667085] hover:text-[#243447] hover:bg-[#E9F3FD] border border-transparent hover:border-[#D8E2E6] transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#66A3BF] ring-2 ring-white" />
              )}
            </button>

            {/* Notifications Dropdown Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white border border-[#D8E2E6] shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-[#D8E2E6] flex items-center justify-between bg-[#E9F3FD]/40">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-[#66A3BF]" />
                    <span className="font-bold text-[#243447] text-xs">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#66A3BF]/20 text-[#4874A0] font-semibold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}

                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                    >
                      <CheckCheck className="w-3 h-3" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-3.5 transition-colors ${
                          n.isRead ? 'bg-transparent text-slate-400' : 'bg-cyan-500/5 text-slate-200 font-medium'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-white">{n.title}</p>
                            <p className="text-[11px] text-slate-400 leading-relaxed">{n.message}</p>
                            <span className="text-[10px] text-slate-500 block pt-1">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {!n.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(n.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 shrink-0"
                              title="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Role Badge */}
          <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${getRoleBadge(user.role)}`}>
            {user.role}
          </span>

          {/* User Email */}
          <span className="hidden md:block text-slate-300 font-medium">{user.email}</span>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
};
