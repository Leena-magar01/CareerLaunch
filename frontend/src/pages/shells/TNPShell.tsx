import React, { useState } from 'react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { TNPAdminDashboard } from '../TNPAdminDashboard';

export const TNPShell: React.FC = () => {
  const [activeItem, setActiveItem] = useState('verifications');

  return (
    <DashboardLayout
      activeItem={activeItem}
      onSelectItem={setActiveItem}
      pageTitle="T&P Administration & Governance"
      pageSubtitle="Verify student profiles & offer letters, assign faculty mentors, and track university placement metrics."
    >
      <TNPAdminDashboard activeTab={activeItem} onTabChange={setActiveItem} />
    </DashboardLayout>
  );
};

