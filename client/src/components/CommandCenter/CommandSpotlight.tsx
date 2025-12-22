import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { processUserCommand, addToCommandHistory, parseSlashCommand } from '../../services/gemini';
import { Command, X, Search, Zap, Calendar, ArrowRight, Sparkles, Check, AlertCircle, CornerDownLeft } from 'lucide-react';
import { Priority, Task, AICommandResponse } from '../../types';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface CommandSpotlightProps {
    isOpen: boolean;
    onClose: () => void;
    currentView: string;
}

export const CommandSpotlight: React.FC<CommandSpotlightProps> = ({ isOpen, onClose, currentView }) => {
    const { tasks, addTask, updateTask, deleteTask } = useStore();
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<{ response: AICommandResponse, originalCommand: string } | null>(null);

    // Refs for GSAP
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // GSAP Animations
    useGSAP(() => {
        if (isOpen) {
            // Reset state
            gsap.set(modalRef.current, { y: -20, opacity: 0, scale: 0.98 });
            gsap.set(containerRef.current, { opacity: 0 });

            // Entrance timeline
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

            tl.to(containerRef.current, {
                opacity: 1,
                duration: 0.3
            })
                .to(modalRef.current, {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 0.4,
                    clearProps: "scale" // Prevent blurriness on some screens
                }, "-=0.2")
                .fromTo(".spotlight-item", {
                    y: 10,
                    opacity: 0
                }, {
                    y: 0,
                    opacity: 1,
                    stagger: 0.05,
                    duration: 0.3
                }, "-=0.2");

        } else {
            // Exit animation handled safely before unmount/hide logic if we had tracking? 
            // For now, react unmounts purely on 'isOpen' prop which makes exit anims tricky without AnimatePresence.
            // We'll rely on fast CSS transitions for closing or accept instant close for responsiveness.
        }
    }, { dependencies: [isOpen], scope: containerRef });

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleExecute = async () => {
        if (!input.trim() || isProcessing) return;

        setIsProcessing(true);
        setAiResponse(null);

        // Visual feedback
        gsap.to(inputRef.current, { scale: 0.99, duration: 0.1, yoyo: true, repeat: 1 });

        try {
            const context = {
                viewMode: currentView,
                isFocusMode: !!document.querySelector('.focus-mode-active'),
                timeOfDay: new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'
            };

            const response = await processUserCommand(input, tasks, context);

            const isDestructive = response.deletedIds.length > 0;
            const manyChanges = (response.added.length + response.updated.length + response.deletedIds.length) > 2;

            if (isDestructive || manyChanges) {
                setPendingAction({ response, originalCommand: input });
            } else {
                await applyChanges(response);
                setAiResponse(response.aiResponse);
                setInput('');

                // Success animation
                gsap.fromTo(".success-flash", { opacity: 0, scale: 1.1 }, { opacity: 1, scale: 1, duration: 0.3, yoyo: true, repeat: 1 });
                setTimeout(onClose, 1500);
            }
        } catch (error) {
            console.error(error);
            setAiResponse("I couldn't process that request.");
            gsap.to(modalRef.current, { x: 5, duration: 0.1, yoyo: true, repeat: 3 }); // Shake effect
        } finally {
            setIsProcessing(false);
        }
    };

    const applyChanges = async (response: AICommandResponse) => {
        const generateId = () => Math.random().toString(36).substr(2, 9);

        for (const item of response.added) {
            const newTask: Task = {
                id: generateId(),
                title: item.title,
                description: item.description,
                priority: item.priority as Priority,
                category: item.category,
                isCompleted: false,
                dueDate: item.dueDate,
                subtasks: [],
                comments: [],
                createdAt: Date.now(),
                workspace: item.workspace || 'personal'
            };
            await addTask(newTask);
        }

        for (const id of response.deletedIds) {
            await deleteTask(id);
        }

        for (const update of response.updated) {
            const existing = tasks.find(t => t.id === update.id);
            if (existing) {
                await updateTask({ ...existing, ...update.updates });
            }
        }

        addToCommandHistory(input, response.added.length, response.updated.length, response.deletedIds.length);
    };

    const handleConfirm = async () => {
        if (pendingAction) {
            await applyChanges(pendingAction.response);
            setAiResponse(pendingAction.response.aiResponse);
            setPendingAction(null);
            setInput('');
            setTimeout(onClose, 1500);
        }
    };

    if (!isOpen) return null;

    return (
        <div ref={containerRef} className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
            {/* Darkened Backdrop with extreme blur */}
            <div
                className="absolute inset-0 bg-[#000504]/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* Main Modal */}
            <div
                ref={modalRef}
                className="w-full max-w-2xl bg-[#0F1412]/90 backdrop-blur-2xl border border-white/5 shadow-2xl rounded-xl overflow-hidden relative ring-1 ring-white/10"
                style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.05)' }}
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent opacity-50" />
                <div className="absolute -top-[100px] left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

                {/* Search Header */}
                <div className="relative flex items-center p-6 border-b border-white/5">
                    <div className={`mr-4 p-2 rounded-lg bg-white/5 border border-white/5 text-emerald-400 shadow-lg ${isProcessing ? 'animate-pulse' : ''}`}>
                        {isProcessing ? <Sparkles className="w-6 h-6 animate-spin-slow" /> : <Command className="w-6 h-6" />}
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                        placeholder={pendingAction ? "Confirm your command..." : "What needs to be done?"}
                        disabled={isProcessing || !!pendingAction}
                        className="flex-1 bg-transparent border-none outline-none text-2xl text-white font-serif placeholder:text-white/20 caret-emerald-500"
                        autoComplete="off"
                    />

                    {input && !isProcessing && (
                        <div className="absolute right-6 flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                            <div className="px-2 py-1 bg-white/10 rounded flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-emerald-400 border border-emerald-500/20">
                                <CornerDownLeft className="w-3 h-3" /> Return
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Body */}
                <div
                    ref={resultsRef}
                    className="max-h-[50vh] overflow-y-auto px-2 py-2"
                >
                    {/* Default View (No Input) */}
                    {!input && !aiResponse && !pendingAction && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                            <button
                                onClick={() => {
                                    setInput("Enter Focus Mode");
                                    handleExecute();
                                }}
                                className="spotlight-item group flex items-start gap-4 p-4 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all text-left"
                            >
                                <div className="p-2 bg-emerald-500/10 rounded-md text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="block text-white/90 font-medium group-hover:text-emerald-400 transition-colors">Focus Mode</span>
                                    <span className="text-xs text-white/40">Enter distraction-free zone</span>
                                </div>
                            </button>
                            <button
                                onClick={() => {
                                    setInput("Prepare my Daily Briefing");
                                    handleExecute();
                                }}
                                className="spotlight-item group flex items-start gap-4 p-4 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all text-left"
                            >
                                <div className="p-2 bg-blue-500/10 rounded-md text-blue-400 group-hover:bg-blue-500 group-hover:text-black transition-colors">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="block text-white/90 font-medium group-hover:text-blue-400 transition-colors">Daily Briefing</span>
                                    <span className="text-xs text-white/40">Review today's agenda</span>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Pending Confirmation */}
                    {pendingAction && (
                        <div className="p-6 spotlight-item">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center space-y-4">
                                <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-serif text-white mb-1">Confirm Action</h3>
                                    <p className="text-white/60 text-sm">
                                        You are about to modify {pendingAction.response.added.length + pendingAction.response.updated.length} tasks and delete {pendingAction.response.deletedIds.length}.
                                    </p>
                                </div>
                                <div className="flex justify-center gap-3 pt-2">
                                    <button
                                        onClick={() => setPendingAction(null)}
                                        className="px-6 py-2 rounded-md bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        className="px-6 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white text-sm font-bold tracking-wide transition-colors shadow-lg"
                                    >
                                        Execute Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Feedback */}
                    {aiResponse && (
                        <div className="p-6 spotlight-item success-flash">
                            <div className="flex items-start gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                <div className="p-1 bg-emerald-500 rounded-full text-black mt-0.5">
                                    <Check className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-emerald-400 font-serif text-lg italic mb-1">Done.</p>
                                    <p className="text-white/80 text-sm">{aiResponse}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-black/40 border-t border-white/5 p-3 flex justify-between text-[10px] text-white/30 uppercase tracking-widest font-bold">
                    <span className="flex items-center gap-2">
                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-white/50">TAB</span> Navigation
                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-white/50 ml-2">↑↓</span> Select
                    </span>
                    <span>MindUnwind Intelligence</span>
                </div>
            </div>
        </div>
    );
};

