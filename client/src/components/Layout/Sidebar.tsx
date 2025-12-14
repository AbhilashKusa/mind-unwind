import React, { useState } from 'react';
import { List, Kanban, Calendar, Sparkles, User, Palette } from 'lucide-react';
import { ThemeType } from '../../types';

type ViewMode = 'list' | 'board' | 'calendar' | 'concierge';

interface SidebarProps {
    currentView: ViewMode;
    currentTheme: ThemeType;
    onChangeView: (view: ViewMode) => void;
    onChangeTheme: (theme: ThemeType) => void;
    onProfileClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, currentTheme, onChangeView, onChangeTheme, onProfileClick }) => {
    const [showThemes, setShowThemes] = useState(false);

    const navItems = [
        { id: 'list', label: 'Tasks', icon: List },
        { id: 'board', label: 'Board', icon: Kanban },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'concierge', label: 'Concierge', icon: Sparkles },
    ];

    const themes: { id: ThemeType, color: string, label: string }[] = [
        { id: 'onyx', color: '#000000', label: 'Onyx' }, // True Black (Default)
        { id: 'minimal', color: '#f4f4f5', label: 'Minimal' }, // White
    ];

    return (
        <aside className="fixed bottom-0 left-0 w-full bg-emerald-deep/95 backdrop-blur-xl border-t border-gold/20 z-50 
                          lg:static lg:h-screen lg:w-20 lg:border-t-0 lg:border-r lg:flex lg:flex-col lg:items-center lg:py-8 lg:bg-emerald-deep/80 text-ivory">

            {/* Logo Area (Desktop) */}
            <div className="hidden lg:flex mb-12">
                <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold flex items-center justify-center">
                    <span className="font-serif text-gold font-bold text-xl">M</span>
                </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex justify-around items-center w-full h-16 lg:h-auto lg:flex-col lg:gap-8 lg:w-auto">
                {navItems.map((item) => {
                    const isActive = currentView === item.id;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onChangeView(item.id as ViewMode)}
                            className={`relative group p-2 rounded-xl transition-all duration-300 flex flex-col items-center gap-1
                                ${isActive ? 'text-gold' : 'text-gold-muted hover:text-ivory'}
                            `}
                            title={item.label}
                        >
                            <div className={`absolute inset-0 bg-gold/10 rounded-xl transition-all duration-300 ${isActive ? 'scale-100 opacity-100' : 'scale-75 opacity-0 group-hover:opacity-50'}`} />

                            <Icon className={`w-6 h-6 relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="sr-only">{item.label}</span>
                            {isActive && <div className="absolute -bottom-1 w-1 h-1 bg-gold rounded-full lg:left-0 lg:top-1/2 lg:-translate-x-3 lg:bottom-auto" />}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Actions (Desktop) */}
            <div className="hidden lg:flex flex-col gap-6 mt-auto">
                {/* Theme Toggle */}
                <div className="relative">
                    <button
                        onClick={() => setShowThemes(!showThemes)}
                        className={`p-2 transition-colors rounded-full hover:bg-white/5 ${showThemes ? 'text-gold' : 'text-gold-muted'}`}
                        title="Change Theme"
                    >
                        <Palette className="w-6 h-6" />
                    </button>

                    {/* Theme Popover */}
                    {showThemes && (
                        <div className="absolute left-full bottom-0 ml-4 bg-emerald-deep border border-gold/30 p-2 rounded-xl shadow-glow-gold flex flex-col gap-2 min-w-[120px] animate-in fade-in zoom-in-95 duration-200">
                            {themes.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => { onChangeTheme(t.id); setShowThemes(false); }}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors
                                        ${currentTheme === t.id ? 'bg-gold/20 text-gold' : 'hover:bg-white/5 text-ivory-dim'}
                                    `}
                                >
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={onProfileClick}
                    className="p-2 text-gold-muted hover:text-gold transition-colors rounded-full hover:bg-white/5"
                    title="Profile"
                >
                    <User className="w-6 h-6" />
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
