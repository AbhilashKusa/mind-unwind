import React from 'react';
import { Task } from '../types';
import { BoardView } from './BoardView';
import { CloseIcon, CalendarIcon } from './Icons';
import { EmptyState } from './EmptyState';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border-2 border-black shadow-sharp w-full max-w-5xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b-2 border-black bg-gray-50">
                    <div className="flex items-center gap-3">
                        <CalendarIcon className="w-6 h-6" />
                        <div>
                            <h2 className="text-xl font-bold uppercase tracking-wide">Day Plan</h2>
                            <p className="text-sm text-gray-500 font-bold">{formattedDate}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black hover:text-white transition-colors border-2 border-transparent hover:border-black">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-grow p-6 overflow-hidden">
                    {tasks.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <p className="font-bold uppercase tracking-widest">No tasks for this day</p>
                            <p className="text-sm mt-2">Use the (+) button to add one</p>
                        </div>
                    ) : (
                        <BoardView tasks={tasks} onTaskClick={onTaskClick} />
                    )}
                </div>
            </div>
        </div>
    );
};
