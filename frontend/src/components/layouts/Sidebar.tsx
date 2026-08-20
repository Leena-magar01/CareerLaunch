import React from 'react';
import {
  GraduationCap, Building2, ShieldCheck, UserCheck, Search,
  FileText, Award, BarChart3, Settings, HelpCircle, Bot, Sparkles, CheckCircle2
} from 'lucide-react';

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
}

export const Sidebar: React.FC<SidebarProps> = ({ role, activeItem, onSelect, isOpenMobile }) => {
  const getNavItems = (): NavItem[] => {
    let items: NavItem[] = [];
    switch (role) {
      case 'STUDENT':
        items = [
          { id: 'marketplace', label: 'Internship Discovery', icon: <Search className="w-4 h-4" /> },
          { id: 'applications', label: 'My Applications', icon: <FileText className="w-4 h-4" /> },
          { id: 'progress', label: 'Weekly Progress Logs', icon: <CheckCircle2 className="w-4 h-4" /> },
          { id: 'profile', label: 'Profile & Academic Details', icon: <GraduationCap className="w-4 h-4" /> },
          { id: 'skillgap', label: 'AI Skill-Gap Analyzer', icon: <Sparkles className="w-4 h-4" /> },
          { id: 'resume', label: 'AI Resume Analyzer', icon: <Bot className="w-4 h-4" /> },
        ];
        break;
      case 'COMPANY':
        items = [
          { id: 'vacancies', label: 'Vacancy Listings', icon: <Building2 className="w-4 h-4" /> },
          { id: 'applicants', label: 'AI Candidate Ranker', icon: <Sparkles className="w-4 h-4" /> },
          { id: 'evaluations', label: 'Intern Performance Rubric', icon: <Award className="w-4 h-4" /> },
          { id: 'ppo', label: 'PPO Offer Management', icon: <FileText className="w-4 h-4" /> },
        ];
        break;
      case 'TNP':
      case 'ADMIN':
        items = [
          { id: 'verifications', label: 'Verification Queues', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'mentors', label: 'Faculty Mentor Assignments', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'analytics', label: 'Institutional Analytics', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'ppo', label: 'PPO Conversion Registry', icon: <Award className="w-4 h-4" /> },
        ];
        break;
      case 'MENTOR':
        items = [
          { id: 'students', label: 'Assigned Mentees', icon: <UserCheck className="w-4 h-4" /> },
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

  return (
    <aside className={`w-64 bg-white border-r border-[#D8E2E6] flex flex-col justify-between py-6 px-4 shrink-0 ${
      isOpenMobile ? 'block fixed inset-y-0 left-0 z-40' : 'hidden md:flex'
    }`}>
      <div className="space-y-6">
        <div className="px-3">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#667085] block">
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
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg font-medium transition-all ${
                  isActive
                    ? 'bg-[#E9F3FD] text-[#4874A0] border border-[#66A3BF]/30 font-semibold'
                    : 'text-[#667085] hover:text-[#243447] hover:bg-[#E9F3FD]/50 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#E9F3FD] text-[#4874A0]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-3 pt-4 border-t border-[#D8E2E6] text-[11px] text-[#667085]">
        InternSync Governance Engine v1.0
      </div>
    </aside>
  );
};

