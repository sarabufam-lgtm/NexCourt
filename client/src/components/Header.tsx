import React from 'react';
import { Wifi, WifiOff, RefreshCw, LogOut, Shield, MapPin, Calendar } from 'lucide-react';
import { AdminUser } from '../hooks/useAuth';

interface HeaderProps {
  admin: AdminUser | null;
  onLogout: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  queueCount: number;
  isWsConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  admin,
  onLogout,
  isOnline,
  isSyncing,
  queueCount,
  isWsConnected
}) => {
  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Venue */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <span className="font-extrabold text-white text-xl tracking-tight">NC</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg text-white leading-none tracking-tight">NexCourt</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
                PWA
              </span>
            </div>
            <div className="flex items-center text-xs text-slate-400 mt-0.5">
              <MapPin className="w-3 h-3 mr-1 text-slate-500" />
              <span>{admin?.facilityName || 'Al Nahda Boys School Sports Complex'}</span>
            </div>
          </div>
        </div>

        {/* Status Indicators & Admin Profile */}
        <div className="flex items-center space-x-3">
          {/* Connectivity Status Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
            {isOnline ? (
              <span className="flex items-center text-emerald-400">
                <Wifi className="w-3.5 h-3.5 mr-1" />
                <span>{isWsConnected ? 'Live' : 'Polling'}</span>
              </span>
            ) : (
              <span className="flex items-center text-amber-400">
                <WifiOff className="w-3.5 h-3.5 mr-1" />
                <span>Offline</span>
              </span>
            )}
            {queueCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-medium">
                {queueCount} queued
              </span>
            )}
            {isSyncing && (
              <RefreshCw className="w-3 h-3 ml-1 text-brand-400 animate-spin" />
            )}
          </div>

          {/* Admin User Chip */}
          {admin && (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
                {admin.fullName?.charAt(0) || 'A'}
              </div>
              <div className="hidden md:block text-left text-xs">
                <div className="font-semibold text-slate-200">{admin.fullName}</div>
                <div className="text-[10px] text-brand-400 capitalize flex items-center">
                  <Shield className="w-2.5 h-2.5 mr-0.5" />
                  {admin.role.replace('_', ' ')}
                </div>
              </div>

              <button
                onClick={onLogout}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
