import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { processUserCommand } from '../../services/gemini';
import { MagicIcon, SparklesIcon } from '../Icons';
import { Priority, Task } from '../../types';

export const CommandCenter: React.FC = () => {
    const { tasks, setTasks, addTask, updateTask, deleteTask } = useStore();
    const [commandInput, setCommandInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiResponse, setAiResponse] = useState<string | null>(null);

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const handleCommandChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCommandInput(e.target.value);
        if (error) setError(null);
        if (aiResponse) setAiResponse(null);
    };

    const handleProcessCommand = async () => {
        if (!commandInput.trim()) return;

        setIsProcessing(true);
        setError(null);
        setAiResponse(null);

        try {
            const response = await processUserCommand(commandInput, tasks);

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
            // We need to fetch the latest state or just reuse `tasks` from store (closure might be stale if store serves snapshot)
            // Ideally store actions should handle this logic, but for now we reproduce the logic here adapting to store actions.
            // Since we are iterating, we can validly use the 'tasks' from the render scope as the base *before* the additions/deletions? 
            // Actually, `processUserCommand` was based on `tasks` passed in.
            // For updates, we should probably call updateTask for each.

            for (const update of response.updated) {
                const existingTask = tasks.find(t => t.id === update.id);
                if (existingTask) {
                    const updatedTask = { ...existingTask, ...update.updates };
                    await updateTask(updatedTask);
                }
            }

            setAiResponse(response.aiResponse);
            setCommandInput('');
            setTimeout(() => setAiResponse(null), 5000);

        } catch (err) {
            setError("I couldn't quite catch that. Try rephrasing.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-emerald-deep/40 backdrop-blur-xl p-8 border border-gold-muted/20 flex flex-col h-[600px] lg:h-[calc(100vh-160px)] sticky top-28 rounded-sm shadow-glow-gold transition-all hover:border-gold-muted/40 group">
            <div className="mb-8 pb-6 border-b border-gold-muted/10 flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-serif text-gold flex items-center gap-3">
                        Command Center
                    </h2>
                    <p className="text-[10px] font-sans font-bold text-gray-500 mt-2 uppercase tracking-[0.25em]">
                        Your Digital Butler • Gemini 3.0 Pro
                    </p>
                </div>
                <div className="p-2 border border-gold/30 rounded-full bg-gold/5 text-gold animate-pulse-slow">
                    <MagicIcon className="w-5 h-5" />
                </div>
            </div>

            <textarea
                value={commandInput}
                onChange={handleCommandChange}
                placeholder={`Tell me what needs to be done...\n\n"Add a dinner meeting with Sarah"\n"Reschedule tomorrow's tasks for Monday"`}
                className="flex-grow w-full p-6 bg-emerald-deep/60 border border-gold-muted/20 focus:border-gold/60 focus:bg-emerald-deep/80 transition-all resize-none text-ivory placeholder:text-gray-600 focus:outline-none text-sm leading-loose font-serif italic rounded-sm scrollbar-thin"
                spellCheck={false}
            />

            <div className="mt-8 space-y-4">
                <button
                    onClick={handleProcessCommand}
                    disabled={isProcessing || !commandInput.trim()}
                    className={`w-full py-4 px-6 font-bold text-emerald-deep flex items-center justify-center gap-3 transition-all transform uppercase tracking-[0.2em] text-xs relative overflow-hidden
                    ${isProcessing || !commandInput.trim()
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
                            <SparklesIcon className="w-4 h-4" />
                            Execute
                        </>
                    )}
                </button>

                {aiResponse && (
                    <div className="p-4 bg-emerald-light/20 border border-gold-muted/20 text-xs text-ivory/90 font-sans leading-relaxed animate-in fade-in slide-in-from-top-2 rounded-sm italic">
                        <span className="font-bold mr-2 text-gold not-italic uppercase tracking-wider">Butler:</span>
                        {aiResponse}
                    </div>
                )}
                {error && (
                    <p className="text-crimson text-xs font-bold text-center mt-3 uppercase tracking-wider">
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
};
