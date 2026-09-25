import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import {
  enqueueOfflineAction,
  getOfflineQueue,
  removeOfflineQueueItem
} from '../lib/offline-storage';

export interface ConflictItem {
  id: string;
  action: string;
  payload: any;
  error: string;
}

export function useOfflineSync(onConflictDetected?: (conflict: ConflictItem) => void) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [queueCount, setQueueCount] = useState<number>(0);

  const refreshQueueCount = useCallback(async () => {
    try {
      const queue = await getOfflineQueue();
      setQueueCount(queue.length);
    } catch {
      // ignore
    }
  }, []);

  const syncPendingActions = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);

    try {
      const queue = await getOfflineQueue();
      for (const item of queue) {
        try {
          if (item.method === 'POST') {
            await api.post(item.endpoint, item.payload);
          } else if (item.method === 'PUT') {
            await api.put(item.endpoint, item.payload);
          }
          await removeOfflineQueueItem(item.id);
        } catch (err: any) {
          if (err.response?.status === 409) {
            // Slot conflict detected upon reconnect
            if (onConflictDetected) {
              onConflictDetected({
                id: item.id,
                action: item.action,
                payload: item.payload,
                error: err.response?.data?.error || 'Slot was reserved by another admin while offline'
              });
            }
            await removeOfflineQueueItem(item.id);
          }
        }
      }
    } finally {
      setIsSyncing(false);
      refreshQueueCount();
    }
  }, [isSyncing, onConflictDetected, refreshQueueCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    refreshQueueCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingActions, refreshQueueCount]);

  const queueAction = async (action: {
    action: 'LOCK_SLOT' | 'CONFIRM_BOOKING' | 'CANCEL_BOOKING';
    endpoint: string;
    method: 'POST' | 'PUT';
    payload: any;
  }) => {
    const item = await enqueueOfflineAction(action);
    await refreshQueueCount();
    return item;
  };

  return {
    isOnline,
    isSyncing,
    queueCount,
    queueAction,
    syncPendingActions
  };
}
