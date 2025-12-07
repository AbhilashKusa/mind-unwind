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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-white/90 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-white border-4 border-black shadow-sharp flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b-2 border-black bg-white">
          <div className="flex items-center gap-3">
             <div className="bg-black text-white p-2">
                 <LightbulbIcon className="w-5 h-5" />
             </div>
             <div>
                <h2 className="text-xl font-bold uppercase tracking-wide text-black leading-none">
                    Brainstorm
                </h2>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Idea Generator
                </span>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 transition-all">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {generatedIdeas.length === 0 ? (
                <div className="h-full flex flex-col justify-center">
                    <form onSubmit={handleBrainstorm} className="space-y-4">
                        <label className="block text-sm font-bold uppercase tracking-widest text-gray-500">
                            What's your goal?
                        </label>
                        <textarea
                            autoFocus
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            placeholder="e.g., Plan a surprise party for Mom, Launch a podcast, Organize the garage..."
                            className="w-full p-6 text-xl font-bold border-2 border-black focus:outline-none focus:shadow-sharp resize-none placeholder:text-gray-300 placeholder:font-normal bg-white"
                            rows={3}
                        />
                        <button
                            type="submit"
                            disabled={!goal.trim() || isProcessing}
                            className={`w-full py-4 text-white font-bold uppercase tracking-widest border-2 border-black transition-all flex items-center justify-center gap-2
                                ${!goal.trim() || isProcessing ? 'bg-gray-300 border-gray-300 cursor-not-allowed' : 'bg-black shadow-sharp hover:shadow-sharp-hover hover:-translate-y-1'}
                            `}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Thinking...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-5 h-5" />
                                    Ignite Ideas
                                </>
                            )}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">Generated Ideas</h3>
                        <button 
                            onClick={() => setGeneratedIdeas([])}
                            className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-wide"
                        >
                            Start Over
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {generatedIdeas.map((idea, index) => (
                            <div 
                                key={index}
                                onClick={() => toggleSelection(index)}
                                className={`p-4 border-2 transition-all cursor-pointer flex items-start gap-3 group
                                    ${selectedIndices.has(index) 
                                        ? 'bg-white border-black shadow-sharp-sm' 
                                        : 'bg-gray-100 border-transparent opacity-60 hover:opacity-100'}
                                `}
                            >
                                <div className={`w-5 h-5 border-2 mt-0.5 flex-shrink-0 flex items-center justify-center transition-colors
                                    ${selectedIndices.has(index) ? 'bg-black border-black text-white' : 'border-gray-400 bg-transparent'}
                                `}>
                                    {selectedIndices.has(index) && <CheckCircleIcon className="w-3.5 h-3.5" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">{idea.title}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{idea.description}</p>
                                    <div className="mt-2 flex gap-2">
                                        <span className="text-[10px] font-bold uppercase bg-gray-200 px-1.5 py-0.5">{idea.priority}</span>
                                        <span className="text-[10px] font-bold uppercase border border-gray-300 px-1.5 py-0.5">{idea.category}</span>
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
            <div className="p-5 border-t-2 border-black bg-white flex justify-end gap-4">
                 <button 
                    onClick={onClose}
                    className="px-6 py-3 font-bold uppercase tracking-widest text-gray-500 hover:text-black"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleConfirm}
                    disabled={selectedIndices.size === 0}
                    className="px-8 py-3 bg-black text-white font-bold border-2 border-black shadow-sharp hover:shadow-sharp-hover hover:-translate-y-1 transition-all disabled:opacity-50 disabled:shadow-none disabled:transform-none uppercase tracking-widest flex items-center gap-2"
                >
                    <PlusIcon className="w-4 h-4" />
                    Add {selectedIndices.size} Tasks
                </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default BrainstormModal;