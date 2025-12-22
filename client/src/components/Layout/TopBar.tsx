import React from 'react';
import { Sparkles } from 'lucide-react';

interface TopBarProps {
    title: string;
    date: string;
    onSpotlightTrigger: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ title, date, onSpotlightTrigger }) => {
    return (
        <div className="flex justify-between items-end mb-8 border-b border-gold/10 pb-6">
            <div>
                <h1 className="text-3xl font-serif text-ivory tracking-tight">
                    {title}
                </h1>
                <p className="text-xs text-gold-muted uppercase tracking-widest mt-1">
                    {date}
                </p>
            </div>

            {/* AI Action Button - Visible trigger for Spotlight */}
            <button
                onClick={onSpotlightTrigger}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-light/10 border border-gold/20 rounded-full text-gold-muted hover:text-gold hover:border-gold/50 transition-all text-xs uppercase tracking-wider group"
                title="Open Command Spotlight (Ctrl+K)"
            >
                <Sparkles className="w-3 h-3 group-hover:animate-pulse" />
                <span>Ask AI</span>
                <kbd className="hidden lg:inline-block ml-2 px-1.5 py-0.5 bg-black/20 rounded text-[9px] font-mono text-gray-500">⌘K</kbd>
            </button>
        </div>
    );
};
