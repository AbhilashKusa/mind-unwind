import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X } from 'lucide-react';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { user, updateUserProfile, logout } = useStore();
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (isOpen && user) {
            setName(user.name);
            setPassword('');
            setMessage(null);
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            await updateUserProfile(name, password || undefined);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setPassword('');
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-dark/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-emerald-deep border border-gold/30 shadow-glow-gold p-8 w-full max-w-md relative overflow-hidden group">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-gold/20 rounded-tl-lg"></div>
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-gold/20 rounded-br-lg"></div>

                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 text-gold-muted hover:text-gold transition-colors z-20"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="flex flex-col items-center mb-10 relative z-10">
                    <div className="w-28 h-28 bg-emerald-light rounded-full flex items-center justify-center border border-gold shadow-glow-sm mb-6 relative group-hover:scale-105 transition-transform duration-500">
                        <div className="absolute inset-0 rounded-full bg-gold/5 blur-md"></div>
                        <span className="text-5xl font-serif font-bold text-gold relative z-10">
                            {user?.name.charAt(0) || 'U'}
                        </span>
                    </div>
                    <h2 className="text-2xl font-serif text-ivory tracking-wide">Your Profile</h2>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-gold-muted mt-2">Personal Sanctuary</p>
                </div>

                {message && (
                    <div className={`p-4 mb-6 border text-xs font-bold uppercase tracking-wide text-center backdrop-blur-sm ${message.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                        : 'bg-crimson/10 border-crimson/50 text-crimson'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                    <div className="space-y-2 group/input">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-muted group-hover/input:text-gold transition-colors">
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full py-3 bg-transparent border-b border-gold-muted/30 focus:border-gold outline-none font-serif text-lg text-ivory placeholder:text-gray-600 transition-all"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-muted">
                            Email Identity
                        </label>
                        <div className="w-full py-3 border-b border-white/5 text-ivory/50 font-sans text-sm italic cursor-not-allowed">
                            {user?.email}
                        </div>
                    </div>

                    <div className="space-y-2 group/input">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-muted group-hover/input:text-gold transition-colors">
                            New Password (Optional)
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Leave empty to keep current"
                            className="w-full py-3 bg-transparent border-b border-gold-muted/30 focus:border-gold outline-none font-sans text-ivory placeholder:text-gray-700 transition-all"
                        />
                    </div>

                    <div className="pt-6 space-y-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-gradient-to-r from-gold-muted via-gold to-gold-muted text-emerald-deep font-bold uppercase tracking-[0.25em] text-xs hover:shadow-glow-gold hover:scale-[1.02] transition-all duration-300 disabled:opacity-50"
                        >
                            {isLoading ? 'Updating...' : 'Save Changes'}
                        </button>

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full py-3 text-gold-muted/60 font-bold uppercase tracking-[0.2em] text-[10px] hover:text-crimson hover:underline decoration-crimson/30 transition-colors"
                        >
                            Disconnect from Sanctuary
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
