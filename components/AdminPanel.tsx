import React, { useState, useEffect, useRef } from 'react';
import { Users, UserPlus, Trash2, LogOut, Clock, Code, Shield, Settings, Link as LinkIcon, Save, Plus, X, Eye, User as UserIcon, Youtube, FileText, Loader2, Download, Upload } from 'lucide-react';
import { getStoredUsers, createUser, deleteUser, getAppConfig, saveAppConfig } from '../services/auth';
import { User, BotConfig } from '../types';
import ExpiryTimer from './ExpiryTimer';

interface AdminPanelProps {
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  
  // System Config State
  const [contactLink, setContactLink] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [dashboardInstructions, setDashboardInstructions] = useState('');
  
  // Loading States
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [limit, setLimit] = useState(1);
  
  // Bot List State
  const [bots, setBots] = useState<BotConfig[]>([
    {
      name: 'FF LEVEL UP',
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

  // Backup Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshUsers();
    const config = getAppConfig();
    setContactLink(config.contactLink || '');
    setYoutubeLink(config.youtubeLink || '');
    setDashboardInstructions(config.dashboardInstructions || '');
  }, []);

  const refreshUsers = () => {
    setUsers(getStoredUsers());
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Direct save without artificial delay
    saveAppConfig({ 
        contactLink,
        youtubeLink,
        dashboardInstructions
    });
    setIsSaving(false);
    alert("System configuration saved!");
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
      const newBots = bots.filter((_, i) => i !== index);
      setBots(newBots);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
        alert("Username and Password are required");
        return;
    }

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

      // Create immediately
      createUser(newUser);
      
      // Update UI immediately
      refreshUsers();
      
      // Reset sensitive fields but keep config for easy reuse
      setUsername('');
      setPassword('');
      alert("User created successfully!");
    } catch (err: any) {
      alert(err.message);
    } finally {
        setIsCreating(false);
    }
  };

  const handleDelete = (username: string) => {
    if (confirm(`Delete user ${username}?`)) {
      deleteUser(username);
      refreshUsers();
    }
  };

  // Backup & Restore Logic
  const handleBackup = () => {
    const dataStr = JSON.stringify(users, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ff-bot-users-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const parsedUsers = JSON.parse(json);
        
        if (!Array.isArray(parsedUsers)) throw new Error("Invalid file format");
        
        // Basic validation of user object structure could go here
        
        // Save to local storage (overwrites current)
        localStorage.setItem("ff_bot_users", JSON.stringify(parsedUsers));
        refreshUsers();
        alert(`Successfully restored ${parsedUsers.length} users.`);
      } catch (err) {
        alert("Failed to restore users. Invalid JSON file.");
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
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
              <p className="text-sm text-slate-500 font-mono">User Management System</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleBackup} className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-500/20 transition-colors cursor-pointer active:scale-95 border border-blue-500/20">
              <Download size={18} /> Backup
            </button>
            <button onClick={handleRestoreClick} className="flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-2 rounded-lg hover:bg-green-500/20 transition-colors cursor-pointer active:scale-95 border border-green-500/20">
              <Upload size={18} /> Restore
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleRestoreFile} 
              accept=".json" 
              className="hidden" 
            />
            <button onClick={onLogout} className="flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer active:scale-95 ml-2">
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Config & Create User */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* System Config */}
            <div className="bg-gaming-panel border border-slate-700 rounded-xl p-6 shadow-xl">
               <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Settings size={20} className="text-slate-400" />
                System Settings
              </h2>
              <form onSubmit={handleSaveConfig} className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-xs text-slate-400 block mb-1 flex items-center gap-2"><LinkIcon size={12}/> Login Contact Link</label>
                    <input type="text" value={contactLink} onChange={e => setContactLink(e.target.value)} placeholder="https://wa.me/..." className="w-full bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm font-mono" />
                 </div>
                 
                 <div className="space-y-1">
                    <label className="text-xs text-slate-400 block mb-1 flex items-center gap-2"><Youtube size={12}/> How To Use Link (YouTube)</label>
                    <input type="text" value={youtubeLink} onChange={e => setYoutubeLink(e.target.value)} placeholder="https://youtube.com/..." className="w-full bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm font-mono" />
                 </div>

                 <div className="space-y-1">
                    <label className="text-xs text-slate-400 block mb-1 flex items-center gap-2"><FileText size={12}/> Dashboard Instructions (Overrides Default)</label>
                    <textarea 
                        value={dashboardInstructions} 
                        onChange={e => setDashboardInstructions(e.target.value)} 
                        placeholder="Enter custom instructions here. Leave empty to use default style." 
                        className="w-full bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm font-mono min-h-[100px]" 
                    />
                 </div>

                 <button 
                    type="submit" 
                    disabled={isSaving}
                    className={`w-full font-bold py-2 rounded-lg shadow transition-colors flex items-center justify-center gap-2 text-sm ${isSaving ? 'bg-slate-700 cursor-wait text-slate-400' : 'bg-slate-700 hover:bg-slate-600 text-white cursor-pointer active:scale-95'}`}
                >
                   {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14}/>} 
                   {isSaving ? "Saving..." : "Save Config"}
                 </button>
              </form>
            </div>

            {/* Create User Form */}
            <div className="bg-gaming-panel border border-slate-700 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <UserPlus size={20} className="text-gaming-neon" />
                Create New User
              </h2>

              <form onSubmit={handleCreate} className="space-y-5">
                {/* Credentials */}
                <div className="space-y-4 p-4 bg-black/20 rounded-lg border border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-500 uppercase">Login Details</h3>
                  <input required type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm" />
                  <input required type="text" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm" />
                </div>

                {/* Global Limits */}
                 <div className="space-y-4 p-4 bg-black/20 rounded-lg border border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-500 uppercase">Limits & Expiry</h3>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Max Active Instances (Total)</label>
                    <input required type="number" min="1" value={limit} onChange={e => setLimit(Number(e.target.value))} className="w-full bg-black/40 border border-slate-600 text-white px-3 py-2 rounded text-sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div>
                        <label className="text-[10px] text-slate-400">Days</label>
                        <input type="number" min="0" value={days} onChange={e => setDays(Number(e.target.value))} className="w-full bg-black/40 border border-slate-600 text-white px-2 py-2 rounded text-sm" />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-400">Hours</label>
                        <input type="number" min="0" value={hours} onChange={e => setHours(Number(e.target.value))} className="w-full bg-black/40 border border-slate-600 text-white px-2 py-2 rounded text-sm" />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-400">Mins</label>
                        <input type="number" min="0" value={minutes} onChange={e => setMinutes(Number(e.target.value))} className="w-full bg-black/40 border border-slate-600 text-white px-2 py-2 rounded text-sm" />
                    </div>
                  </div>
                </div>

                {/* Bot Configs */}
                <div className="space-y-4 p-4 bg-black/20 rounded-lg border border-slate-700/50">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Bot Configurations</h3>
                    <button type="button" onClick={addBotRow} className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded flex items-center gap-1 hover:bg-green-500/30 cursor-pointer active:scale-95">
                      <Plus size={12} /> Add Bot
                    </button>
                  </div>
                  
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 console-scroll">
                    {bots.map((bot, index) => (
                      <div key={index} className="bg-black/40 p-3 rounded border border-slate-600 relative group">
                        {bots.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeBotRow(index)} 
                            className="absolute top-2 right-2 text-slate-600 hover:text-red-400 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        )}
                        <div className="space-y-2">
                          <input 
                            required 
                            type="text" 
                            placeholder="Bot Name (e.g. Bot 1)" 
                            value={bot.name} 
                            onChange={e => handleBotChange(index, 'name', e.target.value)} 
                            className="w-full bg-transparent border-b border-slate-700 text-white px-1 py-1 text-sm focus:border-gaming-neon outline-none" 
                          />
                          <input 
                            required 
                            type="text" 
                            placeholder="Adding API URL" 
                            value={bot.addApiUrl} 
                            onChange={e => handleBotChange(index, 'addApiUrl', e.target.value)} 
                            className="w-full bg-transparent border-b border-slate-700 text-slate-300 px-1 py-1 text-xs font-mono focus:border-gaming-neon outline-none" 
                          />
                          <input 
                            required 
                            type="text" 
                            placeholder="Removing API URL" 
                            value={bot.removeApiUrl} 
                            onChange={e => handleBotChange(index, 'removeApiUrl', e.target.value)} 
                            className="w-full bg-transparent border-b border-slate-700 text-slate-300 px-1 py-1 text-xs font-mono focus:border-gaming-neon outline-none" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                    type="submit" 
                    disabled={isCreating}
                    className={`w-full font-bold py-3 rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2 ${isCreating ? 'bg-purple-800 cursor-wait text-slate-300' : 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer active:scale-95'}`}
                >
                  {isCreating ? <Loader2 size={18} className="animate-spin" /> : null}
                  {isCreating ? "Creating User..." : "Create User"}
                </button>
              </form>
            </div>
          </div>

          {/* User List */}
          <div className="lg:col-span-7">
            <div className="bg-gaming-panel border border-slate-700 rounded-xl p-6 shadow-xl overflow-hidden">
               <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Users size={20} className="text-blue-400" />
                Existing Users
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-4">Username</th>
                      <th className="p-4">Allowed Bots</th>
                      <th className="p-4">Limit</th>
                      <th className="p-4">Time Remaining</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-sm">
                    {users.map((user) => (
                      <tr key={user.username} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold text-white">{user.username}</td>
                        <td className="p-4 text-slate-300">
                          {user.allowedBots ? (
                              <div className="flex flex-wrap gap-1">
                                  {user.allowedBots.slice(0, 2).map((b, i) => (
                                      <span key={i} className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded">{b.name}</span>
                                  ))}
                                  {user.allowedBots.length > 2 && <span className="text-[10px] text-slate-500">+{user.allowedBots.length - 2} more</span>}
                              </div>
                          ) : (
                              <span className="text-xs text-red-500">Legacy Data</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-300">{user.maxInstances || user.config?.maxInstances || 1}</td>
                        <td className="p-4">
                          <ExpiryTimer expiryDate={user.expiryDate} />
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => setSelectedUser(user)}
                                className="text-blue-400 hover:text-blue-300 p-2 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer active:scale-95"
                                title="View Details & Password"
                            >
                                <Eye size={16} />
                            </button>
                            <button 
                                onClick={() => handleDelete(user.username)}
                                className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer active:scale-95"
                                title="Delete User"
                            >
                                <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 italic">No users found. Create one to get started.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gaming-panel border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="bg-slate-800/50 p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <UserIcon size={18} className="text-gaming-neon"/> 
                        User Details
                    </h3>
                    <button 
                        onClick={() => setSelectedUser(null)} 
                        className="text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 p-1 rounded transition-colors cursor-pointer active:scale-95"
                    >
                        <X size={20}/>
                    </button>
                </div>
                
                {/* Modal Body */}
                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Credentials Section */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Shield size={12} /> Credentials
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-black/30 p-3 rounded-lg border border-slate-700/50">
                                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Username</label>
                                <div className="text-white font-mono text-sm break-all">{selectedUser.username}</div>
                            </div>
                            <div className="bg-black/30 p-3 rounded-lg border border-slate-700/50">
                                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Password</label>
                                <div className="text-gaming-neon font-mono text-sm break-all">{selectedUser.password}</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Limits Section */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={12} /> Plan Details
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/30 p-3 rounded-lg border border-slate-700/50">
                                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Max Instances</label>
                                <div className="text-white font-mono text-sm">{selectedUser.maxInstances || 1}</div>
                            </div>
                            <div className="bg-black/30 p-3 rounded-lg border border-slate-700/50">
                                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Expires On</label>
                                <div className="text-white font-mono text-xs leading-5">
                                    {new Date(selectedUser.expiryDate).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bots Section */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Code size={12} /> Assigned Bots
                        </h4>
                        <div className="space-y-2 bg-black/20 p-3 rounded-lg border border-slate-700/50 max-h-48 overflow-y-auto console-scroll">
                            {selectedUser.allowedBots ? selectedUser.allowedBots.map((b, i) => (
                                <div key={i} className="bg-slate-800/80 p-3 rounded border border-slate-700 flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-gaming-neon">{b.name}</span>
                                        <span className="text-[10px] text-slate-500 bg-black/40 px-1.5 py-0.5 rounded">BOT #{i+1}</span>
                                    </div>
                                    <div className="space-y-1 mt-1">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-500 uppercase">Add URL</span>
                                            <span className="text-[10px] text-slate-400 font-mono break-all leading-tight">{b.addApiUrl}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-500 uppercase">Remove URL</span>
                                            <span className="text-[10px] text-slate-400 font-mono break-all leading-tight">{b.removeApiUrl}</span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-slate-500 text-xs italic p-2 text-center">Legacy Data - No detailed bot config available</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
      
      <footer className="mt-8 py-6 text-center text-slate-600 text-[10px] uppercase tracking-widest font-mono border-t border-slate-800">
        © 2026 Star level up bot. All rights reserved
      </footer>
    </div>
  );
};

export default AdminPanel;