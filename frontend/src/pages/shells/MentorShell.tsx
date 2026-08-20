import React, { useState } from 'react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { MentorDashboard } from '../MentorDashboard';

export const MentorShell: React.FC = () => {
  const [activeItem, setActiveItem] = useState('students');

  return (
    <DashboardLayout
      activeItem={activeItem}
      onSelectItem={setActiveItem}
      pageTitle="Faculty Mentor Workspace"
      pageSubtitle="Guide assigned students, review weekly progress reports, flag progress concerns, and complete academic rubrics."
    >
      <MentorDashboard activeTab={activeItem} onTabChange={setActiveItem} />
    </DashboardLayout>
  );
};

