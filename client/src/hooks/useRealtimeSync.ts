import { useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';

export interface LockEvent {
  courtId: string;
  startTime: string;
  endTime: string;
  bookingId: string;
  lockedByAdminId: string;
  lockedByAdminName?: string;
  expiresAt: string;
  version: number;
}

export function useRealtimeSync(selectedDate: string, onEventReceived?: () => void) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const token = localStorage.getItem('nexcourt_access_token');
    if (token && !socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('join:date', selectedDate);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      setIsConnected(true);
      socket.emit('join:date', selectedDate);
    }

    // Live Event Listeners
    const handleUpdate = () => {
      if (onEventReceived) {
        onEventReceived();
      }
    };

    socket.on('booking:locked', handleUpdate);
    socket.on('booking:unlocked', handleUpdate);
    socket.on('booking:confirmed', handleUpdate);
    socket.on('booking:cancelled', handleUpdate);

    return () => {
      socket.emit('leave:date', selectedDate);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('booking:locked', handleUpdate);
      socket.off('booking:unlocked', handleUpdate);
      socket.off('booking:confirmed', handleUpdate);
      socket.off('booking:cancelled', handleUpdate);
    };
  }, [selectedDate, onEventReceived]);

  return { isConnected };
}
