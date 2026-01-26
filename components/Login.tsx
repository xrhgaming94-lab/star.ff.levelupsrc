import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, User, ExternalLink, Youtube, Loader2, LogIn } from 'lucide-react';
import { login, getAppConfig } from '../services/auth';
import { CurrentUser } from '../types';

interface LoginProps {
  onLogin: (user: CurrentUser) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [contactLink, setContactLink] = useState('#');
  const [youtubeLink, setYoutubeLink] = useState('#');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const config = getAppConfig();
    setContactLink(config.contactLink || '#');
    setYoutubeLink(config.youtubeLink || '#');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));

    const result = login(username, password);
    
    if (result.success && result.user) {
      onLogin(result.user);
    } else {
      setError(result.message || "Login failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gaming-dark flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gaming-panel border border-slate-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden flex flex-col">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 border border-slate-700 mb-4 shadow-lg">
            <ShieldCheck size={32} className="text-gaming-neon" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">FF LEVEL UP BOT</h1>
          <p className="text-slate-500 text-sm mt-2">Access the Control Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center font-mono">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-slate-600 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-gaming-accent transition-colors"
                placeholder="Enter username"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-slate-600 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-gaming-accent transition-colors"
                placeholder="Enter password"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full font-bold py-3.5 rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 ${
                isLoading 
                ? 'bg-slate-700 text-slate-400 cursor-wait' 
                : 'bg-gaming-accent hover:bg-blue-600 text-white transform active:scale-95 cursor-pointer'
            }`}
          >
            {isLoading ? (
                <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Verifying...</span>
                </>
            ) : (
                <>
                    <span>LOGIN SYSTEM</span>
                    <LogIn size={18} />
                </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-700 space-y-3">
           <a 
             href={contactLink} 
             target="_blank" 
             rel="noopener noreferrer"
             className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold py-3 rounded-lg transition-colors group cursor-pointer active:scale-95"
           >
             <span>Get Login Details</span>
             <ExternalLink size={16} className="text-slate-400 group-hover:text-white transition-colors" />
           </a>
           
           <a 
             href={youtubeLink} 
             target="_blank" 
             rel="noopener noreferrer"
             className="w-full flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 font-semibold py-3 rounded-lg transition-colors group cursor-pointer active:scale-95"
           >
             <Youtube size={18} className="text-red-500 group-hover:scale-110 transition-transform" />
             <span>How To Use</span>
           </a>
        </div>
      </div>
      
      <footer className="mt-8 text-center text-slate-600 text-[10px] uppercase tracking-widest font-mono">
        © 2026 Star level up bot. All rights reserved
      </footer>
    </div>
  );
};

export default Login;