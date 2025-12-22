import React from 'react';
import Sidebar from './Sidebar';
import { ThemeType } from '../../types';
import { useStore } from '../../store/useStore'; // Assuming we can access store or pass props. 
// Ideally Layout handles structure. Props are cleaner.

interface MainLayoutProps {
    children: React.ReactNode;
    viewMode: any; // We'll type this properly
    setViewMode: (v: any) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, viewMode, setViewMode }) => {
    const { theme, setTheme, setProfileOpen } = useStore();

    return (
        <div className="min-h-screen text-ivory font-sans selection:bg-gold selection:text-emerald-deep overflow-hidden flex flex-col lg:flex-row transition-colors duration-500">
            {/* Ambient background */}
            <div className="ambient-glow fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

            <Sidebar
                currentView={viewMode}
                currentTheme={theme as ThemeType}
                onChangeView={setViewMode}
                onChangeTheme={(t) => setTheme(t)}
                onProfileClick={() => setProfileOpen(true)}
            />

            <main className="flex-1 h-screen overflow-y-auto relative scrollbar-thin">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 main-content">
                    {children}
                </div>
            </main>
        </div>
    );
};
