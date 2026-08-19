import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Building2, ShieldCheck, UserCheck, LogOut, Bell, Bot } from 'lucide-react';

interface NavbarProps {
  onOpenCopilot?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCopilot }) => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'STUDENT': return <GraduationCap className="w-4 h-4 text-cyan-400" />;
      case 'COMPANY': return <Building2 className="w-4 h-4 text-indigo-400" />;
      case 'TNP': return <ShieldCheck className="w-4 h-4 text-amber-400" />;
      case 'MENTOR': return <UserCheck className="w-4 h-4 text-emerald-400" />;
      default: return null;
    }
  };

  return (
    <nav className="glass-nav px-6 py-3.5 flex items-center justify-between border-b border-slate-800">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <div>
          <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
            InternAI Platform
          </span>
          <span className="block text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
            Institutional Internship Lifecycle
          </span>
        </div>
      </div>

      {user && (
        <div className="flex items-center space-x-4">
          {/* AI Copilot Trigger */}
          {onOpenCopilot && (
            <button
              onClick={onOpenCopilot}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all text-xs font-semibold"
            >
              <Bot className="w-4 h-4" />
              <span>AI Copilot</span>
            </button>
          )}

          {/* User Role Badge */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs">
            {getRoleIcon(user.role)}
            <span className="font-semibold text-slate-200">{user.role}</span>
          </div>

          {/* User Email */}
          <div className="hidden md:block text-right">
            <div className="text-xs font-medium text-slate-200">{user.email}</div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </nav>
  );
};
