import React, { useState, useCallback, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { processUserCommand, addToCommandHistory, generateProactiveSuggestions, ProactiveSuggestion, isAIAvailable, getAIError } from '../../services/gemini';
import { Wand2, Sparkles, Trash2, Check, X, Lightbulb, RefreshCw, Command, CornerDownLeft } from 'lucide-react';
import { Priority, Task, AICommandResponse } from '../../types';

// Check AI availability on load
const aiAvailable = isAIAvailable();
const aiError = getAIError();

interface PendingAction {
    response: AICommandResponse;
    originalCommand: string;
}

interface UndoState {
    tasks: Task[];
    description: string;
}

export const CommandCenter: React.FC = () => {
    const { tasks, setTasks, addTask, updateTask, deleteTask } = useStore();
    const [commandInput, setCommandInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiResponse, setAiResponse] = useState<string | null>(null);

    // New state for confirmation and undo
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
    const [undoState, setUndoState] = useState<UndoState | null>(null);
    const [showUndo, setShowUndo] = useState(false);

    // Proactive suggestions state
    const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [lastSuggestionTime, setLastSuggestionTime] = useState(0);

    const generateId = () => Math.random().toString(36).substr(2, 9);

    // Fetch proactive suggestions on mount and when tasks change significantly
    const fetchSuggestions = useCallback(async () => {
        // Debounce: Don't fetch if we fetched within the last 30 seconds
        const now = Date.now();
        if (now - lastSuggestionTime < 30000) return;

        setIsLoadingSuggestions(true);
        try {
            const newSuggestions = await generateProactiveSuggestions(tasks);
            setSuggestions(newSuggestions);
            setLastSuggestionTime(now);
        } catch (err) {
            console.error('Failed to fetch suggestions:', err);
            setSuggestions([]);
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, [tasks, lastSuggestionTime]);

    // Force refresh suggestions
    const handleRefreshSuggestions = () => {
        setLastSuggestionTime(0); // Reset debounce
        fetchSuggestions();
    };

    // Handle clicking a suggestion - auto-fill the command input
    const handleSuggestionClick = (suggestion: ProactiveSuggestion) => {
        setCommandInput(suggestion.action);
        setError(null);
        setAiResponse(null);
    };

    const handleCommandChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCommandInput(e.target.value);
        if (error) setError(null);
        if (aiResponse) setAiResponse(null);
    };

    // Execute the pending action
    const executeAction = useCallback(async (response: AICommandResponse, originalCommand: string) => {
        // Save current state for undo
        setUndoState({
            tasks: [...tasks],
            description: `Undo: ${originalCommand}`
        });

        // Handle Additions
        const newTasks: Task[] = response.added.map(item => ({
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
        }));

        for (const task of newTasks) {
            await addTask(task);
        }

        // Handle Updates
        for (const update of response.updated) {
            const existing = tasks.find(t => t.id === update.id);
            if (existing) {
                await updateTask({ ...existing, ...update.updates });
            }
        }

        // Handle Deletions
        for (const id of response.deletedIds) {
            await deleteTask(id);
        }

        addToCommandHistory(originalCommand, response.added.length, response.updated.length, response.deletedIds.length);

        setShowUndo(true);
        setTimeout(() => setShowUndo(false), 8000); // Hide undo after 8s
    }, [tasks, addTask, updateTask, deleteTask]);

    const handleExecuteCommand = async () => {
        if (!commandInput.trim() || isProcessing) return;

        setIsProcessing(true);
        setError(null);
        setAiResponse(null);
        setPendingAction(null);

        try {
            // Context Awareness
            const context = {
                viewMode: 'concierge', // This component IS the concierge view basically
                isFocusMode: document.querySelector('.focus-mode-active') ? true : false,
                timeOfDay: new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'
            };

            const response = await processUserCommand(commandInput, tasks, context);

            // Logic: If the action is "destructive" or complex, ask for confirmation.
            // Destructive = deletions > 0
            // Complex = total changes > 2
            const isDestructive = response.deletedIds.length > 0;
            const isComplex = (response.added.length + response.updated.length + response.deletedIds.length) > 2;

            setAiResponse(response.aiResponse); // Always show what AI thinks first

            if (isDestructive || isComplex) {
                setPendingAction({ response, originalCommand: commandInput });
            } else {
                // Auto-execute simple commands
                await executeAction(response, commandInput);
                setCommandInput('');
                // Clear AI response after a delay for cleanliness, or keep it? 
                // Let's keep it until next interaction.
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || "The AI curator is currently unavailable.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmAction = async () => {
        if (pendingAction) {
            await executeAction(pendingAction.response, pendingAction.originalCommand);
            setPendingAction(null);
            setCommandInput('');
        }
    };

    const handleCancelAction = () => {
        setPendingAction(null);
        setAiResponse(null);
    };

    const handleUndo = async () => {
        if (undoState) {
            await setTasks(undoState.tasks);
            setUndoState(null);
            setShowUndo(false);
            setAiResponse("Action reversed as commanded.");
        }
    };

    return (
        <div className="relative w-full max-w-2xl mx-auto">
            {/* Main polished glass card */}
            <div className="bg-[#0a1f1c]/80 backdrop-blur-xl border border-gold/20 rounded-lg shadow-2xl relative overflow-hidden group">

                {/* Subtle top sheen */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold/50 to-transparent opacity-50"></div>

                <div className="p-6 md:p-8 space-y-6">

                    {/* Input Area */}
                    <div className="relative">
                        <textarea
                            value={commandInput}
                            onChange={handleCommandChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleExecuteCommand();
                                }
                            }}
                            placeholder={aiAvailable ? "Describe your intent..." : "AI Unavailable (Check API Key)"}
                            className={`w-full bg-black/20 border border-gold/10 rounded-lg p-4 pl-12 text-lg text-ivory placeholder:text-ivory/30 focus:outline-none focus:border-gold/40 focus:bg-black/30 transition-all font-serif italic resize-none h-20 shadow-inner 
                                ${!aiAvailable ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            disabled={!aiAvailable || isProcessing || !!pendingAction}
                        />
                        <div className={`absolute top-4 left-4 p-1.5 rounded-md ${isProcessing ? 'animate-pulse text-gold' : 'text-gold/50'}`}>
                            {isProcessing ? <Sparkles className="w-5 h-5 animate-spin" /> : <Command className="w-5 h-5" />}
                        </div>

                        {/* Send button (Enter hint) */}
                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                            {commandInput && !isProcessing && !pendingAction && (
                                <button
                                    onClick={handleExecuteCommand}
                                    className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest bg-gold px-3 py-1.5 rounded hover:bg-gold-light text-emerald-deep transition-all shadow-glow-gold hover:shadow-glow-gold-lg transform hover:-translate-y-0.5"
                                >
                                    Execute <CornerDownLeft className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* AI Status / Feedback Area */}
                    {aiResponse && (
                        <div className={`p-4 rounded-md border ${pendingAction ? 'bg-gold/5 border-gold/30' : 'bg-emerald-light/5 border-emerald-light/20'} animate-in fade-in slide-in-from-top-2`}>
                            <div className="flex gap-3">
                                <div className={`p-1.5 rounded-full h-fit flex-shrink-0 ${pendingAction ? 'bg-gold/20 text-gold' : 'bg-emerald-light/20 text-emerald-light'}`}>
                                    {pendingAction ? <Lightbulb className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                </div>
                                <div className="space-y-3 flex-1">
                                    <p className="text-sm font-serif italic text-ivory/90 leading-relaxed">
                                        "{aiResponse}"
                                    </p>

                                    {/* Confirmation Actions */}
                                    {pendingAction && (
                                        <div className="flex gap-4 pt-2">
                                            <button
                                                onClick={handleConfirmAction}
                                                className="px-6 py-2 bg-gradient-to-r from-gold to-gold-light text-emerald-deep text-xs font-bold uppercase tracking-widest rounded shadow-glow-gold hover:shadow-glow-gold-lg hover:from-white hover:to-gold transition-all"
                                            >
                                                Proceed
                                            </button>
                                            <button
                                                onClick={handleCancelAction}
                                                className="px-6 py-2 border border-white/10 hover:bg-white/5 text-ivory/60 hover:text-ivory text-xs font-bold uppercase tracking-widest rounded transition-all"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 rounded-md bg-crimson/10 border border-crimson/30 text-crimson-light text-sm flex items-center gap-3 animate-in shake">
                            <X className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Suggestions Area */}
                    {!isProcessing && !pendingAction && !commandInput && (
                        <div className="pt-2">
                            {/* Manual Trigger Button */}
                            {suggestions.length === 0 && (
                                <div className="flex justify-center">
                                    <button
                                        onClick={fetchSuggestions}
                                        disabled={isLoadingSuggestions}
                                        className="group relative px-6 py-3 rounded-full bg-emerald-light/5 hover:bg-emerald-light/10 border border-gold/20 transition-all overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gold/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                        <div className="relative flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gold opacity-80 group-hover:opacity-100">
                                            {isLoadingSuggestions ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
                                            )}
                                            <span>{isLoadingSuggestions ? "Curating..." : "Curate Suggestions"}</span>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {/* Suggestions List */}
                            {suggestions.length > 0 && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="flex items-center justify-between px-1">
                                        <h3 className="text-[10px] font-bold text-gold/40 uppercase tracking-[0.2em]">
                                            Suggested Actions
                                        </h3>
                                        <button onClick={handleRefreshSuggestions} className="text-gold/30 hover:text-gold transition-colors" title="Refresh">
                                            <RefreshCw className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {suggestions.slice(0, 3).map((suggestion, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSuggestionClick(suggestion)}
                                                className="group text-left p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-gold/20 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className="mt-1 p-2 rounded-full bg-gold/10 text-gold group-hover:scale-110 transition-transform duration-300">
                                                        <Wand2 className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-medium text-ivory group-hover:text-gold transition-colors">
                                                            {suggestion.reason}
                                                        </h4>
                                                        <p className="text-xs text-ivory/40 mt-1 italic group-hover:text-ivory/60 transition-colors">
                                                            "{suggestion.action}"
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Action to dismiss */}
                                    <div className="text-center pt-2">
                                        <button
                                            onClick={() => setSuggestions([])}
                                            className="text-[10px] text-ivory/30 hover:text-crimson transition-colors uppercase tracking-wider"
                                        >
                                            Dismiss Suggestions
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Undo Toast */}
            {showUndo && undoState && (
                <div className="absolute -bottom-16 left-0 right-0 flex justify-center animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <div className="bg-emerald-deep border border-gold/30 rounded px-6 py-3 shadow-glow-gold flex items-center gap-4">
                        <span className="text-sm text-ivory">{undoState.description}</span>
                        <button
                            onClick={handleUndo}
                            className="bg-gold/20 hover:bg-gold/30 text-gold text-xs font-bold uppercase tracking-wider px-3 py-1 rounded transition-colors"
                        >
                            Undo
                        </button>
                        <button onClick={() => setShowUndo(false)} className="text-ivory/50 hover:text-ivory">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
