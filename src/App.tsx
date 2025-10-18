import { useEffect, useState } from 'react';
import MainQuestionBanner from './components/MainQuestionBanner';
import ChatPane from './components/ChatPane';
import MajorCard from './components/MajorCard';
import CareerCard from './components/CareerCard';
import PinBar from './components/PinBar';
import MicPermissionPrompt from './components/MicPermissionPrompt';
import { useVoiceChat } from './hooks/useVoiceChat';
import { usePathFinder } from './hooks/usePathFinder';
import { ConversationMessage } from './lib/types';
import { logger } from './lib/utils/logger';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [lastSpokenMessageIndex, setLastSpokenMessageIndex] = useState(-1);

  const {
    messages,
    recommendations,
    agentState,
    addMessage,
    togglePin,
    pinnedRecommendations
  } = usePathFinder();

  const {
    isListening,
    isSpeaking,
    micPermission,
    toggleListening,
    speak,
    stopSpeaking,
    retryPermission
  } = useVoiceChat({
    onMessage: async (message: ConversationMessage) => {
      await addMessage(message);
    },
    onError: (error: string) => {
      logger.error('Voice chat error:', error);
    }
  });

  useEffect(() => {
    if (micPermission === 'granted' && !isReady) {
      setIsReady(true);
    }
  }, [micPermission, isReady]);

  useEffect(() => {
    if (!isReady || !hasStarted || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const currentMessageIndex = messages.length - 1;

    if (
      lastMessage.role === 'assistant' &&
      !isSpeaking &&
      currentMessageIndex > lastSpokenMessageIndex
    ) {
      logger.info('Speaking message:', lastMessage.content.substring(0, 100));
      setLastSpokenMessageIndex(currentMessageIndex);
      speak(lastMessage.content).catch((error) => {
        logger.error('Failed to speak message:', error);
      });
    }
  }, [messages, isReady, hasStarted, isSpeaking, lastSpokenMessageIndex]);

  const handleStart = () => {
    setHasStarted(true);
  };

  if (micPermission !== 'granted') {
    return (
      <MicPermissionPrompt
        status={micPermission}
        onRetry={retryPermission}
      />
    );
  }

  const majors = recommendations.filter(r => r.type === 'major');
  const careers = recommendations.filter(r => r.type === 'career');

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome to PathFinder</h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            I'm here to help you discover the perfect major and career path through a friendly conversation.
            When you're ready, click the button below and we'll start exploring your interests together.
          </p>
          <button
            onClick={handleStart}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105 shadow-lg"
          >
            Start Conversation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <MainQuestionBanner question={agentState.current_question} />

      <PinBar
        pinnedRecommendations={pinnedRecommendations}
        onUnpin={(id) => togglePin(id, false)}
      />

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        <div className="lg:w-1/2 h-1/2 lg:h-full border-r border-gray-200">
          <ChatPane
            messages={messages}
            isListening={isListening}
            isSpeaking={isSpeaking}
            onToggleMic={toggleListening}
          />
        </div>

        <div className="lg:w-1/2 h-1/2 lg:h-full overflow-y-auto p-4 bg-gray-50">
          <div className="max-w-2xl mx-auto space-y-4">
            {recommendations.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <p className="text-lg font-medium mb-2">Building your profile...</p>
                  <p className="text-sm">
                    Keep chatting, and I'll suggest majors and careers that fit you!
                  </p>
                </div>
              </div>
            ) : (
              <>
                {majors.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">Majors for You</h2>
                    <div className="space-y-3">
                      {majors.map((major) => (
                        <MajorCard
                          key={major.id}
                          recommendation={major}
                          onTogglePin={togglePin}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {careers.length > 0 && (
                  <div className="mt-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-3">Career Paths</h2>
                    <div className="space-y-3">
                      {careers.map((career) => (
                        <CareerCard
                          key={career.id}
                          recommendation={career}
                          onTogglePin={togglePin}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
