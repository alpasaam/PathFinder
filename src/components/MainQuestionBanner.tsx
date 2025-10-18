import { MessageCircle } from 'lucide-react';

interface MainQuestionBannerProps {
  question: string;
}

export default function MainQuestionBanner({ question }: MainQuestionBannerProps) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-6 px-4 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        <MessageCircle className="w-6 h-6 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium opacity-90 mb-1">Current Focus</p>
          <h2 className="text-xl md:text-2xl font-semibold leading-tight">{question}</h2>
        </div>
      </div>
    </div>
  );
}
