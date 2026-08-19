import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Building2, ShieldCheck, UserCheck, LogOut, Bell, Sparkles } from 'lucide-react';

interface HeaderProps {
  onOpenCopilot?: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCopilot, onToggleMobileSidebar }) => {
  const { user, logout } = useAuth();

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'STUDENT': return <span className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30">Student Portal</span>;
      case 'COMPANY': return <span className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30">Recruiter Portal</span>;
      case 'TNP': return <span className="bg-amber-500/10 text-amber-400 border-amber-500/30">T&P Admin Portal</span>;
      case 'MENTOR': return <span className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Mentor Portal</span>;
      default: return null;
    }
  };

  return (
    <header className="glass-nav px-6 py-3 flex items-center justify-between border-b border-slate-800">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-base font-extrabold bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
            GHR Placement Portal
          </span>
          <span className="block text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
            Institutional Internship Management
          </span>
        </div>
      </div>

      {user && (
        <div className="flex items-center space-x-3 text-xs">
          {/* AI Copilot Action */}
          {onOpenCopilot && (
            <button
              onClick={onOpenCopilot}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Copilot</span>
            </button>
          )}

          {/* User Role Badge */}
          <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${getRoleBadge(user.role)?.props.className}`}>
            {user.role}
          </span>

          {/* User Email */}
          <span className="hidden sm:block text-slate-300 font-medium">{user.email}</span>

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
