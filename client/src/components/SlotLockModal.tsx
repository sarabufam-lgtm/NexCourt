import React, { useState, useEffect } from 'react';
import { X, Clock, AlertTriangle, CheckCircle, CreditCard, Banknote } from 'lucide-react';
import { SlotItem, CourtMatrixItem } from './CourtGrid';
import { CustomerCombobox } from './CustomerCombobox';

interface SlotLockModalProps {
  court: CourtMatrixItem;
  slot: SlotItem;
  bookingDate: string;
  onClose: () => void;
  onConfirm: (data: {
    bookingId: string;
    expectedVersion: number;
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    amountDue: number;
    paymentMade: boolean;
    paymentMethod: string;
    notes?: string;
  }) => Promise<void>;
}

export const SlotLockModal: React.FC<SlotLockModalProps> = ({
  court,
  slot,
  bookingDate,
  onClose,
  onConfirm
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    slot.lockInfo?.remainingSeconds || 300
  );
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [amountDue, setAmountDue] = useState('80');
  const [paymentMade, setPaymentMade] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 5-minute countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose(); // Automatically close when hold expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = (remainingSeconds / 300) * 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot.lockInfo?.bookingId) return;

    setError(null);
    setSubmitting(true);
    try {
      await onConfirm({
        bookingId: slot.lockInfo.bookingId,
        expectedVersion: slot.lockInfo.version || 1,
        contactName,
        contactPhone,
        contactEmail: contactEmail || undefined,
        amountDue: Number(amountDue),
        paymentMade,
        paymentMethod,
        notes: notes || undefined
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to confirm booking');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg glass-panel-elevated rounded-2xl p-6 border border-slate-700/80 shadow-2xl relative overflow-hidden">
        {/* Progress Bar Header */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
          <div
            className={`h-full transition-all duration-1000 ${
              remainingSeconds < 60 ? 'bg-rose-500' : 'bg-amber-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-4 mt-2">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white">Confirm Court Reservation</h2>
              <span className="flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-medium border border-amber-500/30">
                <Clock className="w-3 h-3" />
                <span>{timeFormatted}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Slot is held exclusively for you. Complete details before lease expires.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Court Summary Strip */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs mb-5">
          <div>
            <span className="text-slate-500 block">Court</span>
            <span className="font-semibold text-slate-200">{court.courtName || `Court ${court.courtNumber}`}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Sport</span>
            <span className="font-semibold text-brand-400 capitalize">{court.courtType}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Time Slot</span>
            <span className="font-semibold text-slate-200">{slot.startTime} - {slot.endTime}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <CustomerCombobox
                value={contactName}
                phone={contactPhone}
                email={contactEmail}
                onChange={({ name, phone: autoPhone, email: autoEmail }) => {
                  setContactName(name);
                  if (autoPhone) setContactPhone(autoPhone);
                  if (autoEmail) setContactEmail(autoEmail);
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+971 50 123 4567"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address (Optional)</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="customer@domain.ae"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Payment & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Amount Due (AED)</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={amountDue}
                onChange={(e) => setAmountDue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-sm font-semibold text-brand-400 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="cash">Cash at Desk</option>
                <option value="card">Credit / Debit Card</option>
                <option value="bank_transfer">Bank Transfer / Payit</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="paymentMade"
              checked={paymentMade}
              onChange={(e) => setPaymentMade(e.target.checked)}
              className="w-4 h-4 rounded text-brand-500 bg-slate-900 border-slate-700 focus:ring-0"
            />
            <label htmlFor="paymentMade" className="text-xs text-slate-300 cursor-pointer">
              Payment already received / verified
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel & Release Hold
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
            >
              {submitting ? 'Confirming...' : 'Confirm Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
