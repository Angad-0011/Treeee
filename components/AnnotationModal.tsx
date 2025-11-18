import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { TreeHealth, TreeSpecies, MapLocation } from '../types';
import { SPECIES_OPTIONS, HEALTH_OPTIONS, HEALTH_COLORS } from '../constants';

interface AnnotationModalProps {
  isOpen: boolean;
  location: MapLocation | null;
  onClose: () => void;
  onSave: (data: { species: TreeSpecies; condition: TreeHealth; notes: string }) => void;
}

export const AnnotationModal: React.FC<AnnotationModalProps> = ({
  isOpen,
  location,
  onClose,
  onSave,
}) => {
  const [species, setSpecies] = useState<TreeSpecies>(TreeSpecies.UNKNOWN);
  const [condition, setCondition] = useState<TreeHealth>(TreeHealth.GOOD);
  const [notes, setNotes] = useState('');

  if (!isOpen || !location) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ species, condition, notes });
    // Reset fields
    setSpecies(TreeSpecies.UNKNOWN);
    setCondition(TreeHealth.GOOD);
    setNotes('');
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full z-[2000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-[fadeIn_0.2s_ease-out] overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-600 p-4 flex items-center justify-between text-white">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            New Tree Observation
          </h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-emerald-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-emerald-50 p-3 rounded-lg text-xs text-emerald-800 font-mono mb-4">
            LAT: {location.lat.toFixed(6)} <br />
            LNG: {location.lng.toFixed(6)}
          </div>

          {/* Species Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Species
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SPECIES_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSpecies(opt)}
                  className={`p-2 text-sm rounded-md border transition-all text-left ${
                    species === opt
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-emerald-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Health Condition */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Condition
            </label>
            <div className="flex gap-2">
              {HEALTH_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setCondition(opt)}
                  className={`flex-1 p-2 text-sm rounded-md border transition-all font-medium ${
                    condition === opt
                      ? 'ring-2 ring-offset-1'
                      : 'border-gray-200 opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    borderColor: condition === opt ? HEALTH_COLORS[opt] : undefined,
                    backgroundColor: condition === opt ? `${HEALTH_COLORS[opt]}15` : 'white',
                    color: condition === opt ? 'black' : 'gray',
                    boxShadow: condition === opt ? `0 0 0 2px ${HEALTH_COLORS[opt]}` : 'none'
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          
           {/* Notes */}
           <div className="space-y-2">
            <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
              rows={2}
              placeholder="E.g. Overhanging power lines..."
            />
          </div>

          {/* Actions */}
          <button
            type="submit"
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Save Label
          </button>
        </form>
      </div>
    </div>
  );
};