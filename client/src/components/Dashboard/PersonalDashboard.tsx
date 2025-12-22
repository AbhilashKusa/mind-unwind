import React from 'react';
import { Task } from '../../types';
import { DashboardStats } from './DashboardStats';
import { Brain, Heart, Activity, CheckCircle2 } from 'lucide-react';

interface PersonalDashboardProps {
    tasks: Task[];
}

export const PersonalDashboard: React.FC<PersonalDashboardProps> = ({ tasks }) => {
    const personalTasks = tasks.filter(t => (t.workspace || 'personal') === 'personal');
    const completed = personalTasks.filter(t => t.isCompleted).length;
    const total = personalTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Find next urgent task
    const nextTask = personalTasks
        .filter(t => !t.isCompleted)
        .sort((a, b) => b.createdAt - a.createdAt) // Newest first for now, could be priority
        .sort((a, b) => (a.priority === 'High' ? -1 : 1))[0];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between border-b border-gold/10 pb-4">
                <h2 className="text-xl font-serif text-gold flex items-center gap-2">
                    <Heart className="w-5 h-5" /> Sanctuary Status
                </h2>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-deep/50 px-2 py-1 rounded border border-emerald-400/20">
                    Wellness Focus
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <DashboardStats
                    title="Mind Clarity"
                    value={`${completionRate}%`}
                    icon={Brain}
                    subtitle="Completion Rate"
                />
                <DashboardStats
                    title="Rituals Done"
                    value={completed}
                    icon={CheckCircle2}
                    trend={total > 0 ? `${total - completed} remaining` : 'No rituals'}
                    trendUp={true}
                />
            </div>

            {/* Next Action Card */}
            <div className="p-6 bg-emerald-light/10 border border-gold/30 rounded-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gold/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gold-muted mb-3 flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Next Ritual
                </h3>

                {nextTask ? (
                    <div>
                        <p className="text-lg font-serif text-ivory mb-1">{nextTask.title}</p>
                        <div className="flex gap-2 mt-2">
                            <span className={`text-[10px] px-1.5 py-0.5 border rounded uppercase tracking-wider ${nextTask.priority === 'High' ? 'border-crimson text-crimson' :
                                nextTask.priority === 'Medium' ? 'border-gold text-gold' :
                                    'border-emerald-400 text-emerald-400'
                                }`}>
                                {nextTask.priority}
                            </span>
                            {nextTask.dueDate && (
                                <span className="text-[10px] text-gray-400 py-0.5">Due {new Date(nextTask.dueDate).toLocaleDateString()}</span>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 italic">No pending rituals. Enjoy the tranquility.</p>
                )}
            </div>
        </div>
    );
};
