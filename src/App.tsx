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
    startListening,
    stopListening,
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
    if (!isReady || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const currentMessageIndex = messages.length - 1;

    if (
      lastMessage.role === 'assistant' &&
      !isSpeaking &&
      currentMessageIndex > lastSpokenMessageIndex
    ) {
      setLastSpokenMessageIndex(currentMessageIndex);

      speak(lastMessage.content).then(() => {
        setTimeout(() => {
          if (!isListening) {
            startListening();
          }
        }, 500);
      });
    }
  }, [messages, isReady, isSpeaking, isListening, lastSpokenMessageIndex]);

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
            onStopListening={() => {
              stopListening();
              stopSpeaking();
            }}
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
