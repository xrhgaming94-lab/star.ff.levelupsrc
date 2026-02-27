import React, { useEffect, useState } from 'react';
import { BookOpen, Play, StopCircle, Trash2, ShieldCheck, AlertTriangle, Youtube, Clock } from 'lucide-react';
import { fetchAppConfig } from '../services/auth';

const HowToUse: React.FC = () => {
  const [customInstructions, setCustomInstructions] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('#');

  useEffect(() => {
    const loadConfig = async () => {
      const config = await fetchAppConfig();
      setCustomInstructions(config.dashboardInstructions || '');
      setYoutubeLink(config.youtubeLink || '#');
    };
    loadConfig();
  }, []);

  const renderYouTubeButton = () => (
    <a 
      href={youtubeLink} 
      target="_blank" 
      rel="noopener noreferrer"
      className="mt-6 w-full flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 font-semibold py-3 rounded-lg transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-red-900/20 group"
    >
      <Youtube size={20} className="text-red-500 group-hover:animate-bounce" />
      <span>Watch Tutorial</span>
    </a>
  );

  if (customInstructions) {
    return (
        <div className="bg-gaming-panel border border-slate-700 rounded-xl p-6 shadow-lg mt-6 animate-[fadeIn_0.5s_ease-out]">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen size={20} className="text-purple-400" />
                Instructions
            </h2>
            <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-mono">
                {customInstructions}
            </div>
            {renderYouTubeButton()}
        </div>
    );
  }

  return (
    <div className="bg-gaming-panel border border-slate-700 rounded-xl p-6 shadow-lg mt-6 animate-[fadeIn_0.5s_ease-out]">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <BookOpen size={20} className="text-purple-400" />
        How It Works
      </h2>
      
      <div className="space-y-5">
        {/* Step 1 */}
        <div className="flex gap-3 group hover:bg-slate-800/50 p-2 rounded-lg transition-colors duration-300">
          <div className="bg-blue-500/10 p-2 h-fit rounded-lg border border-blue-500/20 shrink-0 group-hover:scale-110 transition-transform duration-300">
            <Play size={20} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-200 text-sm group-hover:text-blue-300 transition-colors">Fair Play ⏯️ & Best Play</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Launch your instance and let the bot do the hard work. Play smart, play fair!
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-3 group hover:bg-slate-800/50 p-2 rounded-lg transition-colors duration-300">
          <div className="bg-red-500/10 p-2 h-fit rounded-lg border border-red-500/20 shrink-0 group-hover:scale-110 transition-transform duration-300">
            <StopCircle size={20} className="text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-200 text-sm group-hover:text-red-300 transition-colors">Stop Before Playing</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Always stop the instance completely before opening your game to ensure maximum safety.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-3 group hover:bg-slate-800/50 p-2 rounded-lg transition-colors duration-300">
          <div className="bg-yellow-500/10 p-2 h-fit rounded-lg border border-yellow-500/20 shrink-0 group-hover:scale-110 transition-transform duration-300">
            <Clock size={20} className="text-yellow-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-200 text-sm group-hover:text-yellow-300 transition-colors">Wait For Admin</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              After requesting a Start, Stop, or Restart, please wait for the admin to approve the action.
            </p>
          </div>
        </div>

        {/* Important Warning */}
        <div className="flex gap-3 group bg-orange-500/5 p-3 rounded-lg border border-orange-500/20 hover:bg-orange-500/10 transition-colors duration-300 mt-4">
          <div className="bg-orange-500/10 p-2 h-fit rounded-lg border border-orange-500/20 shrink-0 group-hover:scale-110 transition-transform duration-300 animate-pulse">
            <AlertTriangle size={20} className="text-orange-400" />
          </div>
          <div>
            <h3 className="font-bold text-orange-200 text-sm group-hover:text-orange-300 transition-colors">CRITICAL WARNING</h3>
            <p className="text-xs text-orange-200/80 mt-1 leading-relaxed font-semibold">
              Never log into your game account while the Level Up Bot is actively running. Doing so may result in an immediate account ban! Always STOP the bot before opening your game.
            </p>
          </div>
        </div>
      </div>

      {renderYouTubeButton()}
    </div>
  );
};

export default HowToUse;