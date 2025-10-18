import { Check } from 'lucide-react';

export type ProgressStage = 'questions' | 'majors' | 'careers';

interface ProgressBarProps {
  currentStage: ProgressStage;
  questionCount?: number;
}

const stages = [
  { id: 'questions' as const, label: 'Getting to Know You', maxQuestions: 7 },
  { id: 'majors' as const, label: 'Explore Majors' },
  { id: 'careers' as const, label: 'Discover Careers' }
];

export function ProgressBar({ currentStage, questionCount = 0 }: ProgressBarProps) {
  const currentIndex = stages.findIndex(s => s.id === currentStage);

  return (
    <div className="w-full bg-white border-b border-gray-200 px-4 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          {stages.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isUpcoming = index > currentIndex;

            return (
              <div key={stage.id} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                      transition-all duration-300
                      ${isCompleted ? 'bg-green-500 text-white' : ''}
                      ${isCurrent ? 'bg-blue-500 text-white ring-4 ring-blue-200' : ''}
                      ${isUpcoming ? 'bg-gray-200 text-gray-500' : ''}
                    `}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
                  </div>
                  <div className="ml-3">
                    <div
                      className={`
                        font-medium text-sm
                        ${isCurrent ? 'text-blue-600' : ''}
                        ${isCompleted ? 'text-green-600' : ''}
                        ${isUpcoming ? 'text-gray-500' : ''}
                      `}
                    >
                      {stage.label}
                    </div>
                    {isCurrent && stage.id === 'questions' && (
                      <div className="text-xs text-gray-500 mt-1">
                        Question {questionCount} of {stage.maxQuestions}
                      </div>
                    )}
                  </div>
                </div>

                {index < stages.length - 1 && (
                  <div className="flex-1 mx-4 h-0.5 bg-gray-200 relative">
                    <div
                      className={`
                        absolute inset-0 bg-gradient-to-r transition-all duration-500
                        ${isCompleted ? 'from-green-500 to-green-500 w-full' : ''}
                        ${isCurrent ? 'from-blue-500 to-blue-300 w-0' : ''}
                        ${isUpcoming ? 'w-0' : ''}
                      `}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
