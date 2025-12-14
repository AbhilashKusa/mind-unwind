import React, { useState, useCallback, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { processUserCommand, addToCommandHistory, generateProactiveSuggestions, ProactiveSuggestion, isAIAvailable, getAIError } from '../../services/gemini';
import { Wand2, Sparkles, Trash2, Check, X, Lightbulb, RefreshCw } from 'lucide-react';
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

    // Fetch suggestions on initial load (only if AI is available)
    useEffect(() => {
        if (aiAvailable && tasks.length > 0 && suggestions.length === 0 && !isLoadingSuggestions) {
            fetchSuggestions();
        }
    }, [tasks.length, suggestions.length, isLoadingSuggestions, fetchSuggestions]);

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
            createdAt: Date.now()
        }));

        for (const t of newTasks) {
            await addTask(t);
        }

        // Handle Deletions
        for (const id of response.deletedIds) {
            await deleteTask(id);
        }

        // Handle Updates
        for (const update of response.updated) {
            const existingTask = tasks.find(t => t.id === update.id);
            if (existingTask) {
                const updatedTask = { ...existingTask, ...update.updates };
                await updateTask(updatedTask);
            }
        }

        // Add to command history for context
        addToCommandHistory(
            originalCommand,
            response.added.length,
            response.updated.length,
            response.deletedIds.length
        );

        setAiResponse(response.aiResponse);
        setCommandInput('');
        setPendingAction(null);
        setShowUndo(true);

        // Clear used suggestion if it matches
        setSuggestions(prev => prev.filter(s => s.action !== originalCommand));

        setTimeout(() => {
            setAiResponse(null);
            setShowUndo(false);
        }, 8000);
    }, [tasks, addTask, updateTask, deleteTask]);

    // Handle undo
    const handleUndo = useCallback(async () => {
        if (!undoState) return;

        // Restore previous state
        setTasks(undoState.tasks);

        // Sync with server
        for (const t of undoState.tasks) {
            await updateTask(t);
        }

        setAiResponse("Action undone successfully.");
        setUndoState(null);
        setShowUndo(false);
        setTimeout(() => setAiResponse(null), 3000);
    }, [undoState, setTasks, updateTask]);

    const handleProcessCommand = async () => {
        if (!commandInput.trim()) return;

        setIsProcessing(true);
        setError(null);
        setAiResponse(null);
        setPendingAction(null);

        try {
            const response = await processUserCommand(commandInput, tasks);

            // Check if this is a destructive action that needs confirmation
            const hasDestructiveAction = response.deletedIds.length > 0;
            const hasManyChanges = (response.added.length + response.updated.length + response.deletedIds.length) > 3;

            if (hasDestructiveAction || hasManyChanges) {
                // Show confirmation
                setPendingAction({
                    response,
                    originalCommand: commandInput
                });
            } else {
                // Execute immediately for simple actions
                await executeAction(response, commandInput);
            }

        } catch (err: any) {
            // Provide specific error messages based on error type
            const errorMessage = err.message || '';

            if (errorMessage.includes('VITE_GEMINI_API_KEY') || errorMessage.includes('not configured') || errorMessage.includes('API Key')) {
                setError("AI not configured. Please set VITE_GEMINI_API_KEY in your .env file.");
            } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('ERR_CONNECTION')) {
                setError("Connection issue. Please check your internet and try again.");
            } else if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
                setError("Request timed out. Try a simpler command.");
            } else if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('rate limit')) {
                setError("AI quota exceeded. Please wait a moment.");
            } else if (errorMessage.includes('400') || errorMessage.includes('invalid')) {
                setError("Invalid request. Please rephrase your command.");
            } else {
                console.error("Command Center Error:", errorMessage);
                setError("AI service unavailable. Please try again later.");
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmAction = () => {
        if (pendingAction) {
            executeAction(pendingAction.response, pendingAction.originalCommand);
        }
    };

    const handleCancelAction = () => {
        setPendingAction(null);
        setAiResponse("Action cancelled.");
        setTimeout(() => setAiResponse(null), 3000);
    };

    // Get suggestion type color
    const getSuggestionColor = (type: ProactiveSuggestion['type']) => {
        switch (type) {
            case 'overdue': return 'border-crimson/60 text-crimson hover:border-crimson';
            case 'deadline': return 'border-amber-500/60 text-amber-400 hover:border-amber-500';
            case 'cleanup': return 'border-emerald-light/60 text-emerald-light hover:border-emerald-light';
            case 'productivity': return 'border-gold/60 text-gold hover:border-gold';
            case 'reminder': return 'border-ivory/30 text-ivory/80 hover:border-ivory/60';
            default: return 'border-gold-muted/40 text-gold-muted hover:border-gold';
        }
    };

    // Render confirmation preview
    const renderConfirmation = () => {
        if (!pendingAction) return null;

        const { response } = pendingAction;

        return (
            <div className="mt-4 p-4 bg-emerald-deep/80 border border-gold/40 rounded-sm animate-in fade-in slide-in-from-top-2">
                <h4 className="text-gold font-bold text-xs uppercase tracking-wider mb-3">
                    ⚠️ Confirm Changes
                </h4>
                <div className="space-y-2 text-xs text-ivory/80 mb-4">
                    {response.added.length > 0 && (
                        <p className="flex items-center gap-2">
                            <span className="text-emerald-light">+</span>
                            Adding {response.added.length} task{response.added.length > 1 ? 's' : ''}
                        </p>
                    )}
                    {response.updated.length > 0 && (
                        <p className="flex items-center gap-2">
                            <span className="text-gold">↻</span>
                            Updating {response.updated.length} task{response.updated.length > 1 ? 's' : ''}
                        </p>
                    )}
                    {response.deletedIds.length > 0 && (
                        <p className="flex items-center gap-2 text-crimson">
                            <Trash2 className="w-3 h-3" />
                            Deleting {response.deletedIds.length} task{response.deletedIds.length > 1 ? 's' : ''}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleConfirmAction}
                        className="flex-1 py-2 px-4 bg-gradient-to-r from-gold-muted via-gold to-gold-muted text-emerald-deep font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-glow-gold transition-all"
                    >
                        <Check className="w-4 h-4" />
                        Confirm
                    </button>
                    <button
                        onClick={handleCancelAction}
                        className="py-2 px-4 border border-gold-muted/50 text-gold-muted font-bold text-xs uppercase tracking-wider hover:border-gold hover:text-gold transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-emerald-deep/40 backdrop-blur-xl p-8 border border-gold-muted/20 flex flex-col h-[600px] lg:h-[calc(100vh-160px)] sticky top-28 rounded-sm shadow-glow-gold transition-all hover:border-gold-muted/40 group">
            <div className="mb-8 pb-6 border-b border-gold-muted/10 flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-serif text-gold flex items-center gap-3">
                        Command Center
                    </h2>
                    <p className="text-[10px] font-sans font-bold text-gray-500 mt-2 uppercase tracking-[0.25em]">
                        Your Digital Butler • Gemini 2.5 Flash
                    </p>
                </div>
                <div className="p-2 border border-gold/30 rounded-full bg-gold/5 text-gold animate-pulse-slow">
                    <Wand2 className="w-5 h-5" />
                </div>
            </div>

            {/* AI Not Configured Warning */}
            {!aiAvailable && (
                <div className="mb-4 p-4 bg-crimson/20 border border-crimson/50 rounded-sm">
                    <p className="text-crimson text-xs font-bold uppercase tracking-wider mb-1">
                        ⚠️ AI Not Configured
                    </p>
                    <p className="text-ivory/70 text-[11px]">
                        Add <code className="bg-black/30 px-1 rounded">VITE_GEMINI_API_KEY</code> to your <code className="bg-black/30 px-1 rounded">.env</code> file.
                    </p>
                </div>
            )}

            {/* Proactive Suggestions */}
            {aiAvailable && (suggestions.length > 0 || isLoadingSuggestions) && (
                <div className="mb-4 p-3 bg-emerald-deep/60 border border-gold-muted/20 rounded-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-gold-muted">
                            <Lightbulb className="w-4 h-4" />
                            <span className="text-[10px] uppercase tracking-wider font-bold">Suggestions</span>
                        </div>
                        <button
                            onClick={handleRefreshSuggestions}
                            disabled={isLoadingSuggestions}
                            className="p-1 text-gold-muted hover:text-gold transition-colors disabled:opacity-50"
                            title="Refresh suggestions"
                        >
                            <RefreshCw className={`w-3 h-3 ${isLoadingSuggestions ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    {isLoadingSuggestions ? (
                        <div className="flex items-center gap-2 text-xs text-ivory/50 italic">
                            <div className="w-3 h-3 border border-gold-muted/30 border-t-gold rounded-full animate-spin" />
                            Thinking...
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className={`px-3 py-1.5 text-[10px] border rounded-full transition-all cursor-pointer ${getSuggestionColor(suggestion.type)}`}
                                    title={`Click to auto-fill: "${suggestion.action}"`}
                                >
                                    {suggestion.text}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <textarea
                value={commandInput}
                onChange={handleCommandChange}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleProcessCommand();
                    }
                }}
                placeholder={`Tell me what needs to be done...\n\n"Add a dinner meeting with Sarah tomorrow"\n"Mark all shopping tasks as done"\n"What's overdue?"`}
                className="flex-grow w-full p-6 bg-emerald-deep/60 border border-gold-muted/20 focus:border-gold/60 focus:bg-emerald-deep/80 transition-all resize-none text-ivory placeholder:text-gray-600 focus:outline-none text-sm leading-loose font-serif italic rounded-sm scrollbar-thin"
                spellCheck={false}
            />

            <div className="mt-8 space-y-4">
                <button
                    onClick={handleProcessCommand}
                    disabled={isProcessing || !commandInput.trim() || !!pendingAction}
                    className={`w-full py-4 px-6 font-bold text-emerald-deep flex items-center justify-center gap-3 transition-all transform uppercase tracking-[0.2em] text-xs relative overflow-hidden
                    ${isProcessing || !commandInput.trim() || pendingAction
                            ? 'bg-gray-800/50 cursor-not-allowed text-gray-600'
                            : 'bg-gradient-to-r from-gold-muted via-gold to-gold-muted hover:shadow-glow-gold hover:scale-[1.02]'
                        }`}
                >
                    {isProcessing ? (
                        <>
                            <div className="w-4 h-4 border-2 border-emerald-deep/30 border-t-emerald-deep rounded-full animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            Execute
                        </>
                    )}
                </button>

                {/* Confirmation Preview */}
                {renderConfirmation()}

                {/* AI Response with Undo */}
                {aiResponse && (
                    <div className="p-4 bg-emerald-light/20 border border-gold-muted/20 text-xs text-ivory/90 font-sans leading-relaxed animate-in fade-in slide-in-from-top-2 rounded-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="font-bold mr-2 text-gold not-italic uppercase tracking-wider">Butler:</span>
                                <span className="italic">{aiResponse}</span>
                            </div>
                            {showUndo && undoState && (
                                <button
                                    onClick={handleUndo}
                                    className="ml-4 px-3 py-1 text-[10px] border border-gold-muted/50 text-gold-muted hover:text-gold hover:border-gold transition-all uppercase tracking-wider"
                                >
                                    Undo
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {error && (
                    <p className="text-crimson text-xs font-bold text-center mt-3 uppercase tracking-wider">
                        {error}
                    </p>
                )}

                {/* Keyboard shortcut hint */}
                <p className="text-center text-[10px] text-gray-600 uppercase tracking-wider">
                    Press Ctrl+Enter to execute
                </p>
            </div>
        </div>
    );
};
