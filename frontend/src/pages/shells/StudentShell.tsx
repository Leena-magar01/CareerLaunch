import React, { useState } from 'react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { StudentDashboard } from '../StudentDashboard';

export const StudentShell: React.FC = () => {
  const [activeItem, setActiveItem] = useState('marketplace');

  return (
    <DashboardLayout
      activeItem={activeItem}
      onSelectItem={setActiveItem}
      pageTitle="Student Placement Workspace"
      pageSubtitle="Discover opportunities, evaluate eligibility, track applications, and submit progress reports."
    >
      <StudentDashboard activeTab={activeItem} onTabChange={setActiveItem} />
    </DashboardLayout>
  );
};

