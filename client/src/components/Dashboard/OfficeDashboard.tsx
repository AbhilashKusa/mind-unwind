import React from 'react';
import { Task } from '../../types';
import { DashboardStats } from './DashboardStats';
import { Briefcase, AlertCircle, Calendar, CheckSquare } from 'lucide-react';

interface OfficeDashboardProps {
    tasks: Task[];
}

export const OfficeDashboard: React.FC<OfficeDashboardProps> = ({ tasks }) => {
    const officeTasks = tasks.filter(t => t.workspace === 'office');
    const urgentCount = officeTasks.filter(t => !t.isCompleted && t.priority === 'High').length;
    const dueTodayCount = officeTasks.filter(t => !t.isCompleted && t.dueDate === new Date().toISOString().split('T')[0]).length;

    // Recent Agenda
    const agenda = officeTasks
        .filter(t => !t.isCompleted)
        .sort((a, b) => (a.dueDate || '9999') > (b.dueDate || '9999') ? 1 : -1)
        .slice(0, 3);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between border-b border-gold/10 pb-4">
                <h2 className="text-xl font-serif text-gold flex items-center gap-2">
                    <Briefcase className="w-5 h-5" /> Executive Summary
                </h2>
                <span className="text-xs font-bold text-calm bg-calm/10 px-2 py-1 rounded border border-calm/20">
                    Productivity
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <DashboardStats
                    title="Urgent Box"
                    value={urgentCount}
                    icon={AlertCircle}
                    trend={urgentCount > 2 ? 'High Load' : 'Stable'}
                    trendUp={urgentCount < 3}
                />
                <DashboardStats
                    title="Due Today"
                    value={dueTodayCount}
                    icon={Calendar}
                />
            </div>

            {/* Agenda List */}
            <div className="p-5 bg-emerald-deep/40 border border-gold/20 rounded-sm">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gold-muted mb-4 flex items-center gap-2">
                    <CheckSquare className="w-3 h-3" /> Agenda
                </h3>
                <div className="space-y-3">
                    {agenda.length > 0 ? agenda.map(task => (
                        <div key={task.id} className="flex items-start justify-between group border-b border-white/5 pb-2 last:border-0 last:pb-0">
                            <div>
                                <p className="text-sm font-serif text-ivory group-hover:text-gold transition-colors truncate max-w-[200px]">{task.title}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{task.priority}</p>
                            </div>
                            <span className="text-[10px] text-gray-600 font-mono">
                                {task.dueDate ? new Date(task.dueDate).getDate() : '-'}
                            </span>
                        </div>
                    )) : (
                        <p className="text-sm text-gray-500 italic">Inbox zero. Excellent work.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
