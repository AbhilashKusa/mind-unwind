import React, { useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { SparklesIcon } from '../Icons';

export interface ToastMessage {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ToastProps {
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed bottom-20 lg:bottom-10 right-4 lg:right-10 z-[100] flex flex-col gap-4 pointer-events-none">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
        </div>
    );
};

const ToastItem: React.FC<{ toast: ToastMessage, onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    const itemRef = React.useRef<HTMLDivElement>(null);

    useGSAP(() => {
        gsap.fromTo(itemRef.current,
            { x: 50, opacity: 0, scale: 0.9 },
            { x: 0, opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)" }
        );

        // Auto remove
        const timer = setTimeout(() => {
            gsap.to(itemRef.current, {
                x: 20,
                opacity: 0,
                duration: 0.3,
                onComplete: () => onRemove(toast.id)
            });
        }, 3000);

        return () => clearTimeout(timer);
    }, { scope: itemRef });

    const borderColor = toast.type === 'error' ? 'border-crimson' : 'border-gold';
    const bgColor = toast.type === 'error' ? 'bg-crimson/10' : 'bg-emerald-deep/90';

    return (
        <div
            ref={itemRef}
            className={`pointer-events-auto min-w-[300px] p-4 rounded-md border ${borderColor} ${bgColor} backdrop-blur-md shadow-glow-sm flex items-center gap-4`}
        >
            <div className={`p-2 rounded-full ${toast.type === 'error' ? 'bg-crimson/20' : 'bg-gold/20'}`}>
                <SparklesIcon className={`w-4 h-4 ${toast.type === 'error' ? 'text-crimson' : 'text-gold'}`} />
            </div>
            <div>
                <h4 className={`font-serif text-sm font-bold ${toast.type === 'error' ? 'text-crimson' : 'text-gold'}`}>
                    {toast.type === 'error' ? 'Royal Alert' : 'Royal Decree'}
                </h4>
                <p className="text-xs text-ivory/90 font-sans">{toast.message}</p>
            </div>
        </div>
    );
};

export default Toast;
