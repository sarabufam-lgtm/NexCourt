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

interface CourtGridProps {
  courts: CourtMatrixItem[];
  currentAdminId?: string;
  onSlotClick: (court: CourtMatrixItem, slot: SlotItem) => void;
}

export const CourtGrid: React.FC<CourtGridProps> = ({
  courts,
  currentAdminId,
  onSlotClick
}) => {
  if (courts.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500">
        No active courts available for the selected criteria.
      </div>
    );
  }

  // Get distinct time slot labels from first court
  const timeLabels = courts[0]?.slots.map((s) => s.startTime) || [];

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[760px] inline-block align-middle">
        {/* Header Row: Court Names */}
        <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(140px,1fr))] gap-2 mb-2 sticky top-0 bg-slate-950/90 backdrop-blur z-10 py-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-center">
            Time
          </div>
          {courts.map((court) => (
            <div
              key={court.courtId}
              className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-center shadow-sm"
            >
              <div className="text-sm font-bold text-slate-100">{court.courtName || `Court ${court.courtNumber}`}</div>
              <div className="text-[11px] text-brand-400 font-medium capitalize">{court.courtType}</div>
            </div>
          ))}
        </div>

        {/* Matrix Rows */}
        <div className="space-y-2">
          {timeLabels.map((time, idx) => (
            <div
              key={time}
              className="grid grid-cols-[100px_repeat(auto-fit,minmax(140px,1fr))] gap-2 items-center"
            >
              {/* Time Label Column */}
              <div className="text-xs font-medium text-slate-400 bg-slate-900/50 rounded-lg py-2.5 px-2 text-center border border-slate-850 flex items-center justify-center space-x-1">
                <Clock className="w-3 h-3 text-slate-500" />
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

                return (
                  <button
                    key={`${court.courtId}-${slot.startTime}`}
                    onClick={() => onSlotClick(court, slot)}
                    disabled={isConfirmed || (isLocked && !isHeldByMe)}
                    className={`h-14 rounded-xl px-2.5 py-1.5 text-left border transition-all relative overflow-hidden flex flex-col justify-between ${
                      isAvailable
                        ? 'bg-slate-900/40 border-emerald-500/20 hover:border-emerald-500/60 hover:bg-emerald-500/10 cursor-pointer shadow-sm hover:shadow-emerald-500/10'
                        : isLocked
                        ? isHeldByMe
                          ? 'bg-amber-500/15 border-amber-500/60 text-amber-200 cursor-pointer animate-lock-pulse shadow-sm shadow-amber-500/20'
                          : 'bg-amber-950/20 border-amber-700/40 text-amber-400/80 cursor-not-allowed opacity-80'
                        : 'bg-slate-900/90 border-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {/* Status Badge */}
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-mono text-slate-400">
                        {slot.startTime} - {slot.endTime}
                      </span>
                      {isAvailable && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                      )}
                      {isLocked && (
                        <span className="flex items-center text-[10px] font-medium text-amber-400">
                          <Lock className="w-2.5 h-2.5 mr-0.5" />
                          {isHeldByMe ? 'Your Hold' : 'Held'}
                        </span>
                      )}
                      {isConfirmed && (
                        <CheckCircle2 className="w-3 h-3 text-brand-500" />
                      )}
                    </div>

                    {/* Slot Info Content */}
                    <div className="text-xs truncate">
                      {isAvailable && (
                        <span className="text-emerald-400/90 font-medium text-[11px]">
                          Available
                        </span>
                      )}
                      {isLocked && (
                        <div className="flex items-center space-x-1 text-[11px] font-semibold text-amber-300 truncate">
                          <User className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{slot.lockInfo?.lockedByAdminName || 'Admin'}</span>
                        </div>
                      )}
                      {isConfirmed && (
                        <div className="text-[11px] font-medium text-slate-200 truncate flex items-center space-x-1">
                          <User className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                          <span className="truncate">{slot.bookingInfo?.contactName}</span>
                        </div>
                      )}
                    </div>
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
