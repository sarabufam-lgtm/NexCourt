import React from 'react';
import { X, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';
import { ConflictItem } from '../hooks/useOfflineSync';

interface ConflictResolutionModalProps {
  conflict: ConflictItem;
  onDismiss: () => void;
  onSelectAlternative: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflict,
  onDismiss,
  onSelectAlternative
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md glass-panel-elevated rounded-2xl p-6 border border-amber-500/40 shadow-2xl relative">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Offline Booking Clash</h3>
            <p className="text-xs text-amber-300">Action could not be synchronized</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2 mb-4">
          <div className="text-slate-300">
            <span className="font-semibold text-white">Reason:</span> {conflict.error}
          </div>
          {conflict.payload?.startTime && (
            <div className="text-slate-400">
              <span className="font-medium text-slate-300">Target Slot:</span> {conflict.payload.startTime} - {conflict.payload.endTime} on {conflict.payload.bookingDate}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          Another administrator booked or held this slot while your device was disconnected from the network.
          You can pick an alternative court/slot now or dismiss this draft.
        </p>

        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
          <button
            onClick={onDismiss}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
          >
            Dismiss Draft
          </button>
          <button
            onClick={onSelectAlternative}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 flex items-center space-x-1 shadow-md shadow-amber-600/30"
          >
            <span>Choose Alternative</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
