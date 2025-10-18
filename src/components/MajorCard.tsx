import { useState } from 'react';
import { GraduationCap, Pin, ChevronDown, ChevronUp } from 'lucide-react';
import { Recommendation } from '../lib/types';

interface MajorCardProps {
  recommendation: Recommendation;
  onTogglePin: (id: string, isPinned: boolean) => void;
}

export default function MajorCard({ recommendation, onTogglePin }: MajorCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border-2 ${
        recommendation.is_pinned ? 'border-blue-500' : 'border-transparent'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="bg-blue-100 p-2 rounded-lg">
              <GraduationCap className="w-5 h-5 text-blue-600" />
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
                ? 'bg-blue-100 text-blue-600'
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

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
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

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3 animate-fadeIn">
            {recommendation.details.courses && recommendation.details.courses.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Example Courses</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {recommendation.details.courses.map((course, idx) => (
                    <li key={idx}>{course}</li>
                  ))}
                </ul>
              </div>
            )}

            {recommendation.details.skills && recommendation.details.skills.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Skills You'll Learn</h4>
                <div className="flex flex-wrap gap-2">
                  {recommendation.details.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
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
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Growth Outlook</h4>
                <p className="text-sm text-gray-700">{recommendation.details.growth_outlook}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
