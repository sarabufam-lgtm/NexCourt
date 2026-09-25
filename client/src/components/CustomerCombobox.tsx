import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, User, Phone, Mail, Check, UserPlus, X, ChevronDown, Edit3 } from 'lucide-react';
import { api } from '../api/client';
import { cacheCustomers, getCachedCustomers } from '../lib/offline-storage';
import { EditCustomerModal } from './EditCustomerModal';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
}

interface CustomerComboboxProps {
  value: string; // Current typed / selected name
  phone: string;
  email?: string;
  onChange: (data: { name: string; phone: string; email: string; isExisting: boolean }) => void;
  required?: boolean;
}

export const CustomerCombobox: React.FC<CustomerComboboxProps> = ({
  value,
  phone,
  email = '',
  onChange,
  required = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value with query
  useEffect(() => {
    setQuery(value);
    if (value && phone) {
      // If we already have a phone with this name, check if it's considered existing
      setIsExistingCustomer(Boolean(phone));
    }
  }, [value, phone]);

  // Fetch all customers (alphabetically sorted by server, with offline IndexedDB fallback)
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await getCachedCustomers();
        if (cached) return cached;
      }

      try {
        const { data } = await api.get('/customers');
        await cacheCustomers(data);
        return data;
      } catch (err) {
        const cached = await getCachedCustomers();
        if (cached) return cached;
        throw err;
      }
    },
    staleTime: 1000 * 60 * 5 // 5 minutes cache
  });

  // Filter customers by partial name query (case-insensitive)
  const filteredCustomers = query.trim()
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.phone.includes(query)
      )
    : customers;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer: Customer) => {
    setQuery(customer.name);
    setIsExistingCustomer(true);
    setIsOpen(false);
    onChange({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      isExisting: true
    });
  };

  const handleInputChange = (text: string) => {
    setQuery(text);
    setIsOpen(true);

    // Check for exact name match in customers list
    const exactMatch = customers.find(
      (c) => c.name.toLowerCase() === text.trim().toLowerCase()
    );

    if (exactMatch) {
      setIsExistingCustomer(true);
      onChange({
        name: exactMatch.name,
        phone: exactMatch.phone,
        email: exactMatch.email || '',
        isExisting: true
      });
    } else {
      setIsExistingCustomer(false);
      // New customer being typed - keep existing phone if already typed or clear if name changed
      onChange({
        name: text,
        phone: isExistingCustomer ? '' : phone,
        email: isExistingCustomer ? '' : email,
        isExisting: false
      });
    }
  };

  const handleAddNewCustomer = () => {
    setIsExistingCustomer(false);
    setIsOpen(false);
    onChange({
      name: query.trim(),
      phone: '',
      email: '',
      isExisting: false
    });
  };

  const handleClear = () => {
    setQuery('');
    setIsExistingCustomer(false);
    onChange({
      name: '',
      phone: '',
      email: '',
      isExisting: false
    });
    setIsOpen(true);
  };

  const selectedCustomerObj = customers.find(
    (c) => c.name.toLowerCase() === query.trim().toLowerCase() || (phone && c.phone === phone)
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-slate-300">
          Customer Name {required && '*'}
        </label>
        {isExistingCustomer ? (
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
              <Check className="w-2.5 h-2.5" />
              <span>Returning</span>
            </span>
            {selectedCustomerObj && (
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 border border-brand-500/30 flex items-center space-x-1 transition-colors"
                title="Fix customer spelling or contact details"
              >
                <Edit3 className="w-2.5 h-2.5" />
                <span>Fix Spelling</span>
              </button>
            )}
          </div>
        ) : query.trim() ? (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            New Customer Profile
          </span>
        ) : null}
      </div>

      <div className="relative">
        <div className="absolute left-3 top-2.5 text-slate-500 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>

        <input
          type="text"
          required={required}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Type to search or add customer..."
          className={`w-full pl-9 pr-16 py-2 rounded-xl bg-slate-900 border text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors ${
            isExistingCustomer
              ? 'border-emerald-500/50 focus:border-emerald-500'
              : 'border-slate-700/80 focus:border-brand-500'
          }`}
        />

        <div className="absolute right-2.5 top-2.5 flex items-center space-x-1">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-slate-400 hover:text-white rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-0.5 text-slate-400 hover:text-slate-200"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto glass-panel-elevated rounded-xl border border-slate-700 shadow-2xl z-50 py-1 divide-y divide-slate-800 animate-fade-in">
          {/* Create as new customer option if query doesn't match an exact customer */}
          {query.trim() && !customers.some((c) => c.name.toLowerCase() === query.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={handleAddNewCustomer}
              className="w-full text-left px-3.5 py-2 hover:bg-brand-500/15 flex items-center space-x-2 text-xs font-semibold text-brand-400 transition-colors"
            >
              <UserPlus className="w-4 h-4 shrink-0 text-brand-400" />
              <span>Register new customer: &quot;<strong>{query.trim()}</strong>&quot;</span>
            </button>
          )}

          {/* Alphabetically sorted matching customer list */}
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => {
              const isSelected = isExistingCustomer && customer.name.toLowerCase() === query.toLowerCase();

              return (
                <button
                  type="button"
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className={`w-full text-left px-3.5 py-2.5 hover:bg-slate-800/80 flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-emerald-500/10' : ''
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-100">{customer.name}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 pl-5">
                      <span className="flex items-center">
                        <Phone className="w-2.5 h-2.5 mr-1 text-slate-500" />
                        {customer.phone}
                      </span>
                      {customer.email && (
                        <span className="flex items-center truncate max-w-[150px]">
                          <Mail className="w-2.5 h-2.5 mr-1 text-slate-500" />
                          {customer.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })
          ) : !query.trim() ? (
            <div className="px-4 py-3 text-center text-xs text-slate-500">
              No registered customers yet. Type a name to create one.
            </div>
          ) : (
            <div className="px-4 py-2.5 text-center text-xs text-slate-400">
              No existing customer matches &quot;{query}&quot;.
            </div>
          )}
        </div>
      )}

      {isEditModalOpen && selectedCustomerObj && (
        <EditCustomerModal
          customer={selectedCustomerObj}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={(updated) => handleSelectCustomer(updated)}
        />
      )}
    </div>
  );
};
