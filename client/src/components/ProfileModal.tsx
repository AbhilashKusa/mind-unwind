import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { CloseIcon, UserIcon } from './Icons';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border-2 border-black shadow-sharp p-6 w-full max-w-md relative">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 hover:bg-gray-100 transition-colors"
                >
                    <CloseIcon className="w-6 h-6" />
                </button>

                <div className="flex flex-col items-center mb-8">
                    <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center border-4 border-black mb-4">
                        <span className="text-4xl font-bold text-white uppercase">
                            {user?.name.charAt(0) || 'U'}
                        </span>
                    </div>
                    <h2 className="text-xl font-bold uppercase tracking-widest">Profile</h2>
                </div>

                {message && (
                    <div className={`p-4 mb-6 border-2 font-bold text-sm ${message.type === 'success'
                            ? 'bg-green-50 border-green-500 text-green-700'
                            : 'bg-red-50 border-red-500 text-red-700'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 bg-gray-50 border-2 border-gray-200 focus:border-black outline-none font-bold transition-colors"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                            Email (Read Only)
                        </label>
                        <div className="w-full p-3 bg-gray-100 border-2 border-gray-200 text-gray-500 font-bold">
                            {user?.email}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                            New Password (Optional)
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Leave empty to keep current"
                            className="w-full p-3 bg-gray-50 border-2 border-gray-200 focus:border-black outline-none font-bold transition-colors"
                        />
                    </div>

                    <div className="pt-4 space-y-3">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest border-2 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full py-4 bg-white text-red-600 font-bold uppercase tracking-widest border-2 border-red-600 hover:bg-red-50 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
