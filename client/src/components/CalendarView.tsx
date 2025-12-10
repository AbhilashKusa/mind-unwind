import React, { useState } from 'react';
import { Task, Priority } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from './Icons';

interface CalendarViewProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onDateSelect: (date: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onTaskClick, onDateSelect }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const days = [];
    // Empty slots for days before the 1st
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    // Fill remaining cells to complete the grid (optional, but looks better)
    const totalCells = Math.ceil(days.length / 7) * 7;
    while (days.length < totalCells) {
        days.push(null);
    }

    const getTasksForDay = (day: number | null) => {
        if (!day) return [];
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return tasks.filter(t => t.dueDate === dateStr);
    };

    const isToday = (day: number | null) => {
        if (!day) return false;
        const today = new Date();
        return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    const handleDateClick = (day: number | null) => {
        if (!day) return;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onDateSelect(dateStr);
    };

    return (
        <div className="bg-emerald-deep border border-gold/30 animate-in fade-in duration-300 flex flex-col h-[600px] lg:h-[calc(100vh-160px)] shadow-glow-sm">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gold-muted/20 bg-emerald-deep flex-shrink-0">
                <h2 className="text-xl font-serif font-bold text-ivory flex items-center gap-3">
                    <span className="text-3xl text-gold">{monthNames[month]}</span>
                    <span className="text-gold-muted/50 font-normal">{year}</span>
                </h2>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 border border-gold-muted/30 text-gold-muted hover:text-gold hover:border-gold transition-colors rounded-sm">
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <button onClick={nextMonth} className="p-2 border border-gold-muted/30 text-gold-muted hover:text-gold hover:border-gold transition-colors rounded-sm">
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-gold-muted/20 flex-shrink-0 bg-emerald-light/10">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-3 text-center text-[10px] font-bold text-gold-muted uppercase tracking-[0.2em] border-r border-gold-muted/10 last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 bg-gold-muted/20 gap-px border-b border-gold-muted/20 flex-grow overflow-y-auto custom-scrollbar">
                {days.map((day, index) => {
                    const dayTasks = getTasksForDay(day);
                    const today = isToday(day);

                    if (day === null) {
                        return <div key={`empty-${index}`} className="bg-emerald-deep min-h-[80px]" />;
                    }

                    return (
                        <div
                            key={day}
                            onClick={() => handleDateClick(day)}
                            className={`bg-emerald-deep p-2 flex flex-col transition-colors relative group cursor-pointer min-h-[100px] hover:bg-emerald-light/20
                            ${today ? 'bg-emerald-light/30' : ''}
                        `}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs font-serif font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors
                                ${today ? 'bg-gold text-emerald-deep shadow-glow-sm' : 'text-ivory/60 group-hover:text-gold'}
                            `}>
                                    {day}
                                </span>
                                {/* Hover Add Button */}
                                <button className="opacity-0 group-hover:opacity-100 p-1 text-gold-muted hover:text-gold transition-opacity">
                                    <PlusIcon className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="flex-1 flex flex-col gap-1 w-full">
                                {dayTasks.slice(0, 4).map(task => (
                                    <button
                                        key={task.id}
                                        onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                                        className={`w-full text-left text-[9px] px-1.5 py-1 truncate font-sans border rounded-sm shadow-sm transition-transform hover:scale-[1.02] block
                                        ${task.isCompleted ? 'opacity-50 line-through text-gold-muted border-transparent bg-transparent' : ''}
                                        ${!task.isCompleted && task.priority === Priority.High
                                                ? 'bg-crimson/10 text-crimson border-crimson/30 hover:bg-crimson/20'
                                                : !task.isCompleted && task.priority === Priority.Medium
                                                    ? 'bg-gold/10 text-gold border-gold/30 hover:bg-gold/20'
                                                    : !task.isCompleted && 'bg-emerald-light/30 text-emerald-200 border-emerald-500/20'
                                            }
                                    `}
                                        title={task.title}
                                    >
                                        {task.title}
                                    </button>
                                ))}
                                {dayTasks.length > 4 && (
                                    <div className="text-[9px] font-bold text-gold-muted px-1 mt-auto">
                                        +{dayTasks.length - 4} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;