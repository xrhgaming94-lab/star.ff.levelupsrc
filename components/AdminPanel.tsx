
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, LogOut, Clock, Code, Shield, Settings, Link as LinkIcon, Save, Plus, X, Eye, User as UserIcon, Youtube, FileText, Loader2, RefreshCw, Activity, Image as ImageIcon, Play, StopCircle, Lock, Unlock, HelpCircle } from 'lucide-react';
import { fetchUsers, createUser, deleteUser, fetchAppConfig, saveAppConfig, updateAnyUserInstance } from '../services/auth';
import { launchInstanceApi, deleteInstanceApi } from '../services/api';
import { User, BotConfig, Instance } from '../types';
import ExpiryTimer from './ExpiryTimer';

interface AdminPanelProps {
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);
  
  // System Config State
  const [contactLink, setContactLink] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [twoFactorLink, setTwoFactorLink] = useState('');
  const [dashboardInstructions, setDashboardInstructions] = useState('');
  
  const [levelApiUrl, setLevelApiUrl] = useState('');
  const [bannerApiUrl, setBannerApiUrl] = useState('');
  
  const [safeModeDuration, setSafeModeDuration] = useState(60);
  
  // Loading States
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Processing State for Instance & User Actions
  const [processingInstanceId, setProcessingInstanceId] = useState<string | null>(null);
  
  // Credential Visibility
  const [revealedInstanceId, setRevealedInstanceId] = useState<string | null>(null);
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [limit, setLimit] = useState(1);
  
  // Bot List State
  const [bots, setBots] = useState<BotConfig[]>([
    {
      name: 'STAR LEVEL UP',
      addApiUrl: 'https://danger-friend-manager.vercel.app/adding_friend?uid=4417767484&password=6EF689D349CD0FBAA8952A51DA12ED640C0200056354902BC554ADAD5FE07A4E&friend_uid={target_uid}',
      removeApiUrl: 'https://danger-friend-manager.vercel.app/remove_friend?uid=4417767484&password=6EF689D349CD0FBAA8952A51DA12ED640C0200056354902BC554ADAD5FE07A4E&friend_uid={target_uid}'
    }
  ]);
  
  // Time State
  const [days, setDays] = useState(30);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  // Modal State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    refreshUsers();
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsConfigLoading(true);
    try {
        const config = await fetchAppConfig();
        setContactLink(config.contactLink ?? '');
        setYoutubeLink(config.youtubeLink ?? '');
        setTwoFactorLink(config.twoFactorTutorialLink ?? '');
        setDashboardInstructions(config.dashboardInstructions ?? '');
        
        setLevelApiUrl(config.levelApiUrl || 'https://ttttttttt555-nine.vercel.app/level/{uid}');
        setBannerApiUrl(config.bannerApiUrl || 'https://sagar-banner1.vercel.app/profile?uid={uid}');
        
        setSafeModeDuration(config.safeModeDurationMinutes || 60);
    } catch (e) {
        console.error("Failed to load config", e);
    } finally {
        setIsConfigLoading(false);
    }
  };

  const refreshUsers = async () => {
    setIsLoadingUsers(true);
    try {
        const fetchedUsers = await fetchUsers();
        setUsers(fetchedUsers);
    } catch (error) {
        console.error(error);
    } finally {
        setIsLoadingUsers(false);
    }
  };

  const ensureProtocol = (url: string) => {
    if (!url || url.trim() === '') return '';
    const clean = url.trim();
    if (!/^https?:\/\//i.test(clean)) {
        return `https://${clean}`;
    }
    return clean;
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfigLoading) return;

    setIsSaving(true);
    try {
        const configToSave = { 
            contactLink: ensureProtocol(contactLink),
            youtubeLink: ensureProtocol(youtubeLink),
            twoFactorTutorialLink: ensureProtocol(twoFactorLink),
            dashboardInstructions,
            levelApiUrl,
            bannerApiUrl,
            safeModeDurationMinutes: Number(safeModeDuration)
        };
        await saveAppConfig(configToSave);
        alert("System configuration saved successfully!");
        await loadConfig();
    } catch (error) {
        console.error("Save error", error);
        alert("Failed to save configuration.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleApproveStart = async (userObj: User, instance: Instance) => {
      setProcessingInstanceId(instance.id);
      try {
          const user = users.find(u => u.username === userObj.username);
          if (!user) throw new Error("User not found");
          
          let botListRaw = user.allowedBots || [];
          if (typeof botListRaw === 'object' && !Array.isArray(botListRaw)) {
              botListRaw = Object.values(botListRaw);
          }
          const botList = Array.isArray(botListRaw) ? botListRaw : [];
          const bot = botList.find(b => b && b.name === instance.botName) || botList[0];
          
          if (!bot || !bot.addApiUrl) throw new Error("Bot configuration or API URL is missing");
          
          await launchInstanceApi(instance.targetUid, bot.addApiUrl);
          
          let currentInstancesRaw = user.instances || [];
          if (typeof currentInstancesRaw === 'object' && !Array.isArray(currentInstancesRaw)) {
              currentInstancesRaw = Object.values(currentInstancesRaw);
          }
          const currentInstances = Array.isArray(currentInstancesRaw) ? currentInstancesRaw : [];
          
          const updatedInstances = currentInstances.map(i => i.id === instance.id ? {
              ...i, 
              status: 'active' as const,
              startedAt: new Date().toLocaleTimeString(),
              startedTimestamp: Date.now()
          } : i);
          await updateAnyUserInstance(user.username, updatedInstances);
          await refreshUsers();
          alert(`Started instance for ${instance.targetUid}`);
      } catch (error: any) {
          alert(`Start Failed: ${error.message}`);
      } finally {
          setProcessingInstanceId(null);
      }
  };

  const handleApproveStop = async (userObj: User, instance: Instance) => {
      setProcessingInstanceId(instance.id);
      try {
          const user = users.find(u => u.username === userObj.username);
          if (!user) throw new Error("User not found");
          
          let botListRaw = user.allowedBots || [];
          if (typeof botListRaw === 'object' && !Array.isArray(botListRaw)) {
              botListRaw = Object.values(botListRaw);
          }
          const botList = Array.isArray(botListRaw) ? botListRaw : [];
          const bot = botList.find(b => b && b.name === instance.botName) || botList[0];
          
          if (!bot || !bot.removeApiUrl) throw new Error("Bot configuration or API URL is missing");
          
          await deleteInstanceApi(instance.targetUid, bot.removeApiUrl);
          
          let currentInstancesRaw = user.instances || [];
          if (typeof currentInstancesRaw === 'object' && !Array.isArray(currentInstancesRaw)) {
              currentInstancesRaw = Object.values(currentInstancesRaw);
          }
          const currentInstances = Array.isArray(currentInstancesRaw) ? currentInstancesRaw : [];
          
          const updatedInstances = currentInstances.map(i => i.id === instance.id ? {
              ...i, 
              status: 'stopped' as const,
              safeMode: false
          } : i);
          await updateAnyUserInstance(user.username, updatedInstances);
          await refreshUsers();
          alert(`Stopped instance for ${instance.targetUid}`);
      } catch (error: any) {
           alert(`Stop Failed: ${error.message}`);
      } finally {
          setProcessingInstanceId(null);
      }
  };

  const handleApproveRestart = async (userObj: User, instance: Instance) => {
      setProcessingInstanceId(instance.id);
      try {
          const user = users.find(u => u.username === userObj.username);
          if (!user) throw new Error("User not found");
          
          let botListRaw = user.allowedBots || [];
          if (typeof botListRaw === 'object' && !Array.isArray(botListRaw)) {
              botListRaw = Object.values(botListRaw);
          }
          const botList = Array.isArray(botListRaw) ? botListRaw : [];
          const bot = botList.find(b => b && b.name === instance.botName) || botList[0];
          
          if (!bot || !bot.addApiUrl || !bot.removeApiUrl) throw new Error("Bot configuration or API URL is missing");
          
          // Stop first
          try {
              await deleteInstanceApi(instance.targetUid, bot.removeApiUrl);
          } catch (e) {
              console.warn("Stop API failed during restart, continuing to start...", e);
          }
          
          // Then start
          await launchInstanceApi(instance.targetUid, bot.addApiUrl);
          
          let currentInstancesRaw = user.instances || [];
          if (typeof currentInstancesRaw === 'object' && !Array.isArray(currentInstancesRaw)) {
              currentInstancesRaw = Object.values(currentInstancesRaw);
          }
          const currentInstances = Array.isArray(currentInstancesRaw) ? currentInstancesRaw : [];
          
          const updatedInstances = currentInstances.map(i => i.id === instance.id ? {
              ...i, 
              status: 'active' as const,
              startedAt: new Date().toLocaleTimeString(),
              startedTimestamp: Date.now()
          } : i);
          await updateAnyUserInstance(user.username, updatedInstances);
          await refreshUsers();
          alert(`Restarted instance for ${instance.targetUid}`);
      } catch (error: any) {
           alert(`Restart Failed: ${error.message}`);
      } finally {
          setProcessingInstanceId(null);
      }
  };
  
  const handleApproveDelete = async (userObj: User, instanceToDelete: Instance) => {
    if (!window.confirm(`Delete instance for ${instanceToDelete.targetUid}?`)) return;
    setProcessingInstanceId(instanceToDelete.id);
    try {
      const user = users.find(u => u.username === userObj.username);
      if (!user) throw new Error("User not found");

      // Attempt to call the stop API before removing from DB
      try {
        let botListRaw = user.allowedBots || [];
        if (typeof botListRaw === 'object' && !Array.isArray(botListRaw)) {
            botListRaw = Object.values(botListRaw);
        }
        const botList = Array.isArray(botListRaw) ? botListRaw : [];
        const bot = botList.find(b => b && b.name === instanceToDelete.botName) || botList[0];
        
        if (bot && bot.removeApiUrl) {
          await deleteInstanceApi(instanceToDelete.targetUid, bot.removeApiUrl);
        }
      } catch (apiErr) {
        console.warn("API stop failed during deletion, continuing with DB removal", apiErr);
      }

      let currentInstancesRaw = user.instances || [];
      if (typeof currentInstancesRaw === 'object' && !Array.isArray(currentInstancesRaw)) {
          currentInstancesRaw = Object.values(currentInstancesRaw);
      }
      const currentInstances = Array.isArray(currentInstancesRaw) ? currentInstancesRaw : [];
      
      const updatedInstances = currentInstances.filter(inst => inst.id !== instanceToDelete.id);
      
      // Optimistic update
      setUsers(prev => prev.map(u => u.username === user.username ? { ...u, instances: updatedInstances } : u));
      
      await updateAnyUserInstance(user.username, updatedInstances);
      await refreshUsers();
    } catch (error) {
      console.error("Error deleting instance:", error);
      alert("Error deleting instance from database");
    } finally {
      setProcessingInstanceId(null);
    }
  };

  const handleBotChange = (index: number, field: keyof BotConfig, value: string) => {
    const newBots = [...bots];
    newBots[index] = { ...newBots[index], [field]: value };
    setBots(newBots);
  };

  const addBotRow = () => {
    setBots([...bots, { name: '', addApiUrl: '', removeApiUrl: '' }]);
  };

  const removeBotRow = (index: number) => {
    if (bots.length > 1) {
      setBots(bots.filter((_, i) => i !== index));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return alert("Username and Password are required");
    setIsCreating(true);
    try {
      const expiryTime = Date.now() + 
        (days * 24 * 60 * 60 * 1000) + 
        (hours * 60 * 60 * 1000) + 
        (minutes * 60 * 1000);

      const newUser: User = {
        username,
        password,
        role: 'user',
        expiryDate: expiryTime,
        maxInstances: Number(limit),
        allowedBots: bots
      };

      await createUser(newUser);
      await refreshUsers();
      setUsername('');
      setPassword('');
      alert("User created successfully!");
    } catch (err: any) {
      alert(err.message);
    } finally {
        setIsCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, usernameToDelete: string) => {
    e.stopPropagation();
    e.preventDefault();

    if (!usernameToDelete) return alert("Error: User identifier missing.");
    if (!window.confirm(`Are you sure you want to permanently delete user '${usernameToDelete}' and ALL their data from the database?`)) return;
    
    setIsDeletingUser(usernameToDelete);

    try {
      // Direct call to delete from DB
      await deleteUser(usernameToDelete);
      
      // Update local state ONLY after successful DB removal
      setUsers(prev => prev.filter(u => u.username !== usernameToDelete));
      
      alert(`User ${usernameToDelete} was completely removed from the database.`);
    } catch (error) {
      console.error("Deletion failed:", error);
      alert(`Failed to delete user: ${error instanceof Error ? error.message : "Database Error"}`);
    } finally {
      setIsDeletingUser(null);
      // Force sync with server regardless of outcome
      await refreshUsers(); 
    }
  };

  return (
    <div className="min-h-screen bg-gaming-dark text-slate-200 p-4 md:p-8 flex flex-col">
      <div className="max-w-7xl mx-auto space-y-8 flex-grow w-full">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center border-b border-slate-700 pb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600/20 p-3 rounded-xl border border-purple-500/30">
              <Shield size={32} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">ADMIN PANEL</h1>
              <p className="text-sm text-slate-500 font-mono">Global Controller</p>
            </div>
          </div>
          <div className="flex gap-2">
             <button onClick={refreshUsers} className="p-2 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer text-slate-400 hover:text-white" disabled={isLoadingUsers}>
                 <RefreshCw size={18} className={isLoadingUsers ? "animate-spin" : ""} />
             </button>
            <button onClick={onLogout} className="flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer active:scale-95 ml-2">
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>

        {/* Global Instance Manager */}
        <div className="bg-gaming-panel border border-slate-700 rounded-xl p-6 shadow-xl overflow-hidden">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Activity size={20} className="text-cyan-400" />
                Global Instance Requests
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-700 text-xs font-bold text-slate-500 uppercase">
                            <th className="p-4">Owner</th>
                            <th className="p-4">Target UID</th>
                            <th className="p-4">Instance Type</th>
                            <th className="p-4">Login Method</th>
                            <th className="p-4">Credentials</th>
                            <th className="p-4">Safe Mode</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700 text-sm">
                        {users.flatMap(u => {
                            let insts = u.instances || [];
                            if (typeof insts === 'object' && !Array.isArray(insts)) {
                                insts = Object.values(insts);
                            }
                            const safeInsts = Array.isArray(insts) ? insts : [];
                            return safeInsts.map(inst => ({user: u, inst}));
                        }).map(({user, inst}) => (
                            <tr key={inst.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-bold text-slate-300">{user.displayName || user.username}</td>
                                <td className="p-4 font-mono text-cyan-400">{inst.targetUid}</td>
                                <td className="p-4 font-bold text-purple-400">{inst.botName}</td>
                                <td className="p-4">
                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${
                                        inst.loginMethod === 'guest' ? 'bg-slate-700 border-slate-600 text-slate-300' :
                                        inst.loginMethod === 'facebook' ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' :
                                        'bg-red-600/20 border-red-500/30 text-red-400'
                                    }`}>
                                        {inst.loginMethod}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        {revealedInstanceId === inst.id ? (
                                            <div className="text-xs font-mono bg-black/40 p-2 rounded border border-slate-600">
                                                {inst.loginMethod === 'guest' ? (
                                                    <>UID: {inst.guestUid}<br/>Pass: {inst.guestPassword}</>
                                                ) : (
                                                    <>Email: {inst.email}<br/>Pass: {inst.password}<br/>2FA: {inst.twoFactorCode}</>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-500 italic">Hidden</span>
                                        )}
                                        <button onClick={() => setRevealedInstanceId(revealedInstanceId === inst.id ? null : inst.id)} className="text-slate-400 hover:text-white">
                                            {revealedInstanceId === inst.id ? <Unlock size={14} /> : <Lock size={14} />}
                                        </button>
                                    </div>
                                </td>
                                <td className="p-4">{inst.safeMode ? "YES" : "NO"}</td>
                                <td className="p-4 font-bold uppercase text-xs">{inst.status.replace('_', ' ')}</td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {inst.status === 'pending_start' && (
                                            <button 
                                                onClick={() => handleApproveStart(user, inst)} 
                                                disabled={processingInstanceId === inst.id}
                                                className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {processingInstanceId === inst.id ? <Loader2 size={12} className="animate-spin" /> : "Start"}
                                            </button>
                                        )}
                                        {(inst.status === 'pending_stop' || inst.status === 'active') && (
                                            <button 
                                                onClick={() => handleApproveStop(user, inst)} 
                                                disabled={processingInstanceId === inst.id}
                                                className="bg-orange-600 text-white px-3 py-1 rounded text-xs hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {processingInstanceId === inst.id ? <Loader2 size={12} className="animate-spin" /> : "Stop"}
                                            </button>
                                        )}
                                        {inst.status === 'pending_restart' && (
                                            <button 
                                                onClick={() => handleApproveRestart(user, inst)} 
                                                disabled={processingInstanceId === inst.id}
                                                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {processingInstanceId === inst.id ? <Loader2 size={12} className="animate-spin" /> : "Restart"}
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleApproveDelete(user, inst)} 
                                            disabled={processingInstanceId === inst.id}
                                            className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processingInstanceId === inst.id ? <Loader2 size={12} className="animate-spin" /> : "Delete"}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Config & Create User */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-gaming-panel border border-slate-700 rounded-xl p-6 shadow-xl relative">
               {isConfigLoading && <div className="absolute inset-0 bg-slate-900/80 z-10 flex items-center justify-center rounded-xl"><Loader2 className="animate-spin text-blue-500" /></div>}
               <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Settings size={20} /> System Settings</h2>
               <form onSubmit={handleSaveConfig} className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-xs text-slate-400 block mb-1">Contact Link</label>
                    <input type="text" value={contactLink} onChange={e => setContactLink(e.target.value)} className="w-full bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm font-mono" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs text-slate-400 block mb-1">How To Use Link</label>
                    <input type="text" value={youtubeLink} onChange={e => setYoutubeLink(e.target.value)} className="w-full bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm font-mono" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs text-slate-400 block mb-1">2FA Tutorial Link</label>
                    <input type="text" value={twoFactorLink} onChange={e => setTwoFactorLink(e.target.value)} className="w-full bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm font-mono" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs text-slate-400 block mb-1">Dashboard Instructions</label>
                    <textarea value={dashboardInstructions} onChange={e => setDashboardInstructions(e.target.value)} className="w-full bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm font-mono h-24 resize-none" placeholder="Enter instructions here..."></textarea>
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs text-slate-400 block mb-1">Level API URL</label>
                    <input type="text" value={levelApiUrl} onChange={e => setLevelApiUrl(e.target.value)} className="w-full bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm font-mono" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs text-slate-400 block mb-1">Banner API URL</label>
                    <input type="text" value={bannerApiUrl} onChange={e => setBannerApiUrl(e.target.value)} className="w-full bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm font-mono" />
                 </div>
                 <button type="submit" disabled={isSaving} className="w-full font-bold py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors">{isSaving ? "Saving..." : "Save Config"}</button>
              </form>
            </div>

            <div className="bg-gaming-panel border border-slate-700 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><UserPlus size={20} /> Create New User</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <input required type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm" />
                <input required type="text" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm" />
                <div className="grid grid-cols-3 gap-2">
                    <input type="number" placeholder="Days" value={days} onChange={e => setDays(Number(e.target.value))} className="bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm" />
                    <input type="number" placeholder="Hours" value={hours} onChange={e => setHours(Number(e.target.value))} className="bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm" />
                    <input type="number" placeholder="Limit" value={limit} onChange={e => setLimit(Number(e.target.value))} className="bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm" />
                </div>
                <button type="submit" disabled={isCreating} className="w-full font-bold py-3 rounded bg-purple-600 hover:bg-purple-500 text-white transition-colors">{isCreating ? "Creating..." : "Create User"}</button>
              </form>
            </div>
          </div>

          {/* User List */}
          <div className="lg:col-span-7">
            <div className="bg-gaming-panel border border-slate-700 rounded-xl p-6 shadow-xl overflow-hidden">
               <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Users size={20} /> Database Users</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs font-bold text-slate-500 uppercase">
                      <th className="p-4">Username</th>
                      <th className="p-4">Limit</th>
                      <th className="p-4">Time Remaining</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-sm">
                    {isLoadingUsers ? (
                         <tr><td colSpan={4} className="p-8 text-center text-slate-500"><Loader2 className="animate-spin mx-auto" /></td></tr>
                    ) : (
                        users.map((user) => (
                            <tr key={user.username} className={`hover:bg-white/5 transition-colors ${isDeletingUser === user.username ? 'opacity-30' : ''}`}>
                            <td className="p-4 font-bold text-white">
                                {user.displayName || user.username}
                                {isDeletingUser === user.username && <span className="ml-2 text-[10px] text-red-400 font-mono animate-pulse">DELETING...</span>}
                            </td>
                            <td className="p-4 text-slate-300">{user.maxInstances || 1}</td>
                            <td className="p-4"><ExpiryTimer expiryDate={user.expiryDate} /></td>
                            <td className="p-4 text-right">
                                <div className="flex justify-end gap-2">
                                <button onClick={() => setSelectedUser(user)} className="text-blue-400 p-2 hover:bg-blue-500/10 rounded transition-colors"><Eye size={16} /></button>
                                <button 
                                    type="button" 
                                    onClick={(e) => handleDelete(e, user.username)} 
                                    disabled={!!isDeletingUser}
                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                                >
                                    <Trash2 size={16} />
                                </button>
                                </div>
                            </td>
                            </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="bg-gaming-panel border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-800/50 p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2"><UserIcon size={18}/> User Details</h3>
                    <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto text-sm">
                    <div className="p-3 bg-black/30 rounded border border-slate-700/50">
                        <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Display Name</label>
                        <div className="text-white font-mono">{selectedUser.displayName || selectedUser.username}</div>
                    </div>
                    <div className="p-3 bg-black/30 rounded border border-slate-700/50">
                        <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Database Key</label>
                        <div className="text-slate-500 font-mono text-xs">{selectedUser.username}</div>
                    </div>
                    <div className="p-3 bg-black/30 rounded border border-slate-700/50">
                        <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Password</label>
                        <div className="text-gaming-neon font-mono select-all cursor-copy">{selectedUser.password}</div>
                    </div>
                </div>
            </div>
        </div>
      )}
      
      <footer className="mt-8 py-6 text-center text-slate-600 text-[10px] uppercase font-mono border-t border-slate-800">
        © 2026 Star level up bot. All rights reserved
      </footer>
    </div>
  );
};

export default AdminPanel;
