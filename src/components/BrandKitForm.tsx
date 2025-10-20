'use client';

import { useState } from 'react';
import axios from 'axios';
import { Save, Loader2 } from 'lucide-react';

interface BrandKitData {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoUrl: string | null;
}

export default function BrandKitForm({ initialData }: { initialData: BrandKitData }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');

    try {
      await axios.post('/api/brand-kit', data);
      setStatus('success');
      // Reset status after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save brand kit:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status Alert */}
      {status === 'success' && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm">
          Brand Kit saved successfully!
        </div>
      )}
      {status === 'error' && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
          Failed to save Brand Kit. Please try again.
        </div>
      )}

      {/* Primary Color */}
      <div className="flex items-center space-x-6 bg-gray-50 p-4 rounded-lg border">
        <label className="text-sm font-medium text-gray-700 flex-shrink-0">
          Primary Color:
        </label>
        <input
          type="color"
          value={data.primaryColor}
          onChange={(e) => setData({ ...data, primaryColor: e.target.value })}
          className="w-12 h-12 cursor-pointer"
        />
        <input
          type="text"
          value={data.primaryColor}
          onChange={(e) => setData({ ...data, primaryColor: e.target.value })}
          placeholder="#RRGGBB"
          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-800 w-24 text-sm"
        />
        <p className="text-xs text-gray-500 flex-1">Used for main highlights, buttons, and primary text overlays.</p>
      </div>

      {/* Secondary Color */}
      <div className="flex items-center space-x-6 bg-gray-50 p-4 rounded-lg border">
        <label className="text-sm font-medium text-gray-700 flex-shrink-0">
          Secondary Color:
        </label>
        <input
          type="color"
          value={data.secondaryColor}
          onChange={(e) => setData({ ...data, secondaryColor: e.target.value })}
          className="w-12 h-12 cursor-pointer"
        />
        <input
          type="text"
          value={data.secondaryColor}
          onChange={(e) => setData({ ...data, secondaryColor: e.target.value })}
          placeholder="#RRGGBB"
          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-800 w-24 text-sm"
        />
        <p className="text-xs text-gray-500 flex-1">Used for contrasting elements, shadows, or background boxes for text.</p>
      </div>

      {/* Font Family (Placeholder for now) */}
      <div className="flex items-center space-x-6 bg-gray-50 p-4 rounded-lg border">
        <label htmlFor="fontFamily" className="text-sm font-medium text-gray-700 flex-shrink-0">
          Font Family:
        </label>
        <select
          id="fontFamily"
          value={data.fontFamily}
          onChange={(e) => setData({ ...data, fontFamily: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-800 w-48 text-sm"
          disabled // Disable until font implementation is done
        >
          <option value="Inter">Inter (Default)</option>
          <option value="Roboto">Roboto</option>
          <option value="Montserrat">Montserrat</option>
        </select>
        <p className="text-xs text-gray-500 flex-1">FFmpeg must support the chosen font. (Feature coming soon)</p>
      </div>
      
      {/* Save Button */}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <Save className="w-5 h-5 mr-2" />
            <span>Save Brand Kit</span>
          </>
        )}
      </button>
    </form>
  );
}