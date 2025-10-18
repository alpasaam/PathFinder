import { useState } from 'react';
import { Briefcase, Pin, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { Recommendation } from '../lib/types';

interface CareerCardProps {
  recommendation: Recommendation;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onRequestMentor?: (recommendationId: string) => void;
}

export default function CareerCard({ recommendation, onTogglePin, onRequestMentor }: CareerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border-2 ${
        recommendation.is_pinned ? 'border-cyan-500' : 'border-transparent'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="bg-cyan-100 p-2 rounded-lg">
              <Briefcase className="w-5 h-5 text-cyan-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{recommendation.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{recommendation.why_fits}</p>
            </div>
          </div>
          <button
            onClick={() => onTogglePin(recommendation.id, !recommendation.is_pinned)}
            className={`p-2 rounded-lg transition-colors ${
              recommendation.is_pinned
                ? 'bg-cyan-100 text-cyan-600'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
            aria-label={recommendation.is_pinned ? 'Unpin' : 'Pin'}
          >
            <Pin className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-700 mb-3">
          <span className="font-medium">{recommendation.salary_range}</span>
        </div>

        <p className="text-sm text-gray-600 mb-3">{recommendation.day_in_life}</p>

        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
          >
            {isExpanded ? (
              <>
                Show Less <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                Learn More <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>

          {recommendation.is_pinned && onRequestMentor && (
            <button
              onClick={() => onRequestMentor(recommendation.id)}
              className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium transition-colors ml-auto"
            >
              <Mail className="w-4 h-4" />
              Find Mentor
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3 animate-fadeIn">
            {recommendation.details.skills && recommendation.details.skills.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Key Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {recommendation.details.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {recommendation.details.work_environment && (
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Work Environment</h4>
                <p className="text-sm text-gray-700">{recommendation.details.work_environment}</p>
              </div>
            )}

            {recommendation.details.growth_outlook && (
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Job Outlook</h4>
                <p className="text-sm text-gray-700">{recommendation.details.growth_outlook}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
