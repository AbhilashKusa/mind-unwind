import React, { useState, useRef, useEffect } from 'react';
import { Task, Subtask, Comment, Priority } from '../types';
import { generateSubtasks, updateTaskWithAI } from '../services/gemini';
import { CloseIcon, SplitIcon, ChatIcon, SendIcon, SparklesIcon, CheckCircleIcon, UserIcon, BrainIcon, CalendarIcon, MessageSquareIcon, PlusIcon } from './Icons';

interface TaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedTask: Task) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, isOpen, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');
  const [commentInput, setCommentInput] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  
  // Subtask comment state
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null);
  const [subtaskCommentInput, setSubtaskCommentInput] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat whenever comments change or tab switches
  useEffect(() => {
    if (activeTab === 'chat' && chatEndRef.current) {
      setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [task.comments?.length, activeTab, isProcessingAI]);

  if (!isOpen) return null;

  const handleBreakdown = async () => {
    setIsGeneratingSubtasks(true);
    try {
      const newSubtasks = await generateSubtasks(task.title, task.description);
      onUpdate({
        ...task,
        subtasks: [...(task.subtasks || []), ...newSubtasks]
      });
    } catch (e) {
      console.error(e);
      alert("Failed to generate subtasks. Please try again.");
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const handleToggleSubtask = (subtaskId: string) => {
    const updatedSubtasks = (task.subtasks || []).map(st => 
      st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );
    onUpdate({ ...task, subtasks: updatedSubtasks });
  };

  const handleAddSubtaskComment = (e: React.FormEvent, subtaskId: string) => {
    e.preventDefault();
    if (!subtaskCommentInput.trim()) return;

    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      text: subtaskCommentInput,
      author: 'user',
      timestamp: Date.now()
    };

    const updatedSubtasks = (task.subtasks || []).map(st => 
        st.id === subtaskId 
            ? { ...st, comments: [...(st.comments || []), newComment] } 
            : st
    );
    
    onUpdate({ ...task, subtasks: updatedSubtasks });
    setSubtaskCommentInput('');
  };

  const handleSendComment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!commentInput.trim() || isProcessingAI) return;

    const userCommentText = commentInput;
    setCommentInput('');
    setIsProcessingAI(true);

    const userComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      text: userCommentText,
      author: 'user',
      timestamp: Date.now()
    };

    // Optimistic update
    const previousTaskState = { ...task };
    const updatedTaskOptimistic = {
        ...task,
        comments: [...(task.comments || []), userComment]
    };
    onUpdate(updatedTaskOptimistic);

    try {
      // Call AI to process the comment and update the task
      const finalUpdatedTask = await updateTaskWithAI(updatedTaskOptimistic, userCommentText);
      
      // Append a small AI confirmation as a comment if the structure changed significantly
      const aiResponseComment: Comment = {
        id: Math.random().toString(36).substr(2, 9),
        text: "I've updated the task details.",
        author: 'ai',
        timestamp: Date.now()
      };
      
      onUpdate({
          ...finalUpdatedTask,
          comments: [...(finalUpdatedTask.comments || []), aiResponseComment]
      });
    } catch (err) {
      console.error(err);
      // Revert on critical failure, or just show error
      onUpdate(previousTaskState); 
      alert("Unable to update task details. Connection might be unstable.");
    } finally {
        setIsProcessingAI(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-white/90 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-white border-4 border-black shadow-sharp flex flex-col h-[600px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b-2 border-black bg-white flex-shrink-0 relative">
          <div className="flex items-center gap-4 overflow-hidden">
             {/* Checkbox in Header */}
            <button
                onClick={() => onUpdate({ ...task, isCompleted: !task.isCompleted })}
                className={`w-6 h-6 border-2 flex items-center justify-center transition-all ${
                    task.isCompleted ? 'bg-black border-black text-white' : 'border-black hover:bg-gray-100'
                }`}
            >
                {task.isCompleted && <CheckCircleIcon className="w-4 h-4" />}
            </button>
             
             <div className="min-w-0">
                <h2 className={`text-xl font-bold truncate pr-4 ${task.isCompleted ? 'line-through text-gray-400' : 'text-black'}`}>
                    {task.title}
                </h2>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">
                    <span className="bg-gray-100 px-2 py-0.5">{task.category || 'OFFICE'}</span>
                    <span className={`${task.priority === Priority.High ? 'text-red-600' : ''}`}>{task.priority} PRIORITY</span>
                </div>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 transition-all flex-shrink-0"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs - Updated to match screenshot style */}
        <div className="flex border-b-4 border-black flex-shrink-0 bg-white relative z-10">
            <button 
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all relative ${
                    activeTab === 'details' ? 'text-black' : 'text-gray-400 hover:text-black'
                }`}
            >
                <div className="flex items-center justify-center gap-2 relative z-10">
                    <SplitIcon className="w-4 h-4" />
                    PLAN
                </div>
                {/* Blue Squiggly Underline */}
                {activeTab === 'details' && (
                     <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-20 h-3">
                         <svg width="80" height="12" viewBox="0 0 80 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                             <path d="M2 6C12 6 12 10 22 10C32 10 32 6 42 6C52 6 52 10 62 10C72 10 72 6 78 6" stroke="#8ba5ff" strokeWidth="3" strokeLinecap="round" />
                         </svg>
                     </div>
                )}
            </button>
            
            <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 relative
                    ${activeTab === 'chat' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black'}
                `}
            >
                <ChatIcon className="w-4 h-4" />
                REFINE
                {task.comments?.length > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold ${activeTab === 'chat' ? 'bg-white text-black' : 'bg-black text-white'}`}>
                        {task.comments.length}
                    </span>
                )}
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative bg-white flex flex-col">
            
            {activeTab === 'details' && (
                <div className="overflow-y-auto p-6 space-y-6 h-full custom-scrollbar">
                    
                    {/* Metadata Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50/50 p-4 border border-gray-100">
                        {/* Priority Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                Priority Level
                            </label>
                            <div className="flex bg-white border-2 border-gray-100 p-0.5">
                                {[Priority.High, Priority.Medium, Priority.Low].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => onUpdate({ ...task, priority: p })}
                                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase transition-all ${
                                            task.priority === p 
                                                ? p === Priority.High 
                                                    ? 'bg-red-600 text-white shadow-sm' 
                                                    : p === Priority.Medium 
                                                        ? 'bg-orange-400 text-white shadow-sm'
                                                        : 'bg-emerald-500 text-white shadow-sm'
                                                : 'text-gray-400 hover:text-black hover:bg-gray-50'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                Due Date
                            </label>
                            <div className="relative group">
                                <input 
                                    type="date"
                                    value={task.dueDate || ''}
                                    onChange={(e) => onUpdate({ ...task, dueDate: e.target.value })}
                                    className="w-full bg-white border-2 border-gray-100 text-xs font-bold p-2 outline-none focus:border-black uppercase tracking-wide transition-colors"
                                />
                                <CalendarIcon className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-black" />
                            </div>
                        </div>

                        {/* Category */}
                        <div className="col-span-1 sm:col-span-2 space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Category
                            </label>
                            <input 
                                type="text"
                                value={task.category || ''}
                                onChange={(e) => onUpdate({ ...task, category: e.target.value })}
                                placeholder="e.g. Work, Personal, Health..."
                                className="w-full bg-white border-2 border-gray-100 px-3 py-2 text-xs font-bold focus:border-black outline-none transition-colors placeholder:font-normal placeholder:text-gray-300"
                            />
                        </div>
                    </div>

                    {/* Description Input Area */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Description
                        </label>
                        <textarea
                            className="w-full min-h-[80px] text-sm font-medium text-black placeholder:text-gray-300 border-2 border-transparent focus:border-gray-100 p-2 -ml-2 rounded resize-none bg-transparent hover:bg-gray-50 focus:bg-white transition-all outline-none"
                            placeholder="Add detailed notes here..."
                            value={task.description || ''}
                            onChange={(e) => onUpdate({ ...task, description: e.target.value })}
                        />
                    </div>

                    {/* Subtasks */}
                    <div>
                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Checklist</h3>
                             <button 
                                onClick={handleBreakdown}
                                disabled={isGeneratingSubtasks}
                                className="px-3 py-1.5 bg-black text-white text-[10px] font-bold uppercase tracking-wide hover:bg-gray-800 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Auto-generate subtasks using AI"
                             >
                                <SparklesIcon className={`w-3 h-3 ${isGeneratingSubtasks ? 'animate-spin' : ''}`} />
                                {isGeneratingSubtasks ? 'Generating...' : 'Break Down'}
                             </button>
                        </div>
                        
                        <div className="space-y-3">
                            {task.subtasks?.map(st => (
                                <div key={st.id} className="group border border-gray-100 rounded-sm bg-white hover:border-gray-300 transition-colors">
                                    <div className="flex items-center gap-3 p-3">
                                        <button
                                            onClick={() => handleToggleSubtask(st.id)}
                                            className={`w-4 h-4 border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                                st.isCompleted ? 'bg-black border-black' : 'border-gray-300 group-hover:border-black'
                                            }`}
                                        >
                                            {st.isCompleted && <CheckCircleIcon className="w-2.5 h-2.5 text-white" />}
                                        </button>
                                        <input 
                                            value={st.title}
                                            onChange={(e) => {
                                                const updated = task.subtasks.map(s => s.id === st.id ? { ...s, title: e.target.value } : s);
                                                onUpdate({ ...task, subtasks: updated });
                                            }}
                                            className={`flex-1 bg-transparent border-none focus:ring-0 text-sm ${st.isCompleted ? 'text-gray-400 line-through' : 'text-black font-medium'}`}
                                        />
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => setExpandedSubtaskId(expandedSubtaskId === st.id ? null : st.id)}
                                                className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${st.comments?.length > 0 ? 'text-black' : 'text-gray-300 group-hover:text-gray-500'}`}
                                                title="Add comment to subtask"
                                            >
                                                <div className="relative">
                                                    <MessageSquareIcon className="w-3.5 h-3.5" />
                                                    {st.comments?.length > 0 && (
                                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                                                    )}
                                                </div>
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const filtered = task.subtasks.filter(s => s.id !== st.id);
                                                    onUpdate({ ...task, subtasks: filtered });
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                                            >
                                                <CloseIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Subtask Comments Area */}
                                    {expandedSubtaskId === st.id && (
                                        <div className="bg-gray-50 p-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-1">
                                            <div className="space-y-2 mb-3 max-h-32 overflow-y-auto custom-scrollbar">
                                                {st.comments?.length === 0 && (
                                                    <p className="text-[10px] text-gray-400 italic">No notes for this item yet.</p>
                                                )}
                                                {st.comments?.map(c => (
                                                    <div key={c.id} className="text-xs flex gap-2">
                                                        <span className="font-bold text-gray-500 text-[10px] uppercase min-w-[30px]">{c.author}</span>
                                                        <span className="text-black">{c.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <form onSubmit={(e) => handleAddSubtaskComment(e, st.id)} className="flex gap-2">
                                                <input 
                                                    className="flex-1 bg-white border border-gray-200 p-1.5 text-xs focus:border-black outline-none"
                                                    placeholder="Add note..."
                                                    value={subtaskCommentInput}
                                                    onChange={(e) => setSubtaskCommentInput(e.target.value)}
                                                    autoFocus
                                                />
                                                <button type="submit" disabled={!subtaskCommentInput.trim()} className="bg-black text-white px-2 py-1 text-xs font-bold uppercase disabled:opacity-50">
                                                    Add
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <button 
                                onClick={() => {
                                    const newSub: Subtask = { id: Math.random().toString(), title: '', isCompleted: false, comments: [] };
                                    onUpdate({ ...task, subtasks: [...(task.subtasks || []), newSub] });
                                }}
                                className="text-xs font-bold text-gray-400 hover:text-black mt-3 uppercase tracking-wide flex items-center gap-1"
                            >
                                <div className="border border-current rounded-sm p-0.5"><PlusIcon className="w-2.5 h-2.5" /></div>
                                Add item
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'chat' && (
                <div className="flex flex-col h-full bg-white relative">
                    {/* Chat History */}
                    <div className="flex-1 overflow-y-auto p-6 pb-24 custom-scrollbar space-y-6" ref={chatContainerRef}>
                        
                        {/* Initial system message */}
                        <div className="flex justify-center">
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
                                Task Created
                            </span>
                        </div>

                        {task.comments?.map((comment) => (
                            <div key={comment.id} className={`flex w-full ${comment.author === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {comment.author === 'user' ? (
                                    <div className="flex items-start gap-3 max-w-[85%]">
                                        {/* User Bubble - Black */}
                                        <div className="bg-black text-white p-4 text-sm font-bold shadow-sharp-sm leading-relaxed text-right relative">
                                            {comment.text}
                                            {/* Little triangle pointer maybe? Optional based on screenshot cleanliness */}
                                        </div>
                                        {/* User Icon - Square Border */}
                                        <div className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center flex-shrink-0 mt-1">
                                            <UserIcon className="w-4 h-4 text-black" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-3 max-w-[85%]">
                                        {/* AI Icon - Square Border */}
                                        <div className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center flex-shrink-0 mt-1">
                                            <BrainIcon className="w-4 h-4 text-black" />
                                        </div>
                                        {/* AI Bubble - White with border */}
                                        <div className="bg-white border-2 border-black text-black p-4 text-sm font-medium shadow-sharp-sm leading-relaxed">
                                            {comment.text}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {isProcessingAI && (
                            <div className="flex w-full justify-start animate-pulse">
                                <div className="flex items-start gap-3">
                                     <div className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center flex-shrink-0 mt-1">
                                            <BrainIcon className="w-4 h-4 text-black" />
                                    </div>
                                    <div className="bg-white border-2 border-gray-100 p-4 shadow-sm">
                                        <div className="flex gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Floating Input Area matching screenshot style */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t-2 border-gray-100">
                        <form onSubmit={handleSendComment} className="relative group">
                            <input
                                type="text"
                                value={commentInput}
                                onChange={(e) => setCommentInput(e.target.value)}
                                placeholder="Change task details..."
                                disabled={isProcessingAI}
                                className="w-full pl-4 pr-12 py-3 bg-gray-50 border-2 border-black focus:bg-white outline-none text-sm font-bold transition-all disabled:opacity-50 placeholder:text-gray-400 shadow-sharp-sm"
                            />
                            <button
                                type="submit"
                                disabled={!commentInput.trim() || isProcessingAI}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-black disabled:opacity-50 transition-colors"
                            >
                                <SendIcon className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;