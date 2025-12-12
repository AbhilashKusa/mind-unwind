import React from 'react';
import { useStore } from '../../store/useStore';
import { Brain, Cloud } from 'lucide-react';

export const Header: React.FC = () => {
    const { user, tasks, logout } = useStore();

    const completedCount = tasks.filter(t => t.isCompleted).length;
    const totalCount = tasks.length;
    const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    if (!user) return null;

    return (
        <header className="bg-emerald-deep/90 backdrop-blur-md border-b border-gold-muted/20 sticky top-0 z-50 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                <div className="flex items-center gap-4 group cursor-default">
                    <div className="bg-gold/10 p-2 rounded-full border border-gold/30 group-hover:border-gold/60 transition-colors">
                        <Brain className="w-6 h-6 text-gold" />
                    </div>
                    <h1 className="text-2xl font-serif font-medium tracking-tight text-gold hidden sm:block">
                        MindUnwind
                    </h1>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500/80">
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Connected</span>
                    </div>
                    <div className="text-[10px] font-bold border border-gold-muted/30 px-4 py-1.5 bg-emerald-light/30 hidden sm:block rounded-full uppercase tracking-widest text-gold-muted shadow-sm backdrop-blur-sm">
                        {totalCount > 0 ? `${completedCount}/${totalCount} Completed` : 'Ready'}
                    </div>
                    <button
                        onClick={() => useStore.getState().setProfileOpen(true)}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
                    >
                        <div className="bg-gradient-to-br from-gold-muted to-gold p-[1px] rounded-full">
                            <div className="bg-emerald-deep rounded-full p-1">
                                <span className="w-6 h-6 text-gold text-xs flex items-center justify-center font-serif italic">
                                    {user.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline-block text-ivory group-hover:text-gold transition-colors">{user.name}</span>
                    </button>
                </div>
            </div>
            {/* Elegant Progress Line */}
            <div className="h-[1px] w-full bg-white/5 relative overflow-hidden">
                <div
                    className="h-full bg-gold shadow-[0_0_10px_#d4af37] transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </header>
    );
};
