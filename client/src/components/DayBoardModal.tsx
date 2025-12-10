import React from 'react';
import { Task } from '../types';
import { BoardView } from './BoardView';
import { CloseIcon, CalendarIcon } from './Icons';


interface DayBoardModalProps {
    date: string;
    tasks: Task[];
    isOpen: boolean;
    onClose: () => void;
    onTaskClick: (task: Task) => void;
}

export const DayBoardModal: React.FC<DayBoardModalProps> = ({ date, tasks, isOpen, onClose, onTaskClick }) => {
    if (!isOpen) return null;

    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-dark/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-emerald-deep border border-gold/30 shadow-glow-gold w-full max-w-5xl h-[80vh] flex flex-col relative overflow-hidden">
                {/* Decorative sheen */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="flex justify-between items-center p-6 border-b border-gold-muted/10 bg-emerald-deep relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-2 border border-gold/30 rounded-full text-gold bg-emerald-light/30">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif text-ivory tracking-tight">Royal Agenda</h2>
                            <p className="text-[10px] text-gold-muted uppercase tracking-[0.2em] font-bold">{formattedDate}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gold-muted hover:text-gold transition-colors hover:bg-emerald-light/20 rounded-full">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-grow p-6 overflow-hidden relative z-10 bg-emerald-deep/50">
                    {tasks.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gold-muted/50">
                            <p className="font-serif text-xl italic text-ivory/60 mb-2">A blank canvas for the day.</p>
                            <p className="text-[10px] uppercase tracking-widest">Use the (+) button to inscribe a task.</p>
                        </div>
                    ) : (
                        <BoardView tasks={tasks} onTaskClick={onTaskClick} />
                    )}
                </div>
            </div>
        </div>
    );
};
