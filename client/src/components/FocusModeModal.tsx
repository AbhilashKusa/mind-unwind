import React, { useState, useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Task } from '../types';
import { X, CheckCircle, Timer } from 'lucide-react';

interface FocusModeModalProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
    onComplete: (task: Task) => void;
}

const FocusModeModal: React.FC<FocusModeModalProps> = ({ task, isOpen, onClose, onComplete }) => {
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState<'focus' | 'break'>('focus');
    const containerRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<SVGCircleElement>(null);
    const glowRef = useRef<HTMLDivElement>(null);

    // Initial reset when opening
    useEffect(() => {
        if (isOpen) {
            setTimeLeft(25 * 60);
            setIsActive(false);
            setMode('focus');
        }
    }, [isOpen, task?.id]);

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            // Play a sound or notification here ideally
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    // Format Time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // GSAP Animations
    useGSAP(() => {
        if (!glowRef.current) return;

        if (isActive) {
            gsap.to(glowRef.current, {
                scale: 1.5,
                opacity: 0.6,
                duration: 4, // 4-second breath cycle roughly mimics calm breathing
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
        } else {
            gsap.to(glowRef.current, {
                scale: 1,
                opacity: 0.2,
                duration: 1,
            });
        }
    }, [isActive]);

    // Ring Progress
    useEffect(() => {
        if (ringRef.current) {
            const totalTime = mode === 'focus' ? 25 * 60 : 5 * 60;
            const progress = timeLeft / totalTime;
            const circumference = 2 * Math.PI * 120; // r=120
            const offset = (1 - progress) * circumference;

            gsap.to(ringRef.current, {
                strokeDashoffset: offset,
                duration: 1,
                ease: "linear"
            });
        }
    }, [timeLeft, mode]);


    if (!isOpen || !task) return null;

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
    };

    const switchMode = () => {
        setIsActive(false);
        const newMode = mode === 'focus' ? 'break' : 'focus';
        setMode(newMode);
        setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-emerald-deep/95 backdrop-blur-xl animate-in fade-in duration-500">
            {/* Ambient Background */}
            <div ref={glowRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div ref={containerRef} className="relative z-10 w-full max-w-lg p-8 flex flex-col items-center text-ivory">

                {/* Header */}
                <div className="absolute top-8 right-8">
                    <button onClick={onClose} className="p-2 text-gold-muted hover:text-gold transition-colors">
                        <X className="w-8 h-8" />
                    </button>
                </div>

                <div className="mb-12 text-center space-y-2">
                    <h2 className="text-gold font-bold uppercase tracking-[0.3em] text-xs">
                        {mode === 'focus' ? 'The Focus Chamber' : 'Royal Respite'}
                    </h2>
                    <h1 className="text-3xl font-serif max-w-md leading-tight text-ivory/90">
                        {task.title}
                    </h1>
                </div>

                {/* Timer Visualization */}
                <div className="relative w-80 h-80 flex items-center justify-center mb-12">
                    {/* SVG Ring */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        {/* Background Ring */}
                        <circle cx="160" cy="160" r="120" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/5" />
                        {/* Progress Ring */}
                        <circle
                            ref={ringRef}
                            cx="160" cy="160" r="120"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            className={`${mode === 'focus' ? 'text-gold' : 'text-emerald-400'} drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]`}
                            strokeDasharray={`${2 * Math.PI * 120}`}
                            strokeDashoffset="0"
                            strokeLinecap="round"
                        />
                    </svg>

                    {/* Time Display */}
                    <div className="text-center z-10">
                        <div className="text-6xl font-mono font-light tracking-wider tabular-nums">
                            {formatTime(timeLeft)}
                        </div>
                        <p className="text-gold-muted text-xs uppercase tracking-widest mt-2 font-bold opacity-60">
                            {isActive ? 'Time Remaining' : 'Paused'}
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex gap-6 items-center mb-10 w-full justify-center">
                    <button
                        onClick={toggleTimer}
                        aria-label={isActive ? "Pause Timer" : "Start Timer"}
                        className="w-16 h-16 rounded-full bg-gold text-emerald-deep flex items-center justify-center hover:scale-110 transition-transform shadow-glow-gold"
                    >
                        {isActive ? (
                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                        ) : (
                            <svg className="w-6 h-6 fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        )}
                    </button>

                    <button
                        onClick={resetTimer}
                        className="p-4 rounded-full border border-white/10 text-gold-muted hover:text-ivory hover:border-gold/30 hover:bg-white/5 transition-all"
                        title="Reset Timer"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    </button>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <button
                        onClick={() => {
                            if (window.confirm("Mark this task as complete?")) {
                                onComplete(task);
                                onClose();
                            }
                        }}
                        className="w-full py-3 bg-emerald-light/20 border border-gold/20 text-gold font-bold uppercase tracking-widest text-xs hover:bg-gold hover:text-emerald-deep transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Complete Task
                    </button>

                    <button
                        onClick={switchMode}
                        className="text-[10px] text-gray-500 hover:text-gold-muted uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                        <Timer className="w-3 h-3" />
                        Switch to {mode === 'focus' ? 'Break' : 'Focus'} Mode
                    </button>
                </div>

            </div>
        </div>
    );
};

export default FocusModeModal;
