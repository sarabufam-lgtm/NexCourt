import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  ChevronDown, 
  ChevronUp, 
  Ban, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  Plus,
  RefreshCw,
  Layers,
  CreditCard,
  X,
  Banknote,
  FileText,
  Edit3
} from 'lucide-react';
import { api } from '../api/client';
import { EditCustomerModal, CustomerData } from './EditCustomerModal';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ChildSession {
  id: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  statusId: number;
  amountDue: number;
  paymentMade: boolean;
}

interface RecurringSeries {
  id: string;
  statusId: number;
  courtId: string;
  courtName: string | null;
  courtType: string;
  courtTypeSlug: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  longTermStartDate: string | null;
  longTermEndDate: string | null;
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: number[];
  amountDue: number;
  paymentMade: boolean;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
  adminName: string;
  totalSessions: number;
  confirmedSessions: number;
  cancelledSessions: number;
  childInstances: ChildSession[];
}

interface RecurringBookingsListProps {
  onOpenCreateModal: () => void;
}

export const RecurringBookingsList: React.FC<RecurringBookingsListProps> = ({ onOpenCreateModal }) => {
  const queryClient = useQueryClient();
  const [expandedSeriesId, setExpandedSeriesId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CANCELLED'>('ALL');
  const [cancellingSeriesId, setCancellingSeriesId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Payment update modal state
  const [editingPaymentSeries, setEditingPaymentSeries] = useState<RecurringSeries | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);
  const [editPaymentMade, setEditPaymentMade] = useState(true);
  const [editPaymentMethod, setEditPaymentMethod] = useState('cash');
  const [editTransactionId, setEditTransactionId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Fetch Recurring Series
  const { data: seriesList = [], isLoading, refetch, isFetching } = useQuery<RecurringSeries[]>({
    queryKey: ['recurring-series'],
    queryFn: async () => {
      const { data } = await api.get('/bookings/recurring');
      return data;
    }
  });

  // Cancel Series Mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post(`/bookings/recurring/${id}/cancel`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-series'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setCancellingSeriesId(null);
      setCancelReason('');
    }
  });

  // Payment Update Mutation
  const paymentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/bookings/recurring/${id}/payment`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-series'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setEditingPaymentSeries(null);
    },
    onError: (err: any) => {
      setPaymentError(err.response?.data?.error || err.message || 'Failed to update payment');
    }
  });

  const toggleExpand = (id: string) => {
    setExpandedSeriesId((prev) => (prev === id ? null : id));
  };

  const handleCancelSeries = (id: string) => {
    cancelMutation.mutate({ id, reason: cancelReason || 'Customer requested series cancellation' });
  };

  const openPaymentModal = (series: RecurringSeries) => {
    setEditingPaymentSeries(series);
    setEditPaymentMade(series.paymentMade);
    setEditPaymentMethod(series.paymentMethod || 'cash');
    setEditTransactionId('');
    setEditNotes(series.notes || '');
    setPaymentError(null);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaymentSeries) return;
    paymentMutation.mutate({
      id: editingPaymentSeries.id,
      data: {
        paymentMade: editPaymentMade,
        paymentMethod: editPaymentMethod,
        transactionId: editTransactionId || undefined,
        notes: editNotes || undefined
      }
    });
  };

  // Filter
  const filteredList = seriesList.filter((s) => {
    const matchesSearch =
      s.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contactPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.courtName && s.courtName.toLowerCase().includes(searchQuery.toLowerCase()));

    const isCancelled = s.statusId === 3;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && !isCancelled) ||
      (statusFilter === 'CANCELLED' && isCancelled);

    return matchesSearch && matchesStatus;
  });


  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-panel p-4 rounded-2xl">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, phone, court..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Contracts</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-brand-400' : ''}`} />
          </button>
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-sm flex items-center space-x-1.5 transition-colors shadow-lg shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Recurring Contract</span>
          </button>
        </div>
      </div>

      {/* Series Cards */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-brand-400" />
          <p className="text-sm">Loading recurring contracts...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">No Recurring Contracts Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'No recurring bookings matched your search query.'
              : 'Create repeating weekly reservations with automated conflict detection.'}
          </p>
          {!searchQuery && (
            <button
              onClick={onOpenCreateModal}
              className="mt-2 px-4 py-2 rounded-xl bg-brand-500 text-slate-950 font-bold text-xs inline-flex items-center space-x-1 hover:bg-brand-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Recurring Contract</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((series) => {
            const isExpanded = expandedSeriesId === series.id;
            const isCancelled = series.statusId === 3;
            const daysLabel = series.daysOfWeek.map((d) => DAY_NAMES[d]).join(', ');

            return (
              <div
                key={series.id}
                className={`glass-panel rounded-2xl border transition-all ${
                  isCancelled
                    ? 'border-rose-900/30 opacity-70 bg-slate-950/40'
                    : 'border-slate-800/80 hover:border-slate-700/80 bg-slate-950/60'
                }`}
              >
                {/* Header Summary Card */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Customer & Court info */}
                  <div className="flex items-start space-x-3.5">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-brand-400 shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-bold text-slate-100">{series.contactName}</span>
                        <button
                          type="button"
                          onClick={() => setEditingCustomer({
                            id: series.id,
                            name: series.contactName,
                            phone: series.contactPhone,
                            email: series.contactEmail
                          })}
                          className="p-1 rounded-lg text-slate-400 hover:text-brand-300 hover:bg-slate-800 transition-colors"
                          title="Fix customer spelling or contact details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">
                          {series.courtName || 'Court'} • {series.courtType}
                        </span>
                        {isCancelled ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            Cancelled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Active Contract
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{series.contactPhone}</span>
                        </span>
                        {series.contactEmail && (
                          <span className="flex items-center space-x-1">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span>{series.contactEmail}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Schedule & Dates */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-900/50 p-2.5 rounded-xl border border-slate-850">
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-500">Days</div>
                      <div className="font-semibold text-slate-200">{daysLabel || 'Custom'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-500">Time</div>
                      <div className="font-semibold text-brand-400 font-mono">
                        {series.startTime} - {series.endTime}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-500">Range</div>
                      <div className="font-semibold text-slate-200 truncate">
                        {series.longTermStartDate} → {series.longTermEndDate}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Financials & Action */}
                  <div className="flex items-center justify-between lg:justify-end space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-100">AED {series.amountDue.toFixed(2)}</div>
                      <div className="text-[11px] font-medium text-slate-400">
                        {series.paymentMade ? (
                          <span className="text-emerald-400 flex items-center justify-end space-x-0.5">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center justify-end space-x-0.5">
                            <AlertCircle className="w-3 h-3 mr-1" /> Pending
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openPaymentModal(series)}
                        className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                          series.paymentMade
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                        }`}
                        title="Edit Payment Details"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{series.paymentMade ? 'Paid' : 'Record Payment'}</span>
                      </button>

                      {!isCancelled && (
                        <button
                          onClick={() => setCancellingSeriesId(series.id)}
                          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900/40 transition-colors"
                          title="Cancel Recurring Contract"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => toggleExpand(series.id)}
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-xs font-semibold text-slate-300 flex items-center space-x-1 transition-colors"
                      >
                        <span>{series.totalSessions} Sessions</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cancellation Modal / Inline Confirm */}
                {cancellingSeriesId === series.id && (
                  <div className="border-t border-rose-900/30 p-4 bg-rose-950/20 rounded-b-2xl space-y-3">
                    <div className="flex items-center space-x-2 text-rose-300 font-semibold text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>Are you sure you want to cancel this entire recurring series and all unplayed sessions?</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="Reason for cancellation (e.g. Customer relocation)..."
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                      />
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleCancelSeries(series.id)}
                          disabled={cancelMutation.isPending}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-sm shadow-rose-600/30"
                        >
                          {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
                        </button>
                        <button
                          onClick={() => setCancellingSeriesId(null)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collapsible Child Sessions Drawer */}
                {isExpanded && (
                  <div className="border-t border-slate-850 p-4 bg-slate-900/30 rounded-b-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span>Concrete Session Instances ({series.childInstances.length} dates)</span>
                      <span>
                        <span className="text-emerald-400 font-semibold">{series.confirmedSessions} Confirmed</span>
                        {series.cancelledSessions > 0 && (
                          <span className="text-rose-400 font-semibold ml-2">• {series.cancelledSessions} Cancelled</span>
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {series.childInstances.map((session, sIdx) => {
                        const isSessCancelled = session.statusId === 3;
                        return (
                          <div
                            key={session.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                              isSessCancelled
                                ? 'bg-rose-950/20 border-rose-900/30 text-rose-400/70'
                                : 'bg-slate-900/60 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-200">
                                #{sIdx + 1} {session.date}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400">
                                {session.startTime} - {session.endTime}
                              </div>
                            </div>

                            <div>
                              {isSessCancelled ? (
                                <span className="text-[10px] font-bold uppercase text-rose-400">Cancelled</span>
                              ) : (
                                <span className="text-[10px] font-bold uppercase text-emerald-400 flex items-center">
                                  <CheckCircle2 className="w-3 h-3 mr-0.5" /> Booked
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Details Edit Modal */}
      {editingPaymentSeries && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Update Contract Payment</h3>
                  <p className="text-xs text-slate-400">
                    {editingPaymentSeries.contactName} • {editingPaymentSeries.courtName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingPaymentSeries(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePayment} className="p-5 space-y-4">
              {paymentError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Amount Summary */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">
                    Total Contract Value ({editingPaymentSeries.totalSessions} sessions)
                  </div>
                  <div className="text-xs text-slate-300 font-mono mt-0.5">
                    {editingPaymentSeries.startTime} - {editingPaymentSeries.endTime} ({editingPaymentSeries.longTermStartDate} → {editingPaymentSeries.longTermEndDate})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-brand-400 font-mono">
                    AED {editingPaymentSeries.amountDue.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Payment Status Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Payment Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditPaymentMade(true)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border transition-all ${
                      editPaymentMade
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Paid in Full</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPaymentMade(false)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border transition-all ${
                      !editPaymentMade
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>Payment Pending</span>
                  </button>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
                    { id: 'bank_transfer', label: 'Bank Transfer', icon: FileText },
                    { id: 'pos_terminal', label: 'POS Terminal', icon: CreditCard }
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = editPaymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setEditPaymentMethod(m.id)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex flex-col items-center justify-center space-y-1 border transition-all ${
                          isSelected
                            ? 'bg-brand-500/15 border-brand-500/50 text-brand-300 shadow-sm shadow-brand-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px] truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Transaction Reference / Auth ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Transaction Ref / Receipt # <span className="text-slate-500 text-[10px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN-89421 or Bank Transfer Ref..."
                  value={editTransactionId}
                  onChange={(e) => setEditTransactionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Payment Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Payment Notes / Remarks <span className="text-slate-500 text-[10px]">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Received cash at counter; receipt issued..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              {/* Status Cascade Notice */}
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] leading-relaxed">
                Saving payment details updates this recurring contract and automatically updates the payment status across all {editingPaymentSeries.totalSessions} concrete sessions in the schedule.
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingPaymentSeries(null)}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-brand-500/20 disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {paymentMutation.isPending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Payment Info</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['recurring-series'] });
            queryClient.invalidateQueries({ queryKey: ['availability'] });
          }}
        />
      )}
    </div>
  );
};
