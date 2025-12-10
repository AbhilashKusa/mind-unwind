import React, { useState } from 'react';
import { GeneratedTaskData, Priority } from '../types';
import { brainstormIdeas } from '../services/gemini';
import { CloseIcon, LightbulbIcon, SparklesIcon, CheckCircleIcon, PlusIcon } from './Icons';

interface BrainstormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddTasks: (tasks: GeneratedTaskData[]) => void;
}

const BrainstormModal: React.FC<BrainstormModalProps> = ({ isOpen, onClose, onAddTasks }) => {
    const [goal, setGoal] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [generatedIdeas, setGeneratedIdeas] = useState<GeneratedTaskData[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

    // Instead of returning null when !isOpen, we hide it with CSS to persist state
    // if the user accidentally closes the modal.
    if (!isOpen) {
        return <div className="hidden" />;
    }

    const handleBrainstorm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!goal.trim()) return;

        setIsProcessing(true);
        setGeneratedIdeas([]);
        setSelectedIndices(new Set());

        try {
            const ideas = await brainstormIdeas(goal);
            setGeneratedIdeas(ideas);
            // Select all by default
            const allIndices = new Set(ideas.map((_, i) => i));
            setSelectedIndices(allIndices);
        } catch (error) {
            console.error(error);
            alert("Brainstorming failed. Try a different prompt.");
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleSelection = (index: number) => {
        const newSelection = new Set(selectedIndices);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        setSelectedIndices(newSelection);
    };

    const handleConfirm = () => {
        const tasksToAdd = generatedIdeas.filter((_, i) => selectedIndices.has(i));
        onAddTasks(tasksToAdd);
        onClose();
        // Reset state after successful add
        setGoal('');
        setGeneratedIdeas([]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div
                className="absolute inset-0 bg-emerald-dark/90 backdrop-blur-md"
                onClick={onClose}
            />

            <div className="relative w-full max-w-2xl bg-emerald-deep border border-gold/30 shadow-glow-gold flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gold-muted/10 bg-emerald-deep">
                    <div className="flex items-center gap-4">
                        <div className="bg-gold/10 border border-gold/30 p-2 text-gold">
                            <LightbulbIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif text-ivory leading-none">
                                Brainstorm
                            </h2>
                            <span className="text-[10px] font-bold text-gold-muted/70 uppercase tracking-[0.2em]">
                                Idea Generator
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gold-muted hover:text-gold transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-emerald-deep relative">
                    {/* Ambient background accent */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gold/5 rounded-full blur-[80px] pointer-events-none"></div>

                    {generatedIdeas.length === 0 ? (
                        <div className="h-full flex flex-col justify-center relative z-10">
                            <form onSubmit={handleBrainstorm} className="space-y-6">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gold-muted text-center mb-4">
                                    What do you wish to achieve?
                                </label>
                                <textarea
                                    autoFocus
                                    value={goal}
                                    onChange={(e) => setGoal(e.target.value)}
                                    placeholder="e.g., Plan a surprise party for Mom, Launch a podcast, Organize the garage..."
                                    className="w-full p-6 text-xl font-serif text-ivory border-b border-gold-muted/30 focus:border-gold outline-none resize-none placeholder:text-gray-600 bg-transparent text-center leading-relaxed"
                                    rows={3}
                                />
                                <button
                                    type="submit"
                                    disabled={!goal.trim() || isProcessing}
                                    className={`w-full py-5 font-bold uppercase tracking-[0.25em] text-xs transition-all flex items-center justify-center gap-3
                                ${!goal.trim() || isProcessing ? 'bg-emerald-light/30 text-gray-500 cursor-not-allowed border border-transparent' : 'bg-gradient-to-r from-gold-muted via-gold to-gold-muted text-emerald-deep hover:shadow-glow-gold hover:scale-[1.01]'}
                            `}
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-emerald-deep/30 border-t-emerald-deep rounded-full animate-spin" />
                                            Divining...
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-5 h-5 animate-pulse-slow" />
                                            Ignite Ideas
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="space-y-6 relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-serif text-xl text-ivory">Generated Ideas</h3>
                                <button
                                    onClick={() => setGeneratedIdeas([])}
                                    className="text-[10px] font-bold text-gold-muted hover:text-crimson uppercase tracking-widest transition-colors"
                                >
                                    Start Over
                                </button>
                            </div>

                            <div className="space-y-3">
                                {generatedIdeas.map((idea, index) => (
                                    <div
                                        key={index}
                                        onClick={() => toggleSelection(index)}
                                        className={`p-5 border transition-all duration-300 cursor-pointer flex items-start gap-4 group rounded-sm
                                    ${selectedIndices.has(index)
                                                ? 'bg-emerald-light/30 border-gold shadow-glow-sm'
                                                : 'bg-transparent border-gold-muted/10 hover:border-gold/30 hover:bg-white/5'}
                                `}
                                    >
                                        <div className={`w-5 h-5 rounded-full border mt-0.5 flex-shrink-0 flex items-center justify-center transition-colors
                                    ${selectedIndices.has(index) ? 'bg-gold border-gold text-emerald-deep' : 'border-gold-muted/30 bg-transparent group-hover:border-gold/50'}
                                `}>
                                            {selectedIndices.has(index) && <CheckCircleIcon className="w-3.5 h-3.5" />}
                                        </div>
                                        <div>
                                            <h4 className={`font-serif text-lg ${selectedIndices.has(index) ? 'text-gold' : 'text-ivory'}`}>{idea.title}</h4>
                                            <p className="text-xs text-ivory/60 mt-2 font-sans leading-relaxed">{idea.description}</p>
                                            <div className="mt-3 flex gap-2">
                                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 border ${selectedIndices.has(index) ? 'border-gold/30 text-gold' : 'border-white/10 text-gray-500'}`}>{idea.priority}</span>
                                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 border ${selectedIndices.has(index) ? 'border-gold/30 text-gold' : 'border-white/10 text-gray-500'}`}>{idea.category}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {generatedIdeas.length > 0 && (
                    <div className="p-6 border-t border-gold-muted/10 bg-emerald-deep flex justify-end gap-6 relative z-10">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 font-bold uppercase tracking-widest text-xs text-gold-muted hover:text-ivory transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selectedIndices.size === 0}
                            className="px-8 py-3 bg-gold text-emerald-deep font-bold border border-gold shadow-glow-sm hover:shadow-glow-gold hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:transform-none uppercase tracking-widest text-xs flex items-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Accept {selectedIndices.size} Tasks
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default BrainstormModal;