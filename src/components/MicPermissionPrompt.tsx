import { Mic, AlertCircle } from 'lucide-react';

interface MicPermissionPromptProps {
  status: 'requesting' | 'denied' | 'error';
  onRetry?: () => void;
}

export default function MicPermissionPrompt({ status, onRetry }: MicPermissionPromptProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'requesting' && (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Mic className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to PathFinder</h2>
            <p className="text-gray-600">
              We need access to your microphone to have a conversation with you.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Please allow microphone access when prompted by your browser.
            </p>
          </>
        )}

        {status === 'denied' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Microphone Access Required</h2>
            <p className="text-gray-600 mb-6">
              PathFinder needs microphone access to have a voice conversation with you. Please
              enable it in your browser settings and try again.
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            )}
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Something Went Wrong</h2>
            <p className="text-gray-600 mb-6">
              We encountered an error setting up the microphone. Please refresh the page and try
              again.
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
