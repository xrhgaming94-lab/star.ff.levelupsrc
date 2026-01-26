import React from 'react';
import { Instance } from '../types';
import { Trash2, Activity, Bot, User } from 'lucide-react';

interface ActiveInstancesProps {
  instances: Instance[];
  onDelete: (id: string, uid: string) => void;
}

const ActiveInstances: React.FC<ActiveInstancesProps> = ({ instances, onDelete }) => {
  if (instances.length === 0) {
    return (
      <div className="bg-gaming-panel rounded-xl p-8 text-center border border-slate-700/50 border-dashed h-full flex flex-col items-center justify-center">
        <Bot size={48} className="text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-400">No Active Instances</h3>
        <p className="text-sm text-slate-500 mt-2">Launch a bot to see it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Activity className="text-green-500" />
        Running Instances <span className="bg-slate-700 text-xs px-2 py-0.5 rounded-full text-white">{instances.length}</span>
      </h2>
      
      <div className="grid gap-3">
        {instances.map((instance) => (
          <div 
            key={instance.id} 
            className="bg-gaming-panel border border-slate-700 rounded-lg p-4 flex items-center justify-between shadow-lg hover:border-gaming-accent/50 transition-colors group"
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-xs font-bold bg-gaming-accent/20 text-blue-300 px-2 py-0.5 rounded border border-gaming-accent/30">
                    {instance.botName}
                 </span>
                 <span className="text-[10px] text-slate-500 font-mono">{instance.startedAt}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <User size={14} className="text-slate-400" />
                <span className="font-mono text-sm">UID: {instance.targetUid}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                 <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${instance.status === 'removing' ? 'bg-red-400' : 'bg-green-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${instance.status === 'removing' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                </span>
                <span className="text-xs uppercase font-bold text-slate-400">
                    {instance.status === 'removing' ? 'Stopping...' : 'Online'}
                </span>
              </div>

              <button
                onClick={() => onDelete(instance.id, instance.targetUid)}
                disabled={instance.status === 'removing'}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 p-2 rounded-md transition-colors border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Terminate Instance"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActiveInstances;