import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface NexCourtDB extends DBSchema {
  schedule_cache: {
    key: string; // date 'YYYY-MM-DD'
    value: {
      date: string;
      data: any;
      cachedAt: number;
    };
  };
  offline_queue: {
    key: string; // uuid
    value: {
      id: string;
      action: 'LOCK_SLOT' | 'CONFIRM_BOOKING' | 'CANCEL_BOOKING';
      endpoint: string;
      method: 'POST' | 'PUT';
      payload: any;
      createdAt: number;
      retryCount: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<NexCourtDB>> | null = null;

export function getOfflineDB() {
  if (!dbPromise) {
    dbPromise = openDB<NexCourtDB>('nexcourt_db_v1', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('schedule_cache')) {
          db.createObjectStore('schedule_cache', { keyPath: 'date' });
        }
        if (!db.objectStoreNames.contains('offline_queue')) {
          db.createObjectStore('offline_queue', { keyPath: 'id' });
        }
      }
    });
  }
  return dbPromise;
}

export async function cacheSchedule(date: string, data: any) {
  try {
    const db = await getOfflineDB();
    await db.put('schedule_cache', {
      date,
      data,
      cachedAt: Date.now()
    });
  } catch (err) {
    console.error('Failed to cache schedule in IndexedDB:', err);
  }
}

export async function getCachedSchedule(date: string) {
  try {
    const db = await getOfflineDB();
    const entry = await db.get('schedule_cache', date);
    return entry?.data || null;
  } catch (err) {
    console.error('Failed to read schedule from IndexedDB:', err);
    return null;
  }
}

export async function enqueueOfflineAction(action: {
  action: 'LOCK_SLOT' | 'CONFIRM_BOOKING' | 'CANCEL_BOOKING';
  endpoint: string;
  method: 'POST' | 'PUT';
  payload: any;
}) {
  const db = await getOfflineDB();
  const id = crypto.randomUUID();
  const item = {
    id,
    ...action,
    createdAt: Date.now(),
    retryCount: 0
  };
  await db.put('offline_queue', item);
  return item;
}

export async function getOfflineQueue() {
  const db = await getOfflineDB();
  return await db.getAll('offline_queue');
}

export async function removeOfflineQueueItem(id: string) {
  const db = await getOfflineDB();
  await db.delete('offline_queue', id);
}
