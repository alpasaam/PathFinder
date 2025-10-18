import { Pin } from 'lucide-react';
import { Recommendation } from '../lib/types';

interface PinBarProps {
  pinnedRecommendations: Recommendation[];
  onUnpin: (id: string) => void;
}

export default function PinBar({ pinnedRecommendations, onUnpin }: PinBarProps) {
  if (pinnedRecommendations.length === 0) return null;

  return (
    <div className="bg-white border-b border-gray-200 py-3 px-4 shadow-sm">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <Pin className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-700">Pinned</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {pinnedRecommendations.map((rec) => (
            <button
              key={rec.id}
              onClick={() => onUnpin(rec.id)}
              className="group flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-red-50 rounded-full text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
            >
              <span>{rec.title}</span>
              <span className="text-gray-400 group-hover:text-red-500">×</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
