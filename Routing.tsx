import React, { useState, useCallback, useEffect } from 'react';
import { Play, Cpu, LogOut, ChevronDown, Loader2, Server } from 'lucide-react';
import { Instance, LogEntry, CurrentUser, User } from './types';
import { launchInstanceApi, deleteInstanceApi } from './services/api';
import { getSession, logout } from './services/auth';
import ConsoleLog from './components/ConsoleLog';
import ActiveInstances from './components/ActiveInstances';
import HowToUse from './components/HowToUse';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import ExpiryTimer from './components/ExpiryTimer';

const Routing: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // App State
  const [targetUid, setTargetUid] = useState('');
  const [selectedBotIndex, setSelectedBotIndex] = useState(0);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check session on load
  useEffect(() => {
    const session = getSession();
    if (session) {
      setCurrentUser(session);
    }
  }, []);

  const handleLogin = (user: CurrentUser) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setInstances([]); // Clear instances on logout
    setLogs([]);
  };

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Type guard
    if (!currentUser || currentUser.role !== 'user') return;
    const user = currentUser as User;

    // Handle Legacy Data fallback
    const availableBots = user.allowedBots || (user.config ? [{
      name: user.config.botName,
      addApiUrl: user.config.addApiUrl,
      removeApiUrl: user.config.removeApiUrl
    }] : []);

    const selectedBot = availableBots[selectedBotIndex];
    if (!selectedBot) {
        addLog("Error: Invalid bot configuration.", "error");
        return;
    }

    if (!targetUid.trim()) {
      addLog("Error: Target UID cannot be empty.", "error");
      return;
    }

    // Check Limit
    const limit = user.maxInstances || user.config?.maxInstances || 1;
    if (instances.length >= limit) {
        addLog(`Error: Instance limit reached (${limit}). Upgrade plan to add more.`, "error");
        return;
    }

    // Check if already running
    if (instances.some(i => i.targetUid === targetUid)) {
      addLog(`Warning: Instance for UID ${targetUid} is already active.`, "warning");
      return;
    }

    setIsLoading(true);
    addLog(`Initializing Launch Sequence for UID: ${targetUid} on ${selectedBot.name}...`, "info");

    try {
      const responseMsg = await launchInstanceApi(targetUid, selectedBot.addApiUrl);
      
      const newInstance: Instance = {
        id: Math.random().toString(36).substr(2, 9),
        botName: selectedBot.name,
        targetUid: targetUid,
        status: 'active',
        startedAt: new Date().toLocaleTimeString()
      };

      setInstances(prev => [newInstance, ...prev]);
      addLog(`SUCCESS: ${responseMsg}`, "success");
      addLog(`Instance launched. Bot: ${selectedBot.name} | Target: ${targetUid}`, "success");
      setTargetUid(''); // Clear input
    } catch (error: any) {
      addLog(`CRITICAL FAILURE: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, uid: string) => {
    if (!currentUser || currentUser.role !== 'user') return;
    const user = currentUser as User;
    
    const instanceToRemove = instances.find(i => i.id === id);
    if (!instanceToRemove) return;

    // Fallback logic for legacy data
    const availableBots = user.allowedBots || (user.config ? [{
        name: user.config.botName,
        addApiUrl: user.config.addApiUrl,
        removeApiUrl: user.config.removeApiUrl
    }] : []);

    const botConfig = availableBots.find(b => b.name === instanceToRemove.botName) || availableBots[0];

    // Mark as removing immediately in UI
    setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'removing' } : i));
    addLog(`Initiating termination sequence for UID: ${uid}...`, "warning");

    try {
      const responseMsg = await deleteInstanceApi(uid, botConfig.removeApiUrl);
      addLog(`Terminated: ${responseMsg}`, "info");
      
      // Remove from list
      setInstances(prev => prev.filter(i => i.id !== id));
      addLog(`Instance ${id} removed successfully.`, "success");
    } catch (error: any) {
      addLog(`Failed to terminate instance remotely: ${error.message}`, "error");
      setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
    }
  };

  // --- RENDER LOGIC ---

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  if (currentUser.role === 'admin') {
    return <AdminPanel onLogout={handleLogout} />;
  }

  // User Dashboard
  const user = currentUser as User;
  
  // Prepare Bot List for Dropdown
  const botList = user.allowedBots || (user.config ? [{
      name: user.config.botName,
      addApiUrl: user.config.addApiUrl,
      removeApiUrl: user.config.removeApiUrl
  }] : []);

  const limit = user.maxInstances || user.config?.maxInstances || 1;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-cyan-400 selection:text-black flex flex-col items-center p-4">
      
      {/* 1. TOP SECTION: HEADER */}
      <div className="w-full max-w-4xl mt-6 mb-10 text-center space-y-3 animate-[fadeIn_0.5s_ease-out]">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          FF LEVEL UP BOT
        </h1>
        <div className="flex justify-center items-center gap-4 text-xs font-mono text-slate-500 uppercase tracking-widest bg-slate-900/50 inline-block px-4 py-1 rounded-full border border-slate-800">
            <span className="text-cyan-400">●</span>
            <span>Welcome, {user.username}</span>
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* CENTER COLUMN: LAUNCH INSTANCE & CONSOLE */}
        <div className="lg:col-span-6 space-y-6 flex flex-col">
            
            {/* 2. LAUNCH INSTANCE SECTION (NICHE) */}
            <div className="bg-slate-900/50 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm relative flex-shrink-0">
                {/* Decorative glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-cyan-500 to-purple-500 shadow-[0_0_10px_#22d3ee]"></div>

                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-cyan-500/10 p-2.5 rounded-lg border border-cyan-500/20">
                            <Server size={24} className="text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white leading-tight">Launch Instance</h2>
                            <p className="text-xs text-slate-400 font-mono">Deploy new bot worker</p>
                        </div>
                        <div className="ml-auto flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-slate-700">
                             <Cpu size={14} className="text-purple-400" />
                             <span className="text-xs font-mono font-bold text-slate-300">{instances.length}/{limit} Active</span>
                        </div>
                    </div>

                    <form onSubmit={handleLaunch} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider ml-1">Select Server Node</label>
                            <div className="relative group">
                                <select
                                    value={selectedBotIndex}
                                    onChange={(e) => setSelectedBotIndex(Number(e.target.value))}
                                    className="w-full bg-black/40 border border-slate-600 text-slate-200 appearance-none pl-4 pr-10 py-3 rounded-xl font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer hover:border-slate-500"
                                >
                                    {botList.map((bot, index) => (
                                        <option key={index} value={index}>{bot.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-cyan-400 transition-colors pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider ml-1">Target UID</label>
                            <input
                                type="number"
                                value={targetUid}
                                onChange={(e) => setTargetUid(e.target.value)}
                                placeholder="Enter Free Fire UID"
                                className="w-full bg-black/40 border border-slate-600 text-white placeholder-slate-600 px-4 py-3 rounded-xl font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${
                                isLoading 
                                ? 'bg-slate-700 cursor-wait text-slate-400' 
                                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/20 cursor-pointer'
                            }`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Deploying...</span>
                                </>
                            ) : (
                                <>
                                    <Play size={18} className="fill-current" />
                                    <span>START ENGINE</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Console */}
            <ConsoleLog logs={logs} />
        </div>

        {/* RIGHT COLUMN: ACTIVE INSTANCES & STATUS */}
        <div className="lg:col-span-6 space-y-6">
            
            {/* Status Bar */}
            <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="text-[10px] uppercase text-slate-500 font-bold mb-1 z-10">Time Remaining</div>
                    <div className="z-10 bg-slate-800/80 px-2 py-1 rounded text-center">
                        <ExpiryTimer expiryDate={user.expiryDate} showIcon={false} />
                    </div>
                    {/* bg accent */}
                    <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-green-500/20 rounded-full blur-xl"></div>
                 </div>
                 <button onClick={handleLogout} className="bg-red-900/20 border border-red-900/50 hover:bg-red-900/30 text-red-400 rounded-xl p-3 flex flex-col items-center justify-center transition-colors cursor-pointer group">
                    <LogOut size={16} className="mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] uppercase font-bold">Logout System</span>
                 </button>
            </div>

            {/* 3. ACTIVE INSTANCES LIST */}
            <div className="bg-slate-900/30 border border-slate-700/50 rounded-2xl p-4 min-h-[300px]">
                <ActiveInstances instances={instances} onDelete={handleDelete} />
            </div>

            <HowToUse />
        </div>
      </div>

      <footer className="mt-12 text-slate-600 text-[10px] uppercase font-mono">
        System v2.0 • Secure Connection
      </footer>
    </div>
  );
};

export default Routing;