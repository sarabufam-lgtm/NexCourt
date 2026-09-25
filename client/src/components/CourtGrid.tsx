import React from 'react';
import { Lock, Clock, CheckCircle2, User } from 'lucide-react';

export interface SlotItem {
  startTime: string;
  endTime: string;
  label: string;
  status: 'AVAILABLE' | 'LOCKED' | 'CONFIRMED';
  lockInfo: {
    bookingId: string;
    lockedByAdminId: string;
    lockedByAdminName: string;
    expiresAt: string;
    remainingSeconds: number;
    version: number;
  } | null;
  bookingInfo: {
    bookingId: string;
    contactName: string;
    contactPhone?: string | null;
    contactEmail?: string | null;
    customerId?: string | null;
    paymentMade: boolean;
    amountDue: number;
    bookingType: string;
  } | null;
}

export interface CourtMatrixItem {
  courtId: string;
  courtNumber: number;
  courtName: string | null;
  courtType: string;
  courtTypeSlug: string;
  slots: SlotItem[];
}

export interface CourtGridProps {
  courts: CourtMatrixItem[];
  currentAdminId?: string;
  onSlotClick: (court: CourtMatrixItem, slot: SlotItem) => void;
  onConfirmedSlotClick?: (court: CourtMatrixItem, slot: SlotItem) => void;
  isMobileView?: boolean;
}

export const CourtGrid: React.FC<CourtGridProps> = ({
  courts,
  currentAdminId,
  onSlotClick,
  onConfirmedSlotClick,
  isMobileView = false
}) => {
  if (courts.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500 font-semibold text-xs sm:text-sm">
        No active courts available for the selected sport.
      </div>
    );
  }

  // Get distinct time slot labels from first court
  const timeLabels = courts[0]?.slots.map((s) => s.startTime) || [];

  // When 6 courts or fewer (e.g. Badminton BMC1..BMC6), fit perfectly across screen width in ONE row
  const fitsSingleScreen = courts.length <= 6;
  const timeColWidth = isMobileView ? '44px' : '60px';
  const gridTemplate = fitsSingleScreen
    ? `${timeColWidth} repeat(${courts.length}, minmax(0, 1fr))`
    : `${timeColWidth} repeat(${courts.length}, minmax(80px, 1fr))`;

  return (
    <div className={`w-full ${fitsSingleScreen ? 'overflow-x-hidden' : 'overflow-x-auto'} pb-2 custom-scrollbar`}>
      <div className={`w-full ${fitsSingleScreen ? '' : 'min-w-fit'} inline-block align-middle`}>
        {/* Header Row: Court Names - Always 1 unified row, centered vertically and horizontally */}
        <div
          className="grid gap-1 sm:gap-1.5 mb-1.5 sticky top-0 bg-slate-950/95 backdrop-blur z-10 py-1"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {/* Time Header */}
          <div className="h-10 sm:h-12 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-center text-center shadow-sm">
            Time
          </div>

          {/* Court Columns */}
          {courts.map((court) => (
            <div
              key={court.courtId}
              className="h-10 sm:h-12 px-1 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center shadow-sm"
            >
              <div className="text-xs sm:text-sm font-black text-slate-100 uppercase tracking-tight truncate w-full text-center">
                {court.courtName || `C${court.courtNumber}`}
              </div>
              <div className="text-[9px] sm:text-[10px] text-brand-400 font-semibold capitalize truncate w-full text-center">
                {court.courtType}
              </div>
            </div>
          ))}
        </div>

        {/* Matrix Rows */}
        <div className="space-y-1 sm:space-y-1.5">
          {timeLabels.map((time, idx) => (
            <div
              key={time}
              className="grid gap-1 sm:gap-1.5 items-center"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {/* Time Label Column - Centered Vertically & Horizontally */}
              <div className={`${isMobileView ? 'h-12' : 'h-16'} rounded-xl bg-slate-900/80 border border-slate-800/90 text-slate-300 font-mono font-bold text-[11px] sm:text-xs flex items-center justify-center text-center shadow-sm`}>
                <span>{time}</span>
              </div>

              {/* Court Slot Cells */}
              {courts.map((court) => {
                const slot = court.slots[idx];
                if (!slot) return <div key={court.courtId} />;

                const isLocked = slot.status === 'LOCKED';
                const isConfirmed = slot.status === 'CONFIRMED';
                const isAvailable = slot.status === 'AVAILABLE';
                const isHeldByMe = isLocked && slot.lockInfo?.lockedByAdminId === currentAdminId;

                const cellHeight = isMobileView ? 'h-12' : 'h-16';

                return (
                  <button
                    key={`${court.courtId}-${slot.startTime}`}
                    onClick={() => {
                      if (isConfirmed) {
                        onConfirmedSlotClick?.(court, slot);
                      } else {
                        onSlotClick(court, slot);
                      }
                    }}
                    disabled={isLocked && !isHeldByMe}
                    title={
                      isAvailable
                        ? `Available - Click to book ${court.courtName} at ${slot.startTime}`
                        : isConfirmed
                        ? `Booked by ${slot.bookingInfo?.contactName || 'Customer'} - Click to view or edit`
                        : isHeldByMe
                        ? 'Held by you - Click to confirm'
                        : 'Slot currently held by another admin'
                    }
                    className={`${cellHeight} rounded-xl px-1 py-0.5 border text-center transition-all relative overflow-hidden flex flex-col items-center justify-center shadow-sm ${
                      isAvailable
                        ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 border-emerald-400 text-white cursor-pointer active:scale-95 shadow-emerald-950/30'
                        : isConfirmed
                        ? 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 border-rose-400 text-white cursor-pointer active:scale-95 shadow-rose-950/30'
                        : isLocked
                        ? isHeldByMe
                          ? 'bg-amber-500 hover:bg-amber-400 border-amber-300 text-slate-950 cursor-pointer animate-pulse font-bold shadow-amber-500/20'
                          : 'bg-amber-950/40 border-amber-700/50 text-amber-300 cursor-not-allowed opacity-80'
                        : 'bg-slate-900 border-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {/* AVAILABLE SLOT (GREEN) */}
                    {isAvailable && (
                      <div className="flex flex-col items-center justify-center text-center w-full leading-tight">
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-100 opacity-90">
                          {slot.startTime}
                        </span>
                        <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white mt-0.5">
                          {isMobileView ? 'Avail' : 'Available'}
                        </span>
                      </div>
                    )}

                    {/* CONFIRMED / BOOKED SLOT (RED) */}
                    {isConfirmed && (
                      <div className="flex flex-col items-center justify-center text-center w-full px-0.5 leading-tight">
                        <span className="text-[9px] sm:text-[10px] font-mono font-semibold text-rose-100 opacity-90">
                          {slot.startTime}
                        </span>
                        <span className="text-[11px] sm:text-xs font-black text-white truncate max-w-full mt-0.5">
                          {slot.bookingInfo?.contactName || 'Booked'}
                        </span>
                      </div>
                    )}

                    {/* LOCKED / HOLD SLOT (AMBER) */}
                    {isLocked && (
                      <div className="flex flex-col items-center justify-center text-center w-full leading-tight">
                        <span className="text-[9px] sm:text-[10px] font-mono font-bold opacity-80">
                          {slot.startTime}
                        </span>
                        <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider mt-0.5">
                          {isHeldByMe ? 'Hold' : 'Held'}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
