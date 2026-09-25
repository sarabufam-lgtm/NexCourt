import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, User, Phone, Mail, FileText, Edit3, X, RefreshCw, Calendar } from 'lucide-react';
import { api } from '../api/client';
import { EditCustomerModal, CustomerData } from './EditCustomerModal';

interface CustomerDirectoryModalProps {
  onClose: () => void;
}

export const CustomerDirectoryModal: React.FC<CustomerDirectoryModalProps> = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);

  const { data: customers = [], isLoading, refetch, isFetching } = useQuery<any[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await api.get('/customers');
      return data;
    }
  });

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Customer Directory</h3>
                <p className="text-xs text-slate-400">
                  {customers.length} registered customers • Alphabetical order
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

          {/* Search Bar */}
          <div className="p-4 border-b border-slate-800 flex items-center space-x-2 bg-slate-950/30">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by customer name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Refresh customer list"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-brand-400' : ''}`} />
            </button>
          </div>

          {/* Customers List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {isLoading ? (
              <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin text-brand-400" />
                <span className="text-xs">Loading customers...</span>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No customers found matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredCustomers.map((cust) => (
                <div
                  key={cust.id}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-100">{cust.name}</span>
                      {cust._count?.bookings > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                          {cust._count.bookings} {cust._count.bookings === 1 ? 'booking' : 'bookings'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-400">
                      <span className="flex items-center font-mono">
                        <Phone className="w-3 h-3 mr-1 text-slate-500" />
                        {cust.phone}
                      </span>
                      {cust.email && (
                        <span className="flex items-center">
                          <Mail className="w-3 h-3 mr-1 text-slate-500" />
                          {cust.email}
                        </span>
                      )}
                    </div>
                    {cust.notes && (
                      <p className="text-[11px] text-slate-500 italic truncate max-w-md">
                        {cust.notes}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setEditingCustomer(cust)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 hover:text-brand-300 flex items-center justify-center space-x-1.5 transition-colors shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Fix Spelling / Edit</span>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/60 text-xs text-slate-400">
            <span>Showing {filteredCustomers.length} of {customers.length}</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSuccess={() => refetch()}
        />
      )}
    </>
  );
};
