import React, { useState } from 'react';
import { X, Calendar, AlertTriangle, CheckCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { api } from '../api/client';
import { CourtMatrixItem } from './CourtGrid';

interface RecurringBookingModalProps {
  courts: CourtMatrixItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export const RecurringBookingModal: React.FC<RecurringBookingModalProps> = ({
  courts,
  onClose,
  onSuccess
}) => {
  const [courtId, setCourtId] = useState(courts[0]?.courtId || '');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([2, 4]); // Tue & Thu
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [ratePerSession, setRatePerSession] = useState('80');

  // Step 1: Configuration, Step 2: Conflict Evaluation & Review
  const [step, setStep] = useState<'CONFIG' | 'REVIEW'>('CONFIG');
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (daysOfWeek.length === 0) {
      setError('Please select at least one day of the week');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post('/bookings/recurring/evaluate', {
        courtId,
        startDate,
        endDate,
        daysOfWeek,
        startTime,
        endTime
      });
      setEvaluation(data);
      setStep('REVIEW');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to evaluate recurring slots');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeries = async () => {
    if (!evaluation) return;
    setError(null);
    setLoading(true);

    try {
      await api.post('/bookings/recurring/create', {
        courtId,
        daysOfWeek,
        startDate,
        endDate,
        startTime,
        endTime,
        contactName,
        contactPhone,
        contactEmail: contactEmail || undefined,
        ratePerSession: Number(ratePerSession),
        paymentMade: false,
        paymentMethod: 'invoice',
        datesToBook: evaluation.availableDates
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create recurring series');
    } finally {
      setLoading(false);
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl glass-panel-elevated rounded-2xl p-6 border border-slate-700/80 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-brand-400" />
              <span>Recurring Academy & Long-Term Series</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Book recurring weekly court time with automated multi-week conflict analysis.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 'CONFIG' ? (
          <form onSubmit={handleEvaluate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Court</label>
                <select
                  value={courtId}
                  onChange={(e) => setCourtId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                >
                  {courts.map((c) => (
                    <option key={c.courtId} value={c.courtId}>
                      {c.courtName || `Court ${c.courtNumber}`} ({c.courtType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Rate Per Session (AED)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={ratePerSession}
                  onChange={(e) => setRatePerSession(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-sm font-semibold text-brand-400 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Days of Week Chips */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Repeat Days</label>
              <div className="flex flex-wrap gap-2">
                {dayNames.map((name, idx) => {
                  const selected = daysOfWeek.includes(idx);
                  return (
                    <button
                      type="button"
                      key={name}
                      onClick={() => toggleDay(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selected
                          ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Start Time</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">End Time</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Customer Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Academy / Contact Name *</label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Smash Badminton Academy"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+971 50 999 8888"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 flex items-center space-x-1 shadow-lg shadow-brand-500/20"
              >
                <span>{loading ? 'Analyzing...' : 'Analyze Slot Availability'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Evaluation Results & Prorated Options */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Requested Sessions:</span>
                <span className="font-bold text-white">{evaluation?.totalRequestedSessions}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 flex items-center">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Available Clean Sessions:
                </span>
                <span className="font-bold text-emerald-400">{evaluation?.cleanCount}</span>
              </div>
              {evaluation?.conflictCount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-400 flex items-center">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    Conflicting Sessions:
                  </span>
                  <span className="font-bold text-amber-400">{evaluation?.conflictCount}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-200">Total Prorated Amount:</span>
                <span className="font-bold text-brand-400 text-base">
                  AED {evaluation?.cleanCount * Number(ratePerSession)}
                </span>
              </div>
            </div>

            {/* Conflict List */}
            {evaluation?.conflictedDates.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                <div className="font-semibold text-amber-300 flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-1.5" />
                  <span>The following dates clash with existing bookings:</span>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-2">
                  {evaluation.conflictedDates.map((c: any) => (
                    <div key={c.date} className="flex justify-between text-[11px] text-amber-200/90 py-0.5">
                      <span>{c.date}</span>
                      <span className="text-slate-400 truncate max-w-[200px]">Booked by: {c.existingCustomerName}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-amber-300/80 pt-1">
                  * Conflicted dates will be excluded from the series contract automatically.
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep('CONFIG')}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Back to Settings
              </button>
              <button
                type="button"
                disabled={loading || evaluation?.cleanCount === 0}
                onClick={handleCreateSeries}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
              >
                {loading ? 'Confirming Series...' : `Confirm ${evaluation?.cleanCount} Sessions`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
