import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Filter,
  PlusCircle,
  RefreshCw,
  Activity,
  Layers,
  CheckCircle,
  Lock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '../api/client';
import { CourtGrid, CourtMatrixItem, SlotItem } from '../components/CourtGrid';
import { SlotLockModal } from '../components/SlotLockModal';
import { RecurringBookingModal } from '../components/RecurringBookingModal';
import { ConflictResolutionModal } from '../components/ConflictResolutionModal';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { useOfflineSync, ConflictItem } from '../hooks/useOfflineSync';
import { cacheSchedule, getCachedSchedule } from '../lib/offline-storage';
import { AdminUser } from '../hooks/useAuth';

interface DashboardPageProps {
  admin: AdminUser;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ admin }) => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSport, setSelectedSport] = useState<string>('all');

  // Modals state
  const [activeLockSlot, setActiveLockSlot] = useState<{
    court: CourtMatrixItem;
    slot: SlotItem;
  } | null>(null);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [activeConflict, setActiveConflict] = useState<ConflictItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Real-time synchronization
  const { isConnected: isWsConnected } = useRealtimeSync(selectedDate, () => {
    queryClient.invalidateQueries({ queryKey: ['availability', selectedDate] });
  });

  // Offline synchronization
  const { isOnline, isSyncing, queueCount, queueAction } = useOfflineSync(
    (conflict) => {
      setActiveConflict(conflict);
    }
  );

  // Fetch Availability Matrix
  const {
    data: availabilityData,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['availability', selectedDate],
    queryFn: async () => {
      if (!navigator.onLine) {
        // Load from IndexedDB
        const cached = await getCachedSchedule(selectedDate);
        if (cached) return cached;
      }

      const { data } = await api.get(`/bookings/availability?date=${selectedDate}`);
      // Cache in IndexedDB for offline use
      await cacheSchedule(selectedDate, data);
      return data;
    },
    refetchInterval: isWsConnected ? false : 5000 // Fallback 5s polling when offline/ws disconnected
  });

  // Filter courts by sport if selected
  const courts: CourtMatrixItem[] = availabilityData?.courts || [];
  const filteredCourts =
    selectedSport === 'all'
      ? courts
      : courts.filter((c) => c.courtTypeSlug === selectedSport);

  // Quick Date Navigation
  const changeDateBy = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Handle clicking a slot in the matrix
  const handleSlotClick = async (court: CourtMatrixItem, slot: SlotItem) => {
    setActionError(null);

    // If slot is available, attempt to lock it
    if (slot.status === 'AVAILABLE') {
      if (!isOnline) {
        // Queue draft offline
        await queueAction({
          action: 'LOCK_SLOT',
          endpoint: '/bookings/lock',
          method: 'POST',
          payload: {
            courtId: court.courtId,
            bookingDate: selectedDate,
            startTime: slot.startTime,
            endTime: slot.endTime
          }
        });
        setActionError('Device offline: Slot hold request queued. Will sync upon reconnection.');
        return;
      }

      try {
        const { data } = await api.post('/bookings/lock', {
          courtId: court.courtId,
          bookingDate: selectedDate,
          startTime: slot.startTime,
          endTime: slot.endTime
        });

        // Set lock info on the slot and open modal
        const updatedSlot: SlotItem = {
          ...slot,
          status: 'LOCKED',
          lockInfo: {
            bookingId: data.bookingId,
            lockedByAdminId: admin.id,
            lockedByAdminName: admin.fullName,
            expiresAt: data.lockExpiresAt,
            remainingSeconds: data.expiresInSeconds,
            version: data.version
          }
        };

        setActiveLockSlot({ court, slot: updatedSlot });
        queryClient.invalidateQueries({ queryKey: ['availability', selectedDate] });
      } catch (err: any) {
        setActionError(err.response?.data?.error || 'Failed to lock slot');
      }
    } else if (slot.status === 'LOCKED' && slot.lockInfo?.lockedByAdminId === admin.id) {
      // Re-open hold modal
      setActiveLockSlot({ court, slot });
    }
  };

  // Handle Modal Release
  const handleCloseLockModal = async () => {
    if (activeLockSlot?.slot.lockInfo?.bookingId) {
      try {
        await api.post(`/bookings/unlock/${activeLockSlot.slot.lockInfo.bookingId}`, {
          courtId: activeLockSlot.court.courtId,
          bookingDate: selectedDate,
          startTime: activeLockSlot.slot.startTime,
          endTime: activeLockSlot.slot.endTime
        });
        queryClient.invalidateQueries({ queryKey: ['availability', selectedDate] });
      } catch (e) {
        // ignore
      }
    }
    setActiveLockSlot(null);
  };

  // Handle Booking Confirmation
  const handleConfirmBooking = async (formData: any) => {
    await api.put(`/bookings/confirm/${formData.bookingId}`, {
      ...formData,
      bookingDate: selectedDate,
      courtId: activeLockSlot?.court.courtId,
      startTime: activeLockSlot?.slot.startTime,
      endTime: activeLockSlot?.slot.endTime
    });
    setActiveLockSlot(null);
    queryClient.invalidateQueries({ queryKey: ['availability', selectedDate] });
  };

  // Calculate live occupancy stats
  const allSlots = courts.flatMap((c) => c.slots);
  const totalSlots = allSlots.length;
  const confirmedCount = allSlots.filter((s) => s.status === 'CONFIRMED').length;
  const lockedCount = allSlots.filter((s) => s.status === 'LOCKED').length;
  const availableCount = allSlots.filter((s) => s.status === 'AVAILABLE').length;

  const sportTabs = [
    { id: 'all', name: 'All Courts' },
    { id: 'badminton', name: 'Badminton' },
    { id: 'basketball', name: 'Basketball' },
    { id: 'cricket', name: 'Cricket' },
    { id: 'pickleball', name: 'Pickleball' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Controls: Date Navigator, Sport Tabs, Long-Term Trigger */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
        {/* Date Selector */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => changeDateBy(-1)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            onClick={() => changeDateBy(1)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="text-xs px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-brand-400 font-semibold hover:bg-slate-800 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Sport Category Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
          {sportTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedSport(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedSport === tab.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Action: Long Term Booking */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsRecurringModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 shadow-sm flex items-center space-x-1.5 transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-brand-400" />
            <span>Recurring Series</span>
          </button>

          <button
            onClick={() => refetch()}
            title="Refresh Grid"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-brand-400 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-slate-400 hover:text-white text-xs underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 rounded-xl border border-slate-800/80 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Available Slots</div>
            <div className="text-lg font-bold text-white leading-none mt-0.5">{availableCount}</div>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800/80 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Active Holds</div>
            <div className="text-lg font-bold text-amber-400 leading-none mt-0.5">{lockedCount}</div>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800/80 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Confirmed</div>
            <div className="text-lg font-bold text-blue-400 leading-none mt-0.5">{confirmedCount}</div>
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800/80 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Total Slots</div>
            <div className="text-lg font-bold text-slate-200 leading-none mt-0.5">{totalSlots}</div>
          </div>
        </div>
      </div>

      {/* Interactive Court Matrix Grid */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
        {isLoading && !availabilityData ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
            <span className="text-xs">Loading court availability...</span>
          </div>
        ) : (
          <CourtGrid
            courts={filteredCourts}
            currentAdminId={admin.id}
            onSlotClick={handleSlotClick}
          />
        )}
      </div>

      {/* Slot Lock & Confirmation Modal */}
      {activeLockSlot && (
        <SlotLockModal
          court={activeLockSlot.court}
          slot={activeLockSlot.slot}
          bookingDate={selectedDate}
          onClose={handleCloseLockModal}
          onConfirm={handleConfirmBooking}
        />
      )}

      {/* Long-Term / Recurring Booking Modal */}
      {isRecurringModalOpen && (
        <RecurringBookingModal
          courts={courts}
          onClose={() => setIsRecurringModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['availability', selectedDate] });
          }}
        />
      )}

      {/* Conflict Resolution Modal (Offline Sync) */}
      {activeConflict && (
        <ConflictResolutionModal
          conflict={activeConflict}
          onDismiss={() => setActiveConflict(null)}
          onSelectAlternative={() => {
            setActiveConflict(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};
