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
        <div className="bg-white p-6 border-2 border-black shadow-sharp flex flex-col h-[600px] lg:h-[calc(100vh-160px)] sticky top-28">
            <div className="mb-6 pb-4 border-b-2 border-gray-100 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-black flex items-center gap-2 uppercase tracking-wide">
                        Command Center
                    </h2>
                    <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-widest">
                        AI Context Aware • Gemini 3.0 Pro
                    </p>
                </div>
                <div className="p-2 bg-black text-white">
                    <MagicIcon className="w-5 h-5" />
                </div>
            </div>

            <textarea
                value={commandInput}
                onChange={handleCommandChange}
                placeholder={`Type commands like:\n"Add a meeting with Joe tomorrow"\n"Move all work tasks to Friday"\n"Delete the grocery task"`}
                className="flex-grow w-full p-4 bg-gray-50 border-2 border-gray-200 focus:border-black focus:bg-white transition-all resize-none text-black placeholder:text-gray-400 focus:outline-none text-sm leading-relaxed font-mono"
                spellCheck={false}
            />

            <div className="mt-6 space-y-3">
                <button
                    onClick={handleProcessCommand}
                    disabled={isProcessing || !commandInput.trim()}
                    className={`w-full py-4 px-6 font-bold text-white border-2 border-black flex items-center justify-center gap-3 transition-all transform active:translate-y-1 active:shadow-none uppercase tracking-widest
                    ${isProcessing || !commandInput.trim()
                            ? 'bg-gray-300 border-gray-300 cursor-not-allowed text-gray-500'
                            : 'bg-black shadow-sharp hover:shadow-sharp-hover hover:-translate-y-0.5'
                        }`}
                >
                    {isProcessing ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-4 h-4" />
                            Execute Command
                        </>
                    )}
                </button>

                {aiResponse && (
                    <div className="p-3 bg-gray-50 border-2 border-black text-xs font-mono animate-in fade-in slide-in-from-top-2">
                        <span className="font-bold mr-2">AI:</span>
                        {aiResponse}
                    </div>
                )}
                {error && (
                    <p className="text-red-600 text-xs font-bold text-center mt-3 uppercase">
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
};
