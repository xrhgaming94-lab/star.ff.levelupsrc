
import React from 'react';
import { Rocket } from 'lucide-react';

interface LandingProps {
  onLaunch: () => void;
}

const Landing: React.FC<LandingProps> = ({ onLaunch }) => {
  return (
    <div className="min-h-screen bg-gaming-dark flex flex-col items-center justify-center p-4 text-white font-sans overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>
      
      <div className="text-center relative z-10 animate-in fade-in slide-in-from-bottom-10 duration-700">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-500 to-purple-500 drop-shadow-[0_0_25px_rgba(59,130,246,0.6)]">
          FF LEVEL UP BOT
        </h1>
        
        <p className="mt-4 text-slate-400 font-mono text-sm md:text-base">
          Instance Management System
        </p>

        <button 
          onClick={onLaunch}
          className="mt-12 inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg px-10 py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
        >
          <Rocket size={24} />
          Launch Instance
        </button>
      </div>
      
      <footer className="absolute bottom-6 text-center text-slate-600 text-[10px] uppercase tracking-widest font-mono z-10">
         © 2026 Star level up bot. All rights reserved
      </footer>
    </div>
  );
};

export default Landing;
