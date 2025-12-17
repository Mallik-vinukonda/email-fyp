import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Label } from '../types';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  labels: Label[];
  onCreateFilter: (criteria: { from: string; subject: string; query: string }, labelId: string) => Promise<void>;
}

export const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, labels, onCreateFilter }) => {
  const [from, setFrom] = useState('');
  const [subject, setSubject] = useState('');
  const [query, setQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLabel) return;
    
    setIsSaving(true);
    await onCreateFilter({ from, subject, query }, selectedLabel);
    setIsSaving(false);
    onClose();
    // Reset form
    setFrom('');
    setSubject('');
    setQuery('');
    setSelectedLabel('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Create Filter</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input 
              type="text" 
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input 
              type="text" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Meeting..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Has words</label>
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Urgent, Important..."
            />
          </div>
          
          <div className="pt-2 border-t border-gray-100 mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Action: Apply Label</label>
            <select
                value={selectedLabel}
                onChange={(e) => setSelectedLabel(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
                <option value="">Select a label...</option>
                {labels.filter(l => l.type === 'user').map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                ))}
            </select>
          </div>

          <button 
            type="submit"
            disabled={isSaving || !selectedLabel}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 mt-4"
          >
            {isSaving ? 'Creating...' : 'Create Filter'}
          </button>
        </form>
      </div>
    </div>
  );
};
