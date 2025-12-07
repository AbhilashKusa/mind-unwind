import React, { useState } from 'react';
import { BrainIcon, SparklesIcon } from './Icons';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onLogin({ name: name.trim() });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full border-2 border-black p-8 shadow-sharp bg-white">
        <div className="flex justify-center mb-8">
          <div className="bg-black p-4 border-2 border-black">
            <BrainIcon className="w-12 h-12 text-white" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-center text-black mb-3 tracking-tight">
          MindUnwind
        </h1>
        <p className="text-center text-gray-500 mb-10 font-medium">
          DUMP YOUR THOUGHTS. <br /> WE ORGANIZE THE CHAOS.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-xs font-bold text-black uppercase tracking-widest mb-2">
              Who are you?
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ENTER YOUR NAME"
              className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 focus:border-black focus:bg-white transition-all text-lg font-bold outline-none placeholder:text-gray-300 placeholder:font-normal"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-4 px-6 bg-black text-white font-bold border-2 border-black shadow-sharp hover:shadow-sharp-hover hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            <span>START ORGANIZING</span>
            <SparklesIcon className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-12 pt-6 border-t border-gray-100 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Powered by Gemini 3.0 Pro
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
