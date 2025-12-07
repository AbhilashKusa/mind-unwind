import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { UserIcon } from './Icons';

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Mind Unwind</h1>
        <p className="text-gray-500 font-bold tracking-wide uppercase text-xs">AI-Powered Task Organizer</p>
      </div>

      <div className="bg-white p-8 border-2 border-black shadow-sharp w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white">
            <UserIcon className="w-8 h-8" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-center uppercase tracking-wider mb-6">
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h2>

        {authError && (
          <div className="bg-red-50 border-2 border-red-500 text-red-600 p-3 mb-4 text-xs font-bold uppercase">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Name</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 bg-gray-50 border-2 border-gray-200 focus:border-black outline-none font-bold text-sm"
                placeholder="YOUR NAME"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-50 border-2 border-gray-200 focus:border-black outline-none font-bold text-sm"
              placeholder="EMAIL ADDRESS"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 border-2 border-gray-200 focus:border-black outline-none font-bold text-sm"
              placeholder="PASSWORD"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-black text-white font-bold uppercase tracking-widest border-2 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Processing...' : (isRegister ? 'Sign Up' : 'Login')}
          </button>
        </form>

        <div className="mt-6 text-center border-t-2 border-gray-100 pt-4">
          <button
            onClick={() => { setIsRegister(!isRegister); clearAuthError(); }}
            className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-wider"
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
