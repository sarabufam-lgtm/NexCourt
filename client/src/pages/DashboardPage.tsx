import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  PlusCircle,
  RefreshCw,
  Activity,
  Layers,
  CheckCircle,
  Lock,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Users
} from 'lucide-react';
import { api } from '../api/client';
import { CourtGrid, CourtMatrixItem, SlotItem } from '../components/CourtGrid';
import { SlotLockModal } from '../components/SlotLockModal';
import { RecurringBookingModal } from '../components/RecurringBookingModal';
import { RecurringBookingsList } from '../components/RecurringBookingsList';
import { ConflictResolutionModal } from '../components/ConflictResolutionModal';
import { BookingDetailsModal } from '../components/BookingDetailsModal';
import { CustomerDirectoryModal } from '../components/CustomerDirectoryModal';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { useOfflineSync, ConflictItem } from '../hooks/useOfflineSync';
import { cacheSchedule, getCachedSchedule } from '../lib/offline-storage';
import { AdminUser } from '../hooks/useAuth';

interface DashboardPageProps {
  admin: AdminUser;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ admin }) => {
  const queryClient = useQueryClient();
  const [mainTab, setMainTab] = useState<'daily-grid' | 'recurring-series'>('daily-grid');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Default to badminton so Badminton booking card is highlighted on page load
  const [selectedSport, setSelectedSport] = useState<string>('badminton');

  // Device detection & View Mode switcher (Enforce mobile view on mobile screens)
  const [isScreenMobile, setIsScreenMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [viewMode, setViewMode] = useState<'pc' | 'mobile'>('pc');

  useEffect(() => {
    const handleResize = () => {
      setIsScreenMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // On real mobile devices (<768px), enforce mobile view only!
  const effectiveViewMode = isScreenMobile ? 'mobile' : viewMode;

  // Modals state
  const [activeLockSlot, setActiveLockSlot] = useState<{
    court: CourtMatrixItem;
    slot: SlotItem;
  } | null>(null);
  const [selectedConfirmedSlot, setSelectedConfirmedSlot] = useState<{
    court: CourtMatrixItem;
    slot: SlotItem;
  } | null>(null);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isCustomerDirectoryOpen, setIsCustomerDirectoryOpen] = useState(false);
  const [activeConflict, setActiveConflict] = useState<ConflictItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Real-time synchronization
  const { isConnected: isWsConnected } = useRealtimeSync(selectedDate, () => {
    queryClient.invalidateQueries({ queryKey: ['availability', selectedDate] });
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['recurring-series'] });
  });

  // Offline synchronization
  const { isOnline, queueAction } = useOfflineSync(
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
        const cached = await getCachedSchedule(selectedDate);
        if (cached) return cached;
      }

      const { data } = await api.get(`/bookings/availability?date=${selectedDate}`);
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

  // Handle clicking an available or held slot
  const handleSlotClick = async (court: CourtMatrixItem, slot: SlotItem) => {
    setActionError(null);

    if (slot.status === 'AVAILABLE') {
      if (!isOnline) {
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
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  };

  // Live occupancy stats
  const allSlots = courts.flatMap((c) => c.slots);
  const totalSlots = allSlots.length;
  const confirmedCount = allSlots.filter((s) => s.status === 'CONFIRMED').length;
  const lockedCount = allSlots.filter((s) => s.status === 'LOCKED').length;
  const availableCount = allSlots.filter((s) => s.status === 'AVAILABLE').length;

  // Sport Booking Cards definition
  const sportCards = [
    {
      id: 'badminton',
      name: 'Badminton',
      icon: '🏸',
      courtsCount: 6,
      courtsRange: 'BMC1 - BMC6',
      badge: '6 Courts'
    },
    {
      id: 'basketball',
      name: 'Basketball',
      icon: '🏀',
      courtsCount: 3,
      courtsRange: 'BBC1 - BBC3',
      badge: '3 Courts'
    },
    {
      id: 'cricket',
      name: 'Cricket',
      icon: '🏏',
      courtsCount: 1,
      courtsRange: 'CRC1',
      badge: '1 Pitch'
    },
    {
      id: 'pickleball',
      name: 'Pickleball',
      icon: '🏓',
      courtsCount: 6,
      courtsRange: 'PBC1 - PBC6',
      badge: '6 Courts'
    },
    {
      id: 'all',
      name: 'All Sports',
      icon: '🏟️',
      courtsCount: 16,
      courtsRange: 'All 16 Courts',
      badge: '16 Total'
    }
  ];

  // Render Inner Daily Grid Content
  const renderDailyGridContent = () => (
    <div className="space-y-3 sm:space-y-4">
      {/* Date Navigator */}
      <div className="flex items-center justify-between gap-2 glass-panel p-2.5 sm:p-3 rounded-2xl">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => changeDateBy(-1)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm font-bold text-slate-100 focus:outline-none focus:border-brand-500 text-center"
          />

          <button
            onClick={() => changeDateBy(1)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="text-[11px] sm:text-xs px-2.5 py-1.5 sm:py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-brand-400 font-bold hover:bg-slate-800 transition-colors"
          >
            Today
          </button>
        </div>

        <button
          onClick={() => refetch()}
          title="Refresh availability"
          className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-brand-400 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Sport Booking Cards: Badminton is highlighted by default */}
      {effectiveViewMode === 'pc' ? (
        /* PC View: 5-column expansive grid cards */
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {sportCards.map((card) => {
            const isSelected = selectedSport === card.id;
            return (
              <button
                key={card.id}
                onClick={() => setSelectedSport(card.id)}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-brand-500/20 border-brand-500 text-brand-200 ring-2 ring-brand-500/40 shadow-lg shadow-brand-500/10'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{card.icon}</span>
                  {isSelected ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-500 text-slate-950">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400">
                      {card.badge}
                    </span>
                  )}
                </div>
                <div>
                  <div className={`font-black text-sm ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                    {card.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {card.courtsRange}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Mobile View: Horizontal scrolling touch carousel */
        <div className="flex overflow-x-auto gap-2 no-scrollbar py-1">
          {sportCards.map((card) => {
            const isSelected = selectedSport === card.id;
            return (
              <button
                key={card.id}
                onClick={() => setSelectedSport(card.id)}
                className={`px-3 py-2 rounded-xl border text-left shrink-0 transition-all flex items-center space-x-2 ${
                  isSelected
                    ? 'bg-brand-500/25 border-brand-500 text-brand-200 ring-2 ring-brand-500/40 shadow-md shadow-brand-500/10'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-lg">{card.icon}</span>
                <div>
                  <div className={`font-black text-xs leading-none ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                    {card.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {card.courtsRange}
                  </div>
                </div>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0 ml-1" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
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
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        <div className="glass-panel p-2 sm:p-3 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-center sm:space-x-3 text-center sm:text-left">
          <div className="hidden sm:flex w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 items-center justify-center text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] sm:text-xs text-slate-400 truncate">Available</div>
            <div className="text-xs sm:text-base font-bold text-emerald-400 sm:text-white leading-none mt-0.5">
              {availableCount}
            </div>
          </div>
        </div>

        <div className="glass-panel p-2 sm:p-3 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-center sm:space-x-3 text-center sm:text-left">
          <div className="hidden sm:flex w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 items-center justify-center text-amber-400">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] sm:text-xs text-slate-400 truncate">Holds</div>
            <div className="text-xs sm:text-base font-bold text-amber-400 leading-none mt-0.5">
              {lockedCount}
            </div>
          </div>
        </div>

        <div className="glass-panel p-2 sm:p-3 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-center sm:space-x-3 text-center sm:text-left">
          <div className="hidden sm:flex w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 items-center justify-center text-rose-400">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] sm:text-xs text-slate-400 truncate">Booked</div>
            <div className="text-xs sm:text-base font-bold text-rose-400 leading-none mt-0.5">
              {confirmedCount}
            </div>
          </div>
        </div>

        <div className="glass-panel p-2 sm:p-3 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-center sm:space-x-3 text-center sm:text-left">
          <div className="hidden sm:flex w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 items-center justify-center text-slate-300">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] sm:text-xs text-slate-400 truncate">Total</div>
            <div className="text-xs sm:text-base font-bold text-slate-200 leading-none mt-0.5">
              {totalSlots}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Court Matrix Grid (Green for Available, Red for Booked, All Text Centered) */}
      <div className="glass-panel p-1.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800/80">
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
            onConfirmedSlotClick={(court, slot) => setSelectedConfirmedSlot({ court, slot })}
            isMobileView={effectiveViewMode === 'mobile'}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-2 py-3 sm:px-4 sm:py-6 space-y-3 sm:space-y-6">
      {/* Primary Top Bar: Navigation Tabs, View Switcher on Laptop, and Customer Directory */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Navigation Tabs */}
        <div className="flex p-1 bg-slate-900/90 rounded-xl sm:rounded-2xl border border-slate-800 shadow-sm w-full sm:w-auto">
          <button
            onClick={() => setMainTab('daily-grid')}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all ${
              mainTab === 'daily-grid'
                ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily Grid</span>
          </button>

          <button
            onClick={() => setMainTab('recurring-series')}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all ${
              mainTab === 'recurring-series'
                ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Recurring Bookings</span>
          </button>
        </div>

        {/* Center / Right Controls: View Switcher (Laptop only) & Customer Directory */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher: ONLY shown when opened on laptop / PC (!isScreenMobile). Enforced mobile on phone. */}
          {!isScreenMobile && (
            <div className="flex items-center p-1 bg-slate-900/90 rounded-xl sm:rounded-2xl border border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 px-2.5 hidden md:inline">
                Layout:
              </span>
              <button
                onClick={() => setViewMode('pc')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'pc'
                    ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>PC View</span>
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'mobile'
                    ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile View</span>
              </button>
            </div>
          )}

          {/* Quick Customers Directory Button */}
          <button
            onClick={() => setIsCustomerDirectoryOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-xs font-bold text-slate-300 hover:text-white flex items-center space-x-1.5 transition-colors shadow-sm"
            title="Browse registered customers and fix misspelled names"
          >
            <Users className="w-4 h-4 text-brand-400" />
            <span>Customers</span>
          </button>

          {mainTab === 'daily-grid' && (
            <button
              onClick={() => setIsRecurringModalOpen(true)}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-brand-500 hover:bg-brand-400 shadow-md shadow-brand-500/20 flex items-center justify-center space-x-1.5 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Recurring Series</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Views */}
      {mainTab === 'daily-grid' ? (
        !isScreenMobile && effectiveViewMode === 'mobile' ? (
          /* Laptop Mobile View Simulation Container */
          <div className="flex flex-col items-center justify-center py-2 animate-in fade-in duration-200">
            <div className="mb-2.5 flex items-center justify-between w-full max-w-[430px] px-2 text-xs text-slate-400">
              <span className="flex items-center space-x-1.5 font-bold text-brand-400">
                <Smartphone className="w-4 h-4" />
                <span>Simulated Mobile View (412px Viewport)</span>
              </span>
              <button
                onClick={() => setViewMode('pc')}
                className="text-xs text-slate-400 hover:text-white underline font-semibold"
              >
                Return to PC View
              </button>
            </div>

            {/* Smartphone Chassis Frame */}
            <div className="w-full max-w-[430px] bg-slate-950 rounded-[40px] border-[8px] border-slate-800/90 shadow-2xl p-2.5 relative ring-1 ring-slate-700/50">
              {/* Dynamic Island / Notch */}
              <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3 flex items-center justify-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-slate-950" />
                <div className="w-2 h-2 rounded-full bg-blue-950/60" />
              </div>

              {/* Render inner daily grid inside mobile container */}
              {renderDailyGridContent()}
            </div>
          </div>
        ) : (
          /* Native Full-width PC View or Physical Mobile Screen */
          renderDailyGridContent()
        )
      ) : (
        /* Recurring Bookings / Series Contracts View */
        <RecurringBookingsList onOpenCreateModal={() => setIsRecurringModalOpen(true)} />
      )}

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

      {/* Confirmed Slot Details Modal (Click RED slot to view details or fix misspelled customer name) */}
      {selectedConfirmedSlot && (
        <BookingDetailsModal
          court={selectedConfirmedSlot.court}
          slot={selectedConfirmedSlot.slot}
          bookingDate={selectedDate}
          onClose={() => setSelectedConfirmedSlot(null)}
          onBookingCancelled={() => {
            queryClient.invalidateQueries({ queryKey: ['availability', selectedDate] });
          }}
        />
      )}

      {/* Customer Directory Modal */}
      {isCustomerDirectoryOpen && (
        <CustomerDirectoryModal
          onClose={() => setIsCustomerDirectoryOpen(false)}
        />
      )}

      {/* Long-Term / Recurring Booking Modal */}
      {isRecurringModalOpen && (
        <RecurringBookingModal
          courts={courts}
          onClose={() => setIsRecurringModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['availability'] });
            queryClient.invalidateQueries({ queryKey: ['recurring-series'] });
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
