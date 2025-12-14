import React from 'react';
import { WorkspaceType } from '../types';
import { Briefcase, Home, Rocket } from 'lucide-react';

interface WorkspaceTabsProps {
    currentWorkspace: WorkspaceType;
    onChangeWorkspace: (workspace: WorkspaceType) => void;
}

const workspaces: { id: WorkspaceType; label: string; icon: React.ReactNode }[] = [
    { id: 'office', label: 'Office', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'personal', label: 'Personal', icon: <Home className="w-4 h-4" /> },
    { id: 'startup', label: 'Startup', icon: <Rocket className="w-4 h-4" /> },
];

export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({ currentWorkspace, onChangeWorkspace }) => {
    return (
        <div className="flex gap-2 mb-6 p-1 bg-emerald-deep/50 rounded-sm border border-gold-muted/20">
            {workspaces.map((ws) => (
                <button
                    key={ws.id}
                    onClick={() => onChangeWorkspace(ws.id)}
                    className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-bold transition-all rounded-sm
                        ${currentWorkspace === ws.id
                            ? 'bg-gold text-emerald-deep shadow-glow-gold'
                            : 'text-gold-muted hover:text-gold hover:bg-emerald-light/20'
                        }`}
                >
                    {ws.icon}
                    <span className="hidden sm:inline">{ws.label}</span>
                </button>
            ))}
        </div>
    );
};
