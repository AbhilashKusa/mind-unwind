import React from 'react';
import { CommandCenter } from '../Dashboard/CommandCenter';

export const ConciergeView: React.FC = () => {
    return (
        <div className="relative max-w-4xl mx-auto pt-10 min-h-[70vh] flex flex-col items-center">
            {/* Ambient Background Spotlight specialized for this view */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse duration-[5000ms]"></div>

            <div className="w-full space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center space-y-3 mb-4">
                    <p className="font-serif text-4xl text-ivory/90 tracking-tight drop-shadow-lg">
                        Command Center
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-gold/40"></div>
                        <p className="text-[10px] uppercase tracking-[0.4em] text-gold/70 font-semibold">
                            AI Executive Assistant
                        </p>
                        <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-gold/40"></div>
                    </div>
                </div>

                {/* The CommandCenter itself is the main actor here */}
                <CommandCenter />
            </div>
        </div>
    );
};
