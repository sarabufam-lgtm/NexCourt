import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Edit3, 
  Ban, 
  FileText,
  MapPin
} from 'lucide-react';
import { api } from '../api/client';
import { CourtMatrixItem, SlotItem } from './CourtGrid';
import { EditCustomerModal } from './EditCustomerModal';

interface BookingDetailsModalProps {
  court: CourtMatrixItem;
  slot: SlotItem;
  bookingDate: string;
  onClose: () => void;
  onBookingCancelled?: () => void;
}

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  court,
  slot,
  bookingDate,
  onClose,
  onBookingCancelled
}) => {
  const queryClient = useQueryClient();
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const booking = slot.bookingInfo;

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!booking?.bookingId) return;
      const { data } = await api.post(`/bookings/cancel/${booking.bookingId}`, {
        reason: cancelReason || 'Customer requested cancellation'
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-series'] });
      onBookingCancelled?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || err.message || 'Failed to cancel booking');
    }
  });

  if (!booking) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <span>Confirmed Booking</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Booked Slot
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {court.courtName} • {court.courtType}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Schedule Strip */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-850">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-brand-400 shrink-0" />
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Date</div>
                  <div className="text-xs font-bold text-slate-200">{bookingDate}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-brand-400 shrink-0" />
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Slot Time</div>
                  <div className="text-xs font-mono font-bold text-brand-300">
                    {slot.startTime} - {slot.endTime}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Information Card with Quick Edit */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Customer Details</span>
                </span>
                <button
                  onClick={() => setIsEditCustomerOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/40 text-brand-300 text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
                  title="Fix customer name spelling or details"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Fix Spelling / Edit</span>
                </button>
              </div>

              <div className="pt-1">
                <div className="text-base font-extrabold text-white flex items-center space-x-2">
                  <span>{booking.contactName}</span>
                </div>
                {booking.contactPhone && (
                  <div className="text-xs text-slate-300 font-mono flex items-center space-x-1.5 mt-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{booking.contactPhone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financials & Status */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-850 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Booking Type</span>
                <div className="font-semibold text-slate-200 capitalize mt-0.5">
                  {booking.bookingType.replace('_', ' ')}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-500">Amount Due</span>
                <div className="font-extrabold text-brand-400 font-mono text-sm mt-0.5">
                  AED {booking.amountDue.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Cancellation Confirmation Inline */}
            {isCancelling ? (
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/40 space-y-3">
                <div className="text-xs text-rose-300 font-semibold flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Are you sure you want to cancel this booking and free the slot?</span>
                </div>
                <input
                  type="text"
                  placeholder="Cancellation reason..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => setIsCancelling(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors"
                  >
                    {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Footer Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
              {!isCancelling && (
                <button
                  type="button"
                  onClick={() => setIsCancelling(true)}
                  className="px-3 py-2 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/30 text-rose-400 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel Slot</span>
                </button>
              )}

              <div className="flex items-center space-x-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nested Customer Edit Modal */}
      {isEditCustomerOpen && (
        <EditCustomerModal
          customer={{
            id: booking.bookingId, // Will update customer associated with booking
            name: booking.contactName,
            phone: booking.contactPhone || '',
            email: null
          }}
          onClose={() => setIsEditCustomerOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['availability'] });
          }}
        />
      )}
    </>
  );
};
