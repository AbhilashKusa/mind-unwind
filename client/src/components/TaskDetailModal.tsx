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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div
                className="absolute inset-0 bg-emerald-dark/90 backdrop-blur-md"
                onClick={onClose}
            />

            <div className="relative w-full max-w-2xl bg-emerald-deep border border-gold/30 shadow-glow-gold flex flex-col h-[600px] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent opacity-30"></div>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gold-muted/10 bg-emerald-deep relative z-10">
                    <div className="flex items-center gap-5 overflow-hidden w-full">
                        {/* Checkbox in Header */}
                        <button
                            onClick={() => onUpdate({ ...task, isCompleted: !task.isCompleted })}
                            className={`w-7 h-7 rounded-sm border flex items-center justify-center transition-all duration-300 ${task.isCompleted ? 'bg-gold border-gold text-emerald-deep shadow-glow-sm' : 'border-gold/30 hover:border-gold hover:bg-emerald-light/20'
                                }`}
                        >
                            {task.isCompleted && <CheckCircleIcon className="w-5 h-5" />}
                        </button>

                        <div className="min-w-0 flex-1">
                            <input
                                value={task.title}
                                onChange={(e) => onUpdate({ ...task, title: e.target.value })}
                                className={`text-2xl font-serif text-ivory bg-transparent border-none focus:ring-0 w-full p-0 leading-tight placeholder:text-gold-muted/30 focus:outline-none ${task.isCompleted ? 'line-through text-gold-muted opacity-60' : ''}`}
                            />
                            <div className="flex items-center gap-3 text-[10px] font-sans font-bold uppercase tracking-widest text-gold-muted mt-2">
                                <span className="bg-emerald-light/40 px-2 py-1 border border-white/5 text-ivory/70">{task.category || 'GENERAL'}</span>
                                <span className={`${task.priority === Priority.High ? 'text-crimson drop-shadow-sm' :
                                    task.priority === Priority.Medium ? 'text-gold drop-shadow-sm' :
                                        task.priority === Priority.Low ? 'text-emerald-400' : ''
                                    }`}>{task.priority} PRIORITY</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gold-muted hover:text-gold transition-colors flex-shrink-0"
                    >
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gold-muted/10 flex-shrink-0 bg-emerald-deep relative z-10">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative group ${activeTab === 'details' ? 'text-gold' : 'text-gold-muted/50 hover:text-ivory'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2 relative z-10">
                            <SplitIcon className="w-3.5 h-3.5" />
                            Structure
                        </div>
                        {activeTab === 'details' && (
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-gold to-transparent opacity-70"></div>
                        )}
                        <div className="absolute inset-0 bg-gold/5 scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-300"></div>
                    </button>

                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 relative group
                    ${activeTab === 'chat' ? 'text-gold' : 'text-gold-muted/50 hover:text-ivory'}
                `}
                    >
                        <ChatIcon className="w-3.5 h-3.5" />
                        Refine
                        {task.comments?.length > 0 && (
                            <span className={`ml-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${activeTab === 'chat' ? 'bg-gold text-emerald-deep' : 'bg-emerald-light text-gold-muted'}`}>
                                {task.comments.length}
                            </span>
                        )}
                        {activeTab === 'chat' && (
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-gold to-transparent opacity-70"></div>
                        )}
                        <div className="absolute inset-0 bg-gold/5 scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-300"></div>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative bg-emerald-deep flex flex-col">

                    {activeTab === 'details' && (
                        <div className="overflow-y-auto p-6 space-y-8 h-full custom-scrollbar">

                            {/* Metadata Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 border border-gold-muted/10 bg-emerald-light/10 relative">
                                {/* Corner Accents */}
                                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gold/20"></div>
                                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gold/20"></div>
                                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gold/20"></div>
                                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gold/20"></div>

                                {/* Priority Selection */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gold-muted uppercase tracking-widest flex items-center gap-1">
                                        Priority Level
                                    </label>
                                    <div className="flex gap-2">
                                        {[Priority.High, Priority.Medium, Priority.Low].map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => onUpdate({ ...task, priority: p })}
                                                className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-widest transition-all border ${task.priority === p
                                                    ? p === Priority.High
                                                        ? 'bg-crimson/20 border-crimson text-crimson shadow-glow-sm'
                                                        : p === Priority.Medium
                                                            ? 'bg-gold/20 border-gold text-gold shadow-glow-sm'
                                                            : 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-glow-sm'
                                                    : 'border-white/10 text-gray-500 hover:border-gold/30 hover:text-ivory'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Due Date */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gold-muted uppercase tracking-widest flex items-center gap-1">
                                        Due Date
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="date"
                                            value={task.dueDate || ''}
                                            onChange={(e) => onUpdate({ ...task, dueDate: e.target.value })}
                                            className="w-full bg-emerald-deep border-b border-gold-muted/30 text-xs font-sans text-ivory py-2 px-1 focus:border-gold outline-none uppercase tracking-wide transition-colors"
                                        />
                                        <CalendarIcon className="w-3.5 h-3.5 absolute right-1 top-1/2 -translate-y-1/2 text-gold-muted pointer-events-none group-hover:text-gold" />
                                    </div>
                                </div>

                                {/* Category */}
                                <div className="col-span-1 sm:col-span-2 space-y-3">
                                    <label className="text-[10px] font-bold text-gold-muted uppercase tracking-widest">
                                        Category
                                    </label>
                                    <input
                                        type="text"
                                        value={task.category || ''}
                                        onChange={(e) => onUpdate({ ...task, category: e.target.value })}
                                        placeholder="e.g. Work, Personal, Health..."
                                        className="w-full bg-emerald-deep border-b border-gold-muted/30 py-2 px-1 text-xs font-sans text-ivory focus:border-gold outline-none transition-colors placeholder:text-gray-600"
                                    />
                                </div>
                            </div>

                            {/* Description Input Area */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gold-muted uppercase tracking-widest">
                                    Description
                                </label>
                                <textarea
                                    className="w-full min-h-[100px] text-sm font-sans leading-relaxed text-ivory/90 placeholder:text-gray-600 bg-emerald-light/10 border border-transparent focus:border-gold/20 p-4 rounded-sm resize-none transition-all outline-none"
                                    placeholder="Add detailed notes here..."
                                    value={task.description || ''}
                                    onChange={(e) => onUpdate({ ...task, description: e.target.value })}
                                />
                            </div>

                            {/* Subtasks */}
                            <div>
                                <div className="flex items-center justify-between mb-4 border-b border-gold-muted/10 pb-2">
                                    <h3 className="text-[10px] font-bold text-gold-muted uppercase tracking-widest">Checklist</h3>
                                    <button
                                        onClick={handleBreakdown}
                                        disabled={isGeneratingSubtasks}
                                        className="px-3 py-1.5 border border-gold/20 bg-gold/5 text-gold text-[9px] font-bold uppercase tracking-widest hover:bg-gold hover:text-emerald-deep transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Auto-generate subtasks using AI"
                                    >
                                        <SparklesIcon className={`w-3 h-3 ${isGeneratingSubtasks ? 'animate-spin' : ''}`} />
                                        {isGeneratingSubtasks ? 'Divining...' : 'Break Down'}
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {task.subtasks?.map(st => (
                                        <div key={st.id} className="group border border-white/5 rounded-sm bg-emerald-light/10 hover:border-gold/30 transition-all duration-300">
                                            <div className="flex items-center gap-3 p-3">
                                                <button
                                                    onClick={() => handleToggleSubtask(st.id)}
                                                    className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center transition-all ${st.isCompleted ? 'bg-gold border-gold' : 'border-gold-muted/50 group-hover:border-gold'
                                                        }`}
                                                >
                                                    {st.isCompleted && <CheckCircleIcon className="w-2.5 h-2.5 text-emerald-deep" />}
                                                </button>
                                                <input
                                                    value={st.title}
                                                    onChange={(e) => {
                                                        const updated = task.subtasks.map(s => s.id === st.id ? { ...s, title: e.target.value } : s);
                                                        onUpdate({ ...task, subtasks: updated });
                                                    }}
                                                    className={`flex-1 bg-transparent border-none focus:ring-0 text-sm font-sans ${st.isCompleted ? 'text-gray-500 line-through' : 'text-ivory'}`}
                                                />
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setExpandedSubtaskId(expandedSubtaskId === st.id ? null : st.id)}
                                                        className={`p-1.5 rounded hover:bg-white/5 transition-colors ${st.comments?.length > 0 ? 'text-gold' : 'text-gray-600 group-hover:text-gold-muted'}`}
                                                        title="Add comment to subtask"
                                                    >
                                                        <div className="relative">
                                                            <MessageSquareIcon className="w-3.5 h-3.5" />
                                                            {st.comments?.length > 0 && (
                                                                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-crimson rounded-full" />
                                                            )}
                                                        </div>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const filtered = task.subtasks.filter(s => s.id !== st.id);
                                                            onUpdate({ ...task, subtasks: filtered });
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-crimson transition-all"
                                                    >
                                                        <CloseIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Subtask Comments Area */}
                                            {expandedSubtaskId === st.id && (
                                                <div className="bg-emerald-dark/30 p-3 border-t border-white/5 animate-in fade-in slide-in-from-top-1">
                                                    <div className="space-y-2 mb-3 max-h-32 overflow-y-auto custom-scrollbar">
                                                        {st.comments?.length === 0 && (
                                                            <p className="text-[10px] text-gray-500 italic">No notes for this item yet.</p>
                                                        )}
                                                        {st.comments?.map(c => (
                                                            <div key={c.id} className="text-xs flex gap-2">
                                                                <span className="font-bold text-gold-muted text-[10px] uppercase min-w-[30px]">{c.author}</span>
                                                                <span className="text-ivory/80">{c.text}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <form onSubmit={(e) => handleAddSubtaskComment(e, st.id)} className="flex gap-2">
                                                        <input
                                                            className="flex-1 bg-emerald-deep border-b border-gold-muted/30 py-1 text-xs text-ivory focus:border-gold outline-none placeholder:text-gray-600"
                                                            placeholder="Add note..."
                                                            value={subtaskCommentInput}
                                                            onChange={(e) => setSubtaskCommentInput(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <button type="submit" disabled={!subtaskCommentInput.trim()} className="text-gold text-[10px] font-bold uppercase disabled:opacity-30 hover:underline">
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
                                        className="text-[10px] font-bold text-gold-muted hover:text-gold mt-4 uppercase tracking-widest flex items-center gap-2 transition-colors"
                                    >
                                        <div className="border border-current rounded-full p-0.5"><PlusIcon className="w-2.5 h-2.5" /></div>
                                        Add Check Item
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'chat' && (
                        <div className="flex flex-col h-full bg-emerald-deep relative">
                            {/* Chat History */}
                            <div className="flex-1 overflow-y-auto p-6 pb-24 custom-scrollbar space-y-6" ref={chatContainerRef}>

                                {/* Initial system message */}
                                <div className="flex justify-center">
                                    <span className="text-[9px] font-bold text-gold-muted/50 uppercase tracking-[0.2em] px-3 py-1 border border-white/5 rounded-full">
                                        Task Inception
                                    </span>
                                </div>

                                {task.comments?.map((comment) => (
                                    <div key={comment.id} className={`flex w-full ${comment.author === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {comment.author === 'user' ? (
                                            <div className="flex items-start gap-3 max-w-[85%]">
                                                {/* User Bubble */}
                                                <div className="bg-gold/10 border border-gold/20 text-ivory p-4 text-sm font-sans shadow-glow-sm leading-relaxed text-right relative rounded-tl-xl rounded-bl-xl rounded-br-xl">
                                                    {comment.text}
                                                </div>
                                                {/* User Icon */}
                                                <div className="w-8 h-8 rounded-full border border-gold/30 bg-emerald-deep flex items-center justify-center flex-shrink-0 mt-1 shadow-glow-gold">
                                                    <UserIcon className="w-4 h-4 text-gold" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-3 max-w-[85%]">
                                                {/* AI Icon */}
                                                <div className="w-8 h-8 rounded-full border border-emerald-light bg-emerald-dark flex items-center justify-center flex-shrink-0 mt-1">
                                                    <BrainIcon className="w-4 h-4 text-emerald-400" />
                                                </div>
                                                {/* AI Bubble */}
                                                <div className="bg-emerald-light/20 border border-white/5 text-ivory/90 p-4 text-sm font-sans leading-relaxed rounded-tr-xl rounded-br-xl rounded-bl-xl">
                                                    {comment.text}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {isProcessingAI && (
                                    <div className="flex w-full justify-start animate-pulse">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full border border-emerald-light bg-emerald-dark flex items-center justify-center flex-shrink-0 mt-1">
                                                <BrainIcon className="w-4 h-4 text-emerald-400" />
                                            </div>
                                            <div className="bg-emerald-light/10 border border-white/5 p-4 rounded-xl">
                                                <div className="flex gap-1.5">
                                                    <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Floating Input Area */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-emerald-deep/95 backdrop-blur-sm border-t border-gold-muted/10">
                                <form onSubmit={handleSendComment} className="relative group">
                                    <input
                                        type="text"
                                        value={commentInput}
                                        onChange={(e) => setCommentInput(e.target.value)}
                                        placeholder="Command the architect..."
                                        disabled={isProcessingAI}
                                        className="w-full pl-4 pr-12 py-4 bg-emerald-light/30 border border-gold-muted/20 focus:border-gold focus:bg-emerald-light/50 outline-none text-sm font-sans text-ivory transition-all disabled:opacity-50 placeholder:text-gray-600 rounded-sm shadow-inner"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!commentInput.trim() || isProcessingAI}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gold-muted hover:text-gold disabled:opacity-30 transition-colors"
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