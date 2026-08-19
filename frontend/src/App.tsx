import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PublicVerifyPage } from './pages/PublicVerifyPage';

import { StudentShell } from './pages/shells/StudentShell';
import { CompanyShell } from './pages/shells/CompanyShell';
import { TNPShell } from './pages/shells/TNPShell';
import { MentorShell } from './pages/shells/MentorShell';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState<'home' | 'login' | 'register' | 'verify'>('home');
  const [initialRole, setInitialRole] = useState('STUDENT');
  const [verifyCode, setVerifyCode] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Initializing GHR Placement Portal...
      </div>
    );
  }

  // Render role dashboard shell when user is authenticated
  if (user) {
    if (user.role === 'STUDENT') return <StudentShell />;
    if (user.role === 'COMPANY') return <CompanyShell />;
    if (user.role === 'TNP' || user.role === 'ADMIN') return <TNPShell />;
    if (user.role === 'MENTOR') return <MentorShell />;
  }

  // Unauthenticated routing
  if (route === 'login') {
    return <LoginPage initialRole={initialRole} onNavigateRegister={() => setRoute('register')} onNavigateHome={() => setRoute('home')} />;
  }

  if (route === 'register') {
    return <RegisterPage onNavigateLogin={() => setRoute('login')} onNavigateHome={() => setRoute('home')} />;
  }

  if (route === 'verify') {
    return <PublicVerifyPage code={verifyCode} onNavigateHome={() => setRoute('home')} />;
  }

  return (
    <LandingPage
      onNavigateLogin={(role) => {
        if (role) setInitialRole(role);
        setRoute('login');
      }}
      onNavigateVerify={(code) => {
        setVerifyCode(code);
        setRoute('verify');
      }}
    />
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
