import React from 'react';
import { Task } from '../../types';
import { DashboardStats } from './DashboardStats';
import { Rocket, TrendingUp, Target, Flame, AlertCircle } from 'lucide-react';

interface StartupDashboardProps {
    tasks: Task[];
}

export const StartupDashboard: React.FC<StartupDashboardProps> = ({ tasks }) => {
    const startupTasks = tasks.filter(t => t.workspace === 'startup');
    const closed = startupTasks.filter(t => t.isCompleted).length;
    const open = startupTasks.filter(t => !t.isCompleted).length;

    // "Burn Down" logic (simple representation)
    const velocity = closed;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between border-b border-gold/10 pb-4">
                <h2 className="text-xl font-serif text-gold flex items-center gap-2">
                    <Rocket className="w-5 h-5" /> Mission Control
                </h2>
                <span className="text-xs font-bold text-crimson bg-crimson/10 px-2 py-1 rounded border border-crimson/20">
                    High Growth
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <DashboardStats
                    title="Velocity"
                    value={velocity}
                    icon={Flame}
                    subtitle="Tasks Closed"
                    trend="+2 this week"
                    trendUp={true}
                />
                <DashboardStats
                    title="Backlog"
                    value={open}
                    icon={Target}
                />
            </div>

            {/* Growth Graph Placeholder */}
            <div className="p-6 bg-emerald-deep/60 border border-gold/20 rounded-sm relative flex flex-col items-center justify-center min-h-[140px]">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDIxNSwwLDAuMSkiLz48L3N2Zz4=')] opacity-20"></div>

                <TrendingUp className="w-8 h-8 text-gold/50 mb-2" />
                <p className="text-xs font-bold text-gold uppercase tracking-widest">Growth Trajectory</p>
                <div className="w-full h-1 bg-gray-700 mt-4 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-crimson via-gold to-emerald-400 w-3/4"></div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">75% to Quarterly Goal</p>
            </div>
        </div>
    );
};
