import React from 'react';
import { Task } from '../../types';
import { PersonalDashboard } from '../Dashboard/PersonalDashboard';
import { OfficeDashboard } from '../Dashboard/OfficeDashboard';
import { StartupDashboard } from '../Dashboard/StartupDashboard';

interface DashboardViewProps {
    currentWorkspace: string;
    tasks: Task[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({ currentWorkspace, tasks }) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {currentWorkspace === 'personal' && <PersonalDashboard tasks={tasks} />}
            {currentWorkspace === 'office' && <OfficeDashboard tasks={tasks} />}
            {currentWorkspace === 'startup' && <StartupDashboard tasks={tasks} />}
        </div>
    );
};
