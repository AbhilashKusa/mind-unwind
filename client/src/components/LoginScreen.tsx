import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { User } from 'lucide-react';

import LoginBackground from './LoginBackground';

interface LoginScreenProps {
  onLogin: (user: any) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = () => {
  const { login, register, authError, clearAuthError } = useStore();
  const [isRegister, setIsRegister] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearAuthError();

    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (e) {
      // Error managed by store
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* 3D Background */}
      <LoginBackground />

      <div className="text-center mb-10 relative z-10">
        <h1 className="text-5xl md:text-6xl font-serif font-medium tracking-tight mb-2 text-gold animate-in fade-in slide-in-from-bottom-4 duration-700">Mind Unwind</h1>
        <p className="text-ivory-dim font-sans text-xs tracking-[0.3em] uppercase">The Sanctuary for your Thoughts</p>
      </div>

      <div className="bg-emerald-light/40 backdrop-blur-md p-10 border border-gold-muted/30 shadow-glow-gold w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">

        {/* Decorative Corner */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-gold/50"></div>
        <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-gold/50"></div>
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-gold/50"></div>
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-gold/50"></div>

        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-full border border-gold/30 flex items-center justify-center text-gold">
            <User className="w-5 h-5" />
          </div>
        </div>

        <h2 className="text-2xl font-serif text-center text-ivory mb-8">
          {isRegister ? 'Begin Your Journey' : 'Welcome Back'}
        </h2>

        {authError && (
          <div className="bg-crimson/20 border border-crimson/50 text-ivory p-3 mb-6 text-xs text-center font-sans tracking-wide">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegister && (
            <div className="group">
              <label className="block text-[10px] font-bold uppercase text-gold-muted mb-2 tracking-widest">Name</label>
              <input
                required
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 bg-emerald-deep/50 border-b border-gold-muted/30 focus:border-gold outline-none text-ivory placeholder:text-emerald-light/50 transition-colors font-serif"
                placeholder="Enter your full name"
              />
            </div>
          )}

          <div className="group">
            <label className="block text-[10px] font-bold uppercase text-gold-muted mb-2 tracking-widest">Email</label>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-emerald-deep/50 border-b border-gold-muted/30 focus:border-gold outline-none text-ivory placeholder:text-emerald-light/50 transition-colors font-serif"
              placeholder="Enter your email"
            />
          </div>

          <div className="group">
            <label className="block text-[10px] font-bold uppercase text-gold-muted mb-2 tracking-widest">Password</label>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-emerald-deep/50 border-b border-gold-muted/30 focus:border-gold outline-none text-ivory placeholder:text-emerald-light/50 transition-colors font-serif"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-gold-muted via-gold to-gold-muted text-emerald-deep font-bold uppercase tracking-[0.2em] text-xs hover:shadow-glow-gold transition-all duration-300 disabled:opacity-50 mt-4 cursor-pointer relative overflow-hidden group"
          >
            <span className="relative z-10">{loading ? 'Processing...' : (isRegister ? 'Sign Up' : 'Login')}</span>
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-gold-muted/10">
          <button
            onClick={() => { setIsRegister(!isRegister); clearAuthError(); }}
            className="text-xs font-serif italic text-gold-muted hover:text-gold transition-colors border-b border-transparent hover:border-gold"
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
