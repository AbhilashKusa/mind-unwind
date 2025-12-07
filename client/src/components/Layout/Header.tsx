import React from 'react';
import { useStore } from '../../store/useStore';
import { BrainIcon, CloudCheckIcon, UserIcon } from '../Icons';

export const Header: React.FC = () => {
    const { user, tasks, logout } = useStore();

    const completedCount = tasks.filter(t => t.isCompleted).length;
    const totalCount = tasks.length;
    const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    if (!user) return null;

    return (
        <header className="bg-white border-b-2 border-black sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-black p-2.5 border-2 border-black">
                        <BrainIcon className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-black hidden sm:block">
                        MindUnwind
                    </h1>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                        <CloudCheckIcon className="w-4 h-4" />
                        <span>DB Connected</span>
                    </div>
                    <div className="text-xs font-bold border-2 border-black px-3 py-1 bg-gray-50 hidden sm:block shadow-sharp-sm uppercase tracking-wider">
                        {totalCount > 0 ? `${completedCount}/${totalCount} DONE` : 'READY'}
                    </div>
                    <button onClick={logout} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                        <div className="bg-black p-1.5 rounded-full">
                            <UserIcon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wide hidden sm:inline-block">{user.name}</span>
                    </button>
                </div>
            </div>
            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-gray-100 border-b border-black">
                <div
                    className="h-full bg-black transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </header>
    );
};
