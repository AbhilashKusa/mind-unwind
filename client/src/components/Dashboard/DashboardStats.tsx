import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DashboardStatsProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    trendUp?: boolean;
    subtitle?: string;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ title, value, icon: Icon, trend, trendUp, subtitle }) => {
    return (
        <div className="p-4 bg-emerald-deep/60 border border-gold/20 rounded-sm shadow-glow-sm hover:border-gold/40 transition-all group">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold-muted group-hover:text-gold transition-colors">{title}</span>
                <Icon className="w-4 h-4 text-gold/70" />
            </div>
            <div className="flex items-end gap-2">
                <span className="text-2xl font-serif text-ivory">{value}</span>
                {trend && (
                    <span className={`text-[10px] font-bold mb-1 ${trendUp ? 'text-emerald-400' : 'text-crimson'}`}>
                        {trend}
                    </span>
                )}
            </div>
            {subtitle && (
                <p className="text-[10px] text-gray-500 mt-1 font-serif italic">{subtitle}</p>
            )}
        </div>
    );
};
