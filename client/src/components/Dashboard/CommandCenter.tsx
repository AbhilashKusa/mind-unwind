
import React, { useState, useCallback, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { processUserCommand, addToCommandHistory, generateProactiveSuggestions, ProactiveSuggestion, isAIAvailable, getAIError } from '../../services/gemini';
import { Sparkles, Trash2, Check, Lightbulb, Zap, RefreshCw, AlertTriangle } from 'lucide-react';
import { Priority, Task, AICommandResponse } from '../../types';
import { NeuralOrb } from './NeuralOrb';

// Check AI availability on load
const aiAvailable = isAIAvailable();
const aiError = getAIError();

interface CommandCenterProps {
    onOpenBrainstorm?: () => void;
}

interface PendingAction {
    response: AICommandResponse;
    originalCommand: string;
}

interface UndoState {
    tasks: Task[];
    description: string;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ onOpenBrainstorm }) => {
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
                setError("AI not configured. Check .env");
            } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
                setError("Connection issue.");
            } else {
                console.error("Command Center Error:", errorMessage);
                setError("AI service unavailable.");
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

    return (
        <div className="bg-emerald-deep panel-mechanical p-6 flex flex-col h-[600px] lg:h-[calc(100vh-160px)] sticky top-28 rounded-sm shadow-xl transition-all group">

            {/* MECHANICAL HEADER */}
            <div className="mb-6 pb-4 border-b-2 border-dashed border-gold/20 flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-serif text-gold flex items-center gap-3 uppercase tracking-tighter">
                        Command Deck
                    </h2>
                    <p className="text-[10px] font-bold text-gold-muted mt-1 uppercase tracking-[0.3em] flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        Gemini 2.5 Flash // Online
                    </p>
                </div>
                {/* Replaced Icon with NeuralOrb */}
                <NeuralOrb isProcessing={isProcessing} />
            </div>

            {/* AI WARNING */}
            {!aiAvailable && (
                <div className="mb-4 p-3 bg-crimson/10 border-l-4 border-crimson">
                    <p className="text-crimson text-xs font-bold uppercase tracking-wider">
                        ⚠️ SYSTEM OFFLINE: API KEY MISSING
                    </p>
                </div>
            )}

            {/* HEADS UP DISPLAY (HUD) - Replaces tag cloud */}
            {aiAvailable && suggestions.length > 0 && !pendingAction && (
                <div className="mb-6 relative group/hud">
                    <div className="absolute -top-3 left-3 bg-emerald-deep px-2 text-[10px] font-bold text-gold/60 uppercase tracking-widest border border-gold/20 rounded z-10">
                        Intel Feed
                    </div>
                    <div className="border border-gold/20 p-4 pt-5 bg-black/20 rounded-sm">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1 w-full">
                                {suggestions.slice(0, 2).map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSuggestionClick(s)}
                                        className="w-full text-left text-xs text-gold-muted hover:text-gold hover:bg-gold/10 p-1.5 rounded transition-all flex items-center gap-2 group/item"
                                    >
                                        <Lightbulb className="w-3 h-3 text-gold/50 group-hover/item:text-gold" />
                                        <span className="truncate">"{s.text}"</span>
                                    </button>
                                ))}
                            </div>
                            <button onClick={handleRefreshSuggestions} className="text-gold-muted hover:text-gold p-1">
                                <RefreshCw className={`w-3 h-3 ${isLoadingSuggestions ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TERMINAL INPUT */}
            <div className="relative flex-grow flex flex-col group/input">
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-gold/50"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-gold/50"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-gold/50"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-gold/50"></div>

                <textarea
                    value={commandInput}
                    onChange={handleCommandChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            handleProcessCommand();
                        }
                    }}
                    placeholder={"> AWAITING ORDERS...\n> \"Schedule a meeting with Sarah\"\n> \"What needs attention?\""}
                    className="flex-grow w-full p-4 bg-black/50 border border-gold/10 focus:border-gold/50 transition-all resize-none text-ivory placeholder:text-gold-muted/30 focus:outline-none text-sm font-mono leading-relaxed scrollbar-thin uppercase tracking-wide"
                    spellCheck={false}
                />
            </div>

            {/* MECHANICAL CONTROLS */}
            <div className="mt-6 grid grid-cols-2 gap-4">
                {/* PRIMARY ACTION */}
                <button
                    onClick={handleProcessCommand}
                    disabled={isProcessing || !commandInput.trim() || !!pendingAction}
                    className={`btn-mechanical py-4 text-xs tracking-[0.2em] relative group overflow-hidden
                    ${isProcessing || !commandInput.trim() || pendingAction
                            ? 'opacity-50 grayscale'
                            : 'hover:text-amber-500' // Gold highlight on hover
                        }`}
                >
                    {isProcessing ? (
                        <span className="animate-pulse">PROCESSING...</span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            EXECUTE
                        </span>
                    )}
                </button>

                {/* BRAINSTORM ACTION */}
                <button
                    onClick={onOpenBrainstorm}
                    className="btn-mechanical py-4 text-xs tracking-[0.2em] text-emerald-600 hover:text-emerald-500 border-emerald-600/50 shadow-[4px_4px_0px_0px_rgba(5,150,105,0.4)] hover:shadow-[5px_5px_0px_0px_rgba(5,150,105,0.4)] active:shadow-[2px_2px_0px_0px_rgba(5,150,105,0.4)]"
                >
                    <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        IGNITE IDEA
                    </span>
                </button>
            </div>

            {/* CONFIRMATION PANEL */}
            {pendingAction && (
                <div className="mt-4 p-4 bg-crimson/10 border-2 border-crimson/50 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-crimson font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Confirm Usage
                    </h4>
                    <div className="space-y-1 text-[10px] text-ivory/80 mb-4 font-mono">
                        <div className="flex justify-between"><span>ADDITIONS:</span> <span>{pendingAction.response.added.length}</span></div>
                        <div className="flex justify-between"><span>UPDATES:</span> <span>{pendingAction.response.updated.length}</span></div>
                        <div className="flex justify-between text-crimson"><span>DELETIONS:</span> <span>{pendingAction.response.deletedIds.length}</span></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleConfirmAction} className="flex-1 bg-crimson text-white text-[10px] font-bold py-2 hover:bg-crimson/80 uppercase">Confirm</button>
                        <button onClick={handleCancelAction} className="flex-1 border border-crimson/30 text-crimson text-[10px] font-bold py-2 hover:bg-crimson/10 uppercase">Abort</button>
                    </div>
                </div>
            )}

            {/* AI TERMINAL OUTPUT */}
            {aiResponse && !pendingAction && (
                <div className="mt-4 p-4 bg-emerald-light/10 border-l-2 border-gold text-xs text-ivory/90 font-mono animate-in fade-in">
                    <div className="flex justify-between items-start">
                        <span className="uppercase text-gold mr-2">&gt; RESPONSE:</span>
                        {showUndo && undoState && (
                            <button onClick={handleUndo} className="text-[9px] text-gold-muted hover:text-gold underline uppercase">UNDO LAST</button>
                        )}
                    </div>
                    <div className="mt-1 leading-relaxed opacity-80">{aiResponse}</div>
                </div>
            )}

            {/* ERROR DISPLAY */}
            {error && (
                <div className="mt-3 text-center">
                    <p className="text-crimson text-[10px] font-mono uppercase bg-crimson/10 inline-block px-2 py-1">{error}</p>
                </div>
            )}

            <p className="text-center text-[9px] text-gold-muted/30 uppercase tracking-widest mt-4">
                CTRL + ENTER TO EXECUTE
            </p>
        </div>
    );
};
