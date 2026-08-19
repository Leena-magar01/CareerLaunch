import React, { useState } from 'react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { CompanyDashboard } from '../CompanyDashboard';

export const CompanyShell: React.FC = () => {
  const [activeItem, setActiveItem] = useState('vacancies');

  return (
    <DashboardLayout
      activeItem={activeItem}
      onSelectItem={setActiveItem}
      pageTitle="Corporate Recruiter Workspace"
      pageSubtitle="Post internship vacancies, review AI-matched candidates, issue offers, and manage PPOs."
    >
      <CompanyDashboard />
    </DashboardLayout>
  );
};
