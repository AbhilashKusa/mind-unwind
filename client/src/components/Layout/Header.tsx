import React from 'react';
import { useStore } from '../../store/useStore';
import { BrainIcon, CloudCheckIcon } from '../Icons';

export const Header: React.FC = () => {
    const { user, tasks, logout } = useStore();

    const completedCount = tasks.filter(t => t.isCompleted).length;
    const totalCount = tasks.length;
    const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    if (!user) return null;

    return (
        <header className="bg-surface border-b-2 border-border sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-brand p-2.5 border-2 border-brand">
                        <BrainIcon className="w-6 h-6 text-brand-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-brand hidden sm:block">
                        MindUnwind
                    </h1>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                        <CloudCheckIcon className="w-4 h-4" />
                        <span>DB Connected</span>
                    </div>
                    <div className="text-xs font-bold border-2 border-border px-3 py-1 bg-surface-muted hidden sm:block shadow-sharp-sm uppercase tracking-wider text-brand">
                        {totalCount > 0 ? `${completedCount}/${totalCount} DONE` : 'READY'}
                    </div>
                    <button onClick={() => useStore.getState().setProfileOpen(true)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                        <div className="bg-brand p-1.5 rounded-full">
                            <span className="w-4 h-4 text-brand-foreground text-xs flex items-center justify-center font-bold">
                                {user.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wide hidden sm:inline-block text-brand">{user.name}</span>
                    </button>
                </div>
            </div>
            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-surface-muted border-b border-border">
                <div
                    className="h-full bg-brand transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </header>
    );
};
