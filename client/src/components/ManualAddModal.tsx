import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { X, Calendar } from 'lucide-react';
import { Priority } from '../types';

interface ManualAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (e: React.FormEvent) => void;
    title: string;
    setTitle: (val: string) => void;
    priority: Priority;
    setPriority: (val: Priority) => void;
    dueDate: string;
    setDueDate: (val: string) => void;
}

export const ManualAddModal: React.FC<ManualAddModalProps> = ({
    isOpen, onClose, onAdd, title, setTitle, priority, setPriority, dueDate, setDueDate
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (isOpen) {
            gsap.fromTo(containerRef.current,
                { opacity: 0, scale: 0.95, y: 20 },
                { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "power3.out" }
            );
        }
    }, { scope: containerRef, dependencies: [isOpen] });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-dark/90 backdrop-blur-md">
            <div ref={containerRef} className="bg-emerald-deep border border-gold/30 shadow-glow-gold p-8 w-full max-w-md relative overflow-hidden">
                {/* Golden Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-gold/30"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gold/30"></div>

                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-serif text-gold">Inscribe Task</h3>
                    <button onClick={onClose} className="text-gold-muted hover:text-gold transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <form onSubmit={onAdd} className="space-y-6">
                    <div className="group">
                        <label className="block text-[10px] font-bold uppercase text-gold-muted mb-2 tracking-widest">Title</label>
                        <input
                            autoFocus
                            type="text"
                            placeholder="What needs to be done?"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-4 bg-emerald-light/30 border-b border-gold-muted/30 focus:border-gold outline-none font-serif text-lg text-ivory placeholder:text-gray-600 transition-colors"
                        />
                    </div>

                    {/* Priority Select */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-gold-muted mb-2 tracking-widest">Priority</label>
                        <div className="flex gap-3">
                            {[Priority.High, Priority.Medium, Priority.Low].map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest border transition-all duration-300 ${priority === p
                                        ? 'bg-gold text-emerald-deep border-gold shadow-glow-sm scale-105'
                                        : 'bg-transparent text-gold-muted border-gold-muted/30 hover:border-gold/50'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Select */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gold-muted uppercase tracking-widest">
                            Due Date
                        </label>
                        <div className="relative">
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full bg-emerald-light/30 border-b border-gold-muted/30 p-4 text-sm font-sans text-ivory focus:border-gold outline-none uppercase tracking-wide"
                            />
                            <Calendar className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gold-muted pointer-events-none" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-gradient-to-r from-gold-muted via-gold to-gold-muted text-emerald-deep font-bold uppercase tracking-[0.25em] text-xs hover:shadow-glow-gold hover:scale-[1.01] transition-all duration-300 mt-6"
                    >
                        Add to Sanctuary
                    </button>
                </form>
            </div>
        </div>
    );
};
