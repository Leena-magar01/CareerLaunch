import {
  GraduationCap, Building2, ShieldCheck, UserCheck, Search,
  FileText, Award, BarChart3, Settings, HelpCircle, Bot, Sparkles, CheckCircle2, LogOut, Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  role: 'STUDENT' | 'COMPANY' | 'TNP' | 'MENTOR' | 'ADMIN';
  activeItem: string;
  onSelect: (id: string) => void;
  isOpenMobile?: boolean;
  user?: any;
}

const roleLabel: Record<string, string> = {
  STUDENT: 'Student',
  COMPANY: 'Recruiter',
  TNP: 'T&P Admin',
  MENTOR: 'Mentor',
  ADMIN: 'Administrator',
};

export const Sidebar: React.FC<SidebarProps> = ({ role, activeItem, onSelect, isOpenMobile, user }) => {
  const { logout } = useAuth();

  const getNavItems = (): NavItem[] => {
    let items: NavItem[] = [];
    switch (role) {
      case 'STUDENT':
        items = [
          { id: 'marketplace', label: 'Internship Discovery', icon: <Search className="w-4 h-4" /> },
          { id: 'attendance', label: 'Attendance Tracker', icon: <Clock className="w-4 h-4 text-cyan-500" /> },
          { id: 'applications', label: 'My Applications', icon: <FileText className="w-4 h-4" /> },
          { id: 'progress', label: 'Weekly Progress Logs', icon: <CheckCircle2 className="w-4 h-4" /> },
          { id: 'certificates', label: 'Internship Certificates', icon: <Award className="w-4 h-4" /> },
          { id: 'profile', label: 'Profile & Academic Details', icon: <GraduationCap className="w-4 h-4" /> },
          { id: 'skillgap', label: 'AI Skill-Gap Analyzer', icon: <Sparkles className="w-4 h-4" /> },
          { id: 'resume', label: 'AI Resume Analyzer', icon: <Bot className="w-4 h-4" /> },
        ];
        break;
      case 'COMPANY':
        items = [
          { id: 'vacancies', label: 'Vacancy Listings', icon: <Building2 className="w-4 h-4" /> },
          { id: 'applicants', label: 'AI Candidate Ranker', icon: <Sparkles className="w-4 h-4" /> },
          { id: 'attendance', label: 'Intern Attendance Tracker', icon: <Clock className="w-4 h-4 text-cyan-500" /> },
          { id: 'evaluations', label: 'Intern Performance Rubric', icon: <Award className="w-4 h-4" /> },
          { id: 'ppo', label: 'PPO Offer Management', icon: <FileText className="w-4 h-4" /> },
        ];
        break;
      case 'TNP':
      case 'ADMIN':
        items = [
          { id: 'verifications', label: 'Verification Queues', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'mentors', label: 'Faculty Mentor Assignments', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'attendance', label: 'Attendance Compliance (75%)', icon: <Clock className="w-4 h-4 text-amber-500" /> },
          { id: 'analytics', label: 'Institutional Analytics', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'ppo', label: 'PPO Conversion Registry', icon: <Award className="w-4 h-4" /> },
        ];
        break;
      case 'MENTOR':
        items = [
          { id: 'students', label: 'Assigned Mentees', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'attendance', label: 'Mentee Attendance Review', icon: <Clock className="w-4 h-4 text-cyan-500" /> },
          { id: 'reports', label: 'Weekly Log Review Queue', icon: <FileText className="w-4 h-4" /> },
          { id: 'evaluations', label: 'Final Mentor Rubrics', icon: <Award className="w-4 h-4" /> },
        ];
        break;
      default:
        items = [];
    }
    return items;
  };

  const navItems = getNavItems();

  // Generate initials from email or name
  const displayEmail = user?.email || '';
  const initials = displayEmail
    ? displayEmail.slice(0, 2).toUpperCase()
    : role?.slice(0, 2).toUpperCase();

  return (
    <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col justify-between py-6 px-4 shrink-0 text-slate-900 ${
      isOpenMobile ? 'block fixed inset-y-0 left-0 z-40' : 'hidden md:flex'
    }`}>
      <div className="space-y-6">
        <div className="px-3">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
            Navigation Menu &bull; {role}
          </span>
        </div>

        <nav className="space-y-1 text-xs">
          {navItems.map((item) => {
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-100 text-[#4874A0] border border-slate-300 shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom: Profile Card + Logout ── */}
      <div className="space-y-3">
        {/* Profile card */}
        <div className="flex items-center gap-3 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl">
          {/* Avatar circle */}
          <div className="w-9 h-9 rounded-full bg-[#4874A0] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
            {initials}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-900 leading-tight truncate">
              {roleLabel[role] || role}
            </p>
            <p className="text-[10px] text-slate-500 truncate">{displayEmail}</p>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

        <div className="px-1 text-[10px] text-slate-400">
          CareerLaunch Platform v1.0
        </div>
      </div>
    </aside>
  );
};
