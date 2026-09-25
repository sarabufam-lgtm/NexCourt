import React from 'react';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { Header } from './components/Header';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { useOfflineSync } from './hooks/useOfflineSync';

export const App: React.FC = () => {
  const { admin, isAuthenticated, login, logout } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const { isConnected: isWsConnected } = useRealtimeSync(today);
  const { isOnline, isSyncing, queueCount } = useOfflineSync();

  if (!isAuthenticated || !admin) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        admin={admin}
        onLogout={logout}
        isOnline={isOnline}
        isSyncing={isSyncing}
        queueCount={queueCount}
        isWsConnected={isWsConnected}
      />
      <main className="flex-1">
        <DashboardPage admin={admin} />
      </main>
    </div>
  );
};
