import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Play, Cpu, LogOut, ChevronDown, Loader2, Server, CloudOff } from 'lucide-react';
import { Instance, LogEntry, CurrentUser, User, AppConfig } from './types';
import { launchInstanceApi, deleteInstanceApi } from './services/api';
import { getSession, logout, fetchUserSession, saveUserInstances, saveUserLogs, fetchAppConfig } from './services/auth';
import ConsoleLog from './components/ConsoleLog';
import ActiveInstances from './components/ActiveInstances';
import HowToUse from './components/HowToUse';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import ExpiryTimer from './components/ExpiryTimer';

const Routing: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  // App State
  const [targetUid, setTargetUid] = useState('');
  const [selectedBotIndex, setSelectedBotIndex] = useState(0);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const [isLoading, setIsLoading] = useState(false); // For launch action
  const [isSessionLoading, setIsSessionLoading] = useState(false); // For initial data fetch
  const [sessionError, setSessionError] = useState(false); // If fetch fails

  // Load App Config
  useEffect(() => {
    fetchAppConfig().then(setAppConfig);
  }, []);

  // Check session on load
  useEffect(() => {
    const session = getSession();
    if (session) {
      setCurrentUser(session);
    }
  }, []);

  // Load persistence data from Firebase when user logs in
  useEffect(() => {
    const loadData = async () => {
      if (currentUser && currentUser.role === 'user') {
        setIsSessionLoading(true);
        setSessionError(false);
        try {
          const data = await fetchUserSession(currentUser.username);
          
          // --- INSTANCE SANITIZATION ---
          let loadedInstances = data.instances || [];
          // Fix: Handle Firebase returning objects for sparse arrays
          if (loadedInstances && typeof loadedInstances === 'object' && !Array.isArray(loadedInstances)) {
              loadedInstances = Object.values(loadedInstances);
          }
          // Fix: Filter nulls and fix statuses
          loadedInstances = loadedInstances
            .filter(inst => inst && inst.targetUid)
            .map(inst => {
                 const rawStatus = inst.status || 'stopped';
                 const isStuck = rawStatus === 'restarting' || rawStatus === 'removing';
                 const effectiveStatus = isStuck ? 'active' : rawStatus;
                 return {
                     ...inst,
                     status: effectiveStatus,
                     startedTimestamp: inst.startedTimestamp || (effectiveStatus === 'active' ? Date.now() : undefined),
                     // Ensure safeModeStartTime is null if undefined/missing, otherwise Firebase crashes on re-save
                     safeModeStartTime: (inst.safeMode && !inst.safeModeStartTime) ? Date.now() : (inst.safeModeStartTime ?? null)
                 };
            });

          // --- LOG SANITIZATION (Fixes Blue Screen) ---
          let loadedLogs = data.logs || [];
          if (loadedLogs && typeof loadedLogs === 'object' && !Array.isArray(loadedLogs)) {
              loadedLogs = Object.values(loadedLogs);
          }

          setInstances(loadedInstances);
          setLogs(loadedLogs);
        } catch (e) {
          console.error("Failed to load session data", e);
          setSessionError(true);
        } finally {
          setIsSessionLoading(false);
        }
      }
    };
    if (currentUser) {
        loadData();
    }
  }, [currentUser]);

  // --- Auto Save Effect ---
  useEffect(() => {
     if (currentUser?.role === 'user' && instances.length > 0) {
         const timeoutId = setTimeout(() => {
             saveUserInstances(currentUser.username, instances);
         }, 1000); 
         return () => clearTimeout(timeoutId);
     }
  }, [instances, currentUser]);

  // --- Safe Mode Interval Check ---
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'user' || instances.length === 0) return;

    const interval = setInterval(() => {
        const safeModeLimitMinutes = appConfig?.safeModeDurationMinutes || 60; 
        const limitMs = safeModeLimitMinutes * 60 * 1000;
        const now = Date.now();
        
        instances.forEach(inst => {
            if (inst.safeMode && inst.status === 'active' && inst.safeModeStartTime) {
                if (now - inst.safeModeStartTime >= limitMs) {
                     handleStop(inst.id, inst.targetUid, true);
                }
            }
        });
    }, 30000);

    return () => clearInterval(interval);
  }, [instances, currentUser, appConfig]);


  const handleLogin = (user: CurrentUser) => {
    setCurrentUser(user);
    fetchAppConfig().then(setAppConfig);
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setInstances([]); 
    setLogs([]);
    setSessionError(false);
  };

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            message,
            type
        };
        const updatedLogs = [...safePrev, newLog];
        if (currentUser && currentUser.role === 'user') {
             saveUserLogs(currentUser.username, updatedLogs.slice(-50));
        }
        return updatedLogs;
    });
  }, [currentUser]);

  // Stable Update Handler
  const handleUpdateInstance = useCallback((id: string, data: Partial<Instance>) => {
    setInstances(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
  }, []);

  // --- SAFELY GET BOT CONFIG ---
  const getBotConfig = (instance: Instance, user: User) => {
    // Sanitize allowedBots to ensure it's an array
    let bots = user.allowedBots;
    if (bots && typeof bots === 'object' && !Array.isArray(bots)) {
        bots = Object.values(bots);
    }
    // Filter out potential nulls
    const safeBots = Array.isArray(bots) ? bots.filter(b => b && b.name) : [];

    const availableBots = safeBots.length > 0 ? safeBots : (user.config ? [{
        name: user.config.botName,
        addApiUrl: user.config.addApiUrl,
        removeApiUrl: user.config.removeApiUrl
    }] : []);

    return availableBots.find(b => b.name === instance.botName) || availableBots[0];
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'user') return;
    if (sessionError) return alert("Database connection failed. Please refresh.");

    const user = currentUser as User;
    
    // --- SAFE BOT LIST GENERATION ---
    let bots = user.allowedBots;
    if (bots && typeof bots === 'object' && !Array.isArray(bots)) {
        bots = Object.values(bots);
    }
    // Filter to ensure no undefined entries cause a crash in render
    const safeBots = Array.isArray(bots) ? bots.filter(b => b && b.name) : [];
    
    const availableBots = safeBots.length > 0 ? safeBots : (user.config ? [{
      name: user.config.botName,
      addApiUrl: user.config.addApiUrl,
      removeApiUrl: user.config.removeApiUrl
    }] : []);

    const selectedBot = availableBots[selectedBotIndex];
    if (!selectedBot) return addLog("Error: Invalid bot configuration.", "error");
    if (!targetUid.trim()) return addLog("Error: Target UID cannot be empty.", "error");

    const limit = user.maxInstances || user.config?.maxInstances || 1;
    if (instances.length >= limit) return addLog(`Error: Limit reached (${limit}).`, "error");
    if (instances.some(i => i.targetUid === targetUid)) return addLog(`Warning: UID ${targetUid} already active.`, "warning");

    setIsLoading(true);
    addLog(`Initializing Launch for ${targetUid} on ${selectedBot.name}...`, "info");

    try {
      const responseMsg = await launchInstanceApi(targetUid, selectedBot.addApiUrl);
      
      const newInstance: Instance = {
        id: Math.random().toString(36).substr(2, 9),
        botName: selectedBot.name,
        targetUid: targetUid,
        status: 'active',
        startedAt: new Date().toLocaleTimeString(),
        startedTimestamp: Date.now(),
        safeMode: false,
        safeModeStartTime: null // Explicit null to prevent undefined error in Firebase
      };

      setInstances(prev => [newInstance, ...prev]);
      addLog(`SUCCESS: ${responseMsg}`, "success");
      setTargetUid('');
    } catch (error: any) {
      addLog(`LAUNCH FAILURE: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, uid: string) => {
    if (!currentUser || currentUser.role !== 'user') return; 
    const user = currentUser as User;
    
    const instance = instances.find(i => i.id === id);
    setInstances(prev => prev.filter(i => i.id !== id));
    addLog(`Removed instance ${uid} from dashboard...`, "warning");

    if (!instance) return;
    if (sessionError) return addLog(`Note: Database/Network offline. Removed locally only.`, "warning");

    const botConfig = getBotConfig(instance, user);

    try {
      // DELETE calls remove friend API
      await deleteInstanceApi(uid, botConfig.removeApiUrl);
      addLog(`Server confirmed removal for ${uid}.`, "success");
    } catch (error: any) {
      addLog(`Warning: Instance ${uid} removed locally, but API returned error: ${error.message}`, "warning");
    }
  };

  const handleStop = async (id: string, uid: string, isAuto = false) => {
     if (!currentUser || currentUser.role !== 'user' || sessionError) return;
     const user = currentUser as User;
     const instance = instances.find(i => i.id === id);
     if (!instance) return;

     const botConfig = getBotConfig(instance, user);

     setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'removing' } : i));
     addLog(`${isAuto ? '[SafeMode] ' : ''}Stopping instance ${uid}...`, "warning");

     try {
         // STOP calls remove friend API
         const msg = await deleteInstanceApi(uid, botConfig.removeApiUrl);
         addLog(`Stopped: ${msg}`, "info");
         setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'stopped', safeMode: false, safeModeStartTime: null } : i));
     } catch (error: any) {
         addLog(`Failed to stop: ${error.message}`, "error");
         setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
     }
  };

  // NEW: Handle Start (Calls Add Friend API)
  const handleStart = async (id: string, uid: string) => {
      if (!currentUser || currentUser.role !== 'user' || sessionError) return;
      const user = currentUser as User;
      const instance = instances.find(i => i.id === id);
      if (!instance) return;

      const botConfig = getBotConfig(instance, user);

      // Optimistic update to UI
      setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'active' } : i));
      addLog(`Starting ${uid}...`, "info");

      try {
          // START calls Add Friend API
          const msg = await launchInstanceApi(uid, botConfig.addApiUrl);
          addLog(`Start Success: ${msg}`, "success");

          // Reset uptime on start
          setInstances(prev => prev.map(i => i.id === id ? { 
              ...i, 
              status: 'active', 
              startedAt: new Date().toLocaleTimeString(),
              startedTimestamp: Date.now() 
          } : i));
      } catch (error: any) {
          addLog(`Start Failed: ${error.message}`, "error");
          setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
      }
  };

  const handleRestart = async (id: string, uid: string) => {
      if (!currentUser || currentUser.role !== 'user' || sessionError) return;
      const user = currentUser as User;
      const instance = instances.find(i => i.id === id);
      if (!instance) return;

      const botConfig = getBotConfig(instance, user);

      setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'restarting' } : i));
      addLog(`Restarting ${uid}...`, "info");

      try {
          // RESTART: 1. Remove Friend
          await deleteInstanceApi(uid, botConfig.removeApiUrl);
          addLog(`Cleaned previous session for ${uid}.`, "info");
          
          // RESTART: 2. Add Friend
          const msg = await launchInstanceApi(uid, botConfig.addApiUrl);
          addLog(`Restart Success: ${msg}`, "success");

          // Update State: Reset Uptime (startedTimestamp)
          setInstances(prev => prev.map(i => i.id === id ? { 
              ...i, 
              status: 'active', 
              startedAt: new Date().toLocaleTimeString(),
              startedTimestamp: Date.now(), // Resets Uptime
              initialSessionExp: undefined, 
              lastKnownRate: undefined 
          } : i));

      } catch (error: any) {
          addLog(`Restart Failed: ${error.message}`, "error");
          setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
      }
  };

  const handleToggleSafeMode = (id: string, enabled: boolean) => {
      const instance = instances.find(i => i.id === id);
      if (!instance) return;

      if (enabled && instance.status === 'stopped') {
          addLog(`Cannot enable Safe Mode on STOPPED bot.`, "warning");
          return;
      }
      
      setInstances(prev => prev.map(i => i.id === id ? {
          ...i,
          safeMode: enabled,
          safeModeStartTime: enabled ? Date.now() : null 
      } : i));

      addLog(`Safe Mode ${enabled ? 'ENABLED' : 'DISABLED'} for ${instance.targetUid}`, enabled ? "success" : "warning");
  };


  if (!currentUser) return <Login onLogin={handleLogin} />;
  if (currentUser.role === 'admin') return <AdminPanel onLogout={handleLogout} />;

  const user = currentUser as User;
  
  // --- PREPARE BOT LIST FOR UI ---
  // Ensure we don't crash if allowedBots is weird
  let botListRaw = user.allowedBots;
  if (botListRaw && typeof botListRaw === 'object' && !Array.isArray(botListRaw)) {
      botListRaw = Object.values(botListRaw);
  }
  // CRITICAL FIX: Filter out null/undefined bots to prevent render crash
  const botList = Array.isArray(botListRaw) && botListRaw.length > 0 
      ? botListRaw.filter(b => b && b.name) 
      : (user.config ? [{
          name: user.config.botName,
          addApiUrl: user.config.addApiUrl,
          removeApiUrl: user.config.removeApiUrl
      }] : []);

  // Ensure there is at least one fallback bot to render
  const safeBotList = botList.length > 0 ? botList : [{name: "Default Bot", addApiUrl: "", removeApiUrl: ""}];

  const limit = user.maxInstances || user.config?.maxInstances || 1;

  if (isSessionLoading) {
      return (
          <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-slate-300 gap-4">
              <Loader2 size={40} className="animate-spin text-cyan-400" />
              <div className="font-mono text-sm tracking-widest uppercase">Syncing...</div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-cyan-400 selection:text-black flex flex-col items-center p-4">
      
      {/* HEADER */}
      <div className="w-full max-w-4xl mt-6 mb-10 text-center space-y-3 animate-[fadeIn_0.5s_ease-out]">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          FF LEVEL UP BOT
        </h1>
        <div className="flex justify-center items-center gap-4 text-xs font-mono text-slate-500 uppercase tracking-widest bg-slate-900/50 inline-block px-4 py-1 rounded-full border border-slate-800">
            <span className="text-cyan-400">●</span>
            <span>Welcome, {user.username}</span>
        </div>
      </div>

      {sessionError && (
          <div className="w-full max-w-4xl mb-6 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                  <CloudOff size={24} />
                  <div>
                      <h3 className="font-bold">Connection Failed</h3>
                      <p className="text-xs">Saved data unavailable.</p>
                  </div>
              </div>
              <button onClick={() => window.location.reload()} className="bg-red-500/20 px-3 py-1.5 rounded text-xs font-bold uppercase">Retry</button>
          </div>
      )}

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COL */}
        <div className="lg:col-span-6 space-y-6 flex flex-col">
            <div className={`bg-slate-900/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl relative flex-shrink-0 ${sessionError ? 'opacity-50 pointer-events-none' : ''}`}>
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
                                    className="w-full bg-black/40 border border-slate-600 text-slate-200 appearance-none pl-4 pr-10 py-3 rounded-xl font-mono text-sm focus:outline-none focus:border-cyan-500"
                                >
                                    {safeBotList.map((bot, index) => (
                                        <option key={index} value={index}>{bot.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-cyan-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider ml-1">Target UID</label>
                            <input
                                type="number"
                                value={targetUid}
                                onChange={(e) => setTargetUid(e.target.value)}
                                placeholder="Enter Free Fire UID"
                                className="w-full bg-black/40 border border-slate-600 text-white placeholder-slate-600 px-4 py-3 rounded-xl font-mono focus:outline-none focus:border-cyan-500"
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
            <ConsoleLog logs={logs} />
        </div>

        {/* RIGHT COL */}
        <div className="lg:col-span-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="text-[10px] uppercase text-slate-500 font-bold mb-1 z-10">Time Remaining</div>
                    <div className="z-10 bg-slate-800/80 px-2 py-1 rounded text-center">
                        <ExpiryTimer expiryDate={user.expiryDate} showIcon={false} />
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-green-500/20 rounded-full blur-xl"></div>
                 </div>
                 <button onClick={handleLogout} className="bg-red-900/20 border border-red-900/50 hover:bg-red-900/30 text-red-400 rounded-xl p-3 flex flex-col items-center justify-center transition-colors cursor-pointer group">
                    <LogOut size={16} className="mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] uppercase font-bold">Logout System</span>
                 </button>
            </div>

            <div className={`bg-slate-900/30 border border-slate-700/50 rounded-2xl p-4 min-h-[300px] ${sessionError ? 'opacity-50' : ''}`}>
                <ActiveInstances 
                    instances={instances} 
                    levelApiUrl={appConfig?.levelApiUrl}
                    bannerApiUrl={appConfig?.bannerApiUrl}
                    onDelete={handleDelete}
                    onStop={handleStop}
                    onStart={handleStart}
                    onRestart={handleRestart}
                    onToggleSafeMode={handleToggleSafeMode}
                    onUpdate={handleUpdateInstance}
                />
            </div>
            <HowToUse />
        </div>
      </div>
      <footer className="mt-8 text-slate-600 text-[10px] uppercase font-mono">
        © 2026 Star level up bot. All rights reserved
      </footer>
    </div>
  );
};

export default Routing;