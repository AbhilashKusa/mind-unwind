import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { processUserCommand, addToCommandHistory, ProactiveSuggestion, isAIAvailable, parseSlashCommand } from '../../services/gemini';
import { Sparkles, Command, Trash2, Check, X, Search, Zap, Calendar, CornerDownLeft, AlertCircle } from 'lucide-react';
import { Priority, Task, AICommandResponse } from '../../types';

interface CommandSpotlightProps {
    isOpen: boolean;
    onClose: () => void;
    currentView: string;
}

export const CommandSpotlight: React.FC<CommandSpotlightProps> = ({ isOpen, onClose, currentView }) => {
    const { tasks, setTasks, addTask, updateTask, deleteTask } = useStore();
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<{ response: AICommandResponse, originalCommand: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

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

        try {
            // Check for slash commands first
            const slashCommand = parseSlashCommand(input);
            if (slashCommand) {
                if (slashCommand.type === 'focus') {
                    // This creates a task for the UI to handle, or we can emit an event
                    // For now, let's just let the AI handle it if it's complex, 
                    // or if it's simple /focus, we might want to trigger the modal via store/props? 
                    // Since we don't have direct access to setFocusOpen here without prop drilling or store,
                    // let's pass it to AI to "confirm" entering focus mode or just handle it if it's an action.
                    // Actually, let's treat it as a "System Action" that bypasses AI for speed if possible.
                    // But for this V2 implementation, we will pass it to AI to "interpret" the intent for a smoother experience first.
                }
            }

            // Enhanced context for V2
            const context = {
                viewMode: currentView,
                isFocusMode: document.querySelector('.focus-mode-active') ? true : false,
                timeOfDay: new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'
            };

            const response = await processUserCommand(input, tasks, context);

            // Check for destructive actions or significant changes logic from internal V1
            const isDestructive = response.deletedIds.length > 0;
            const manyChanges = (response.added.length + response.updated.length + response.deletedIds.length) > 2;

            if (isDestructive || manyChanges) {
                setPendingAction({ response, originalCommand: input });
            } else {
                await applyChanges(response);
                setAiResponse(response.aiResponse);
                setInput('');
                setTimeout(onClose, 2000); // Auto close after success
            }
        } catch (error) {
            console.error(error);
            setAiResponse("Sorry, I couldn't process that. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const applyChanges = async (response: AICommandResponse) => {
        const generateId = () => Math.random().toString(36).substr(2, 9);

        // Additions
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
                workspace: 'personal'
            };
            await addTask(newTask);
        }

        // Deletions
        for (const id of response.deletedIds) {
            await deleteTask(id);
        }

        // Updates
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
            setTimeout(onClose, 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 md:pt-[20vh] px-4 bg-emerald-deep/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-xl md:max-w-2xl bg-[#0a1f1c] border border-gold/20 rounded-sm shadow-2xl shadow-black/50 overflow-hidden flex flex-col animate-in slide-in-from-top-4 duration-300 ring-1 ring-gold/10">

                {/* Search Bar Region */}
                <div className="flex items-center p-4 border-b border-gold/10 bg-emerald-deep/95">
                    <div className={`p-2 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/10 shadow-glow-sm ${isProcessing ? 'animate-pulse' : ''}`}>
                        {isProcessing ? <Sparkles className="w-5 h-5 text-gold animate-spin" /> : <Command className="w-5 h-5 text-gold" />}
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                        placeholder={pendingAction ? "Confirm action..." : "Type a command..."}
                        disabled={isProcessing || !!pendingAction}
                        className="flex-1 bg-transparent border-none outline-none text-xl px-4 text-ivory placeholder:text-ivory/30 font-serif italic selection:bg-gold selection:text-emerald-deep"
                    />
                    <div className="flex items-center gap-2">
                        {input && !isProcessing && !pendingAction && (
                            <span className="flex items-center gap-1 text-[10px] text-gold/50 font-bold uppercase tracking-widest bg-gold/5 px-2 py-1 rounded border border-gold/10">
                                <CornerDownLeft className="w-3 h-3" /> Enter
                            </span>
                        )}
                        <button onClick={onClose} className="p-1 hover:bg-gold/10 rounded-full transition-colors group">
                            <X className="w-5 h-5 text-ivory/50 group-hover:text-gold" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">

                    {/* Default State: Suggestions */}
                    {!input && !aiResponse && !pendingAction && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-bold text-gold/50 uppercase tracking-[0.2em] mb-3">Quick Actions</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <button className="flex items-center gap-3 text-left p-4 rounded-sm bg-emerald-light/5 hover:bg-emerald-light/10 transition-all border border-gold/5 hover:border-gold/20 group hover:shadow-glow-sm">
                                    <div className="p-2 bg-emerald-light/10 rounded-full text-emerald-light group-hover:text-gold transition-colors">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="block text-sm font-serif text-ivory/90 group-hover:text-gold transition-colors mb-0.5">Plan Daily Schedule</span>
                                        <span className="text-[10px] text-ivory/40 uppercase tracking-wider">Morning Briefing</span>
                                    </div>
                                </button>
                                <button className="flex items-center gap-3 text-left p-4 rounded-sm bg-emerald-light/5 hover:bg-emerald-light/10 transition-all border border-gold/5 hover:border-gold/20 group hover:shadow-glow-sm">
                                    <div className="p-2 bg-emerald-light/10 rounded-full text-emerald-light group-hover:text-gold transition-colors">
                                        <Zap className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="block text-sm font-serif text-ivory/90 group-hover:text-gold transition-colors mb-0.5">Enter Focus Mode</span>
                                        <span className="text-[10px] text-ivory/40 uppercase tracking-wider">Start Timer</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Pending Confirmation View */}
                    {pendingAction && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 px-2">
                            <div className="p-6 rounded-sm bg-black/20 border border-gold/30 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-gold/50" />
                                <h4 className="flex items-center gap-3 text-gold font-serif text-xl mb-4 italic">
                                    <AlertCircle className="w-5 h-5" /> Please Confirm
                                </h4>
                                <div className="space-y-3 text-sm text-ivory/80 font-sans pl-1">
                                    {pendingAction.response.added.length > 0 && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-emerald-light font-bold text-xs bg-emerald-light/10 px-2 py-0.5 rounded-full border border-emerald-light/20">+ ADD</span>
                                            <span>{pendingAction.response.added.length} actions</span>
                                        </div>
                                    )}
                                    {pendingAction.response.deletedIds.length > 0 && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-crimson font-bold text-xs bg-crimson/10 px-2 py-0.5 rounded-full border border-crimson/20">- PURGE</span>
                                            <span>{pendingAction.response.deletedIds.length} items</span>
                                        </div>
                                    )}
                                    {pendingAction.response.updated.length > 0 && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-gold font-bold text-xs bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">~ MODIFY</span>
                                            <span>{pendingAction.response.updated.length} entries</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setPendingAction(null)}
                                    className="px-6 py-2.5 text-xs font-bold text-ivory/60 hover:text-ivory hover:bg-white/5 transition-all uppercase tracking-widest rounded-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="px-6 py-2.5 bg-gold/10 border border-gold/40 text-gold hover:bg-gold hover:text-emerald-deep text-xs font-bold uppercase tracking-widest transition-all shadow-glow-gold hover:shadow-glow-gold-lg rounded-sm"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    )}

                    {/* AI Feedback */}
                    {aiResponse && (
                        <div className="p-4 rounded-sm bg-emerald-light/10 border border-gold/20 text-ivory text-sm animate-in zoom-in-95 flex items-start gap-3">
                            <div className="p-1 rounded-full bg-gold/10 text-gold mt-0.5">
                                <Check className="w-4 h-4" />
                            </div>
                            <div className="italic font-serif leading-relaxed opacity-90">{aiResponse}</div>
                        </div>
                    )}

                </div>

                {/* Footer / Context Info */}
                <div className="p-3 border-t border-gold/5 bg-black/40 flex justify-between items-center text-[10px] text-ivory/40 uppercase tracking-widest font-bold">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1.5"><span className="bg-white/10 px-1 rounded">⌘</span> <span className="pt-0.5">Toggle</span></span>
                        <span className="flex items-center gap-1.5"><span className="bg-white/10 px-1 rounded">ESC</span> <span className="pt-0.5">Close</span></span>
                    </div>
                    <div className="font-mono text-gold/30">GEMINI 2.5 FLASH // {currentView.toUpperCase()}</div>
                </div>
            </div>
        </div>
    );
};
