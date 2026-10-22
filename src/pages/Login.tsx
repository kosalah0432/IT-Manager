import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { Lock } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      navigate(from);
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center p-4 transition-colors duration-200">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-800">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-2xl">
            <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">IT Tech Manager</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-8 font-medium">Sign in to your account</p>
        
        {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl mb-6 text-sm font-medium border border-red-100 dark:border-red-900/30">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Username</label>
            <input 
              type="text" 
              required 
              className="mt-1 block w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Enter your username"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Password</label>
            <input 
              type="password" 
              required 
              className="mt-1 block w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white rounded-xl py-3 font-bold uppercase tracking-wider text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none mt-2">
            Sign In
          </button>
        </form>
        
      </div>
    </div>
  );
}
