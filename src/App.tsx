import { useEffect, useState } from "react";
import MainQuestionBanner from "./components/MainQuestionBanner";
import ChatPane from "./components/ChatPane";
import MajorCard from "./components/MajorCard";
import CareerCard from "./components/CareerCard";
import PinBar from "./components/PinBar";
import MicPermissionPrompt from "./components/MicPermissionPrompt";
import { ProgressBar } from "./components/ProgressBar";
import { useVoiceChat } from "./hooks/useVoiceChat";
import { usePathFinder } from "./hooks/usePathFinder";
import { ConversationMessage } from "./lib/types";
import { logger } from "./lib/utils/logger";

function App() {
  const [isReady, setIsReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [lastSpokenMessageId, setLastSpokenMessageId] = useState<string>("");

  const {
    messages,
    agentState,
    currentStage,
    questionCount,
    addMessage,
    togglePin,
    selectMajor,
    skipToMajors,
    majorRecommendations,
    careerRecommendations,
    pinnedRecommendations,
  } = usePathFinder();

  const {
    isListening,
    isSpeaking,
    micPermission,
    toggleListening,
    speak,
    retryPermission,
  } = useVoiceChat({
    onMessage: async (message: ConversationMessage) => {
      console.log("🗣️ User message received in App, sending to PathFinder");
      await addMessage(message);
    },
    onError: (error: string) => {
      logger.error("Voice chat error:", error);
    },
  });

  useEffect(() => {
    if (micPermission === "granted" && !isReady) {
      setIsReady(true);
    }
  }, [micPermission, isReady]);

  // COMPLETELY REDESIGNED VOICE TRIGGER
  useEffect(() => {
    if (!isReady || !hasStarted || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];

    // Create unique ID for this message
    const messageId = `${lastMessage.role}-${lastMessage.timestamp}`;

    console.log("🔊 Voice trigger check:", {
      messageId,
      lastSpokenId: lastSpokenMessageId,
      role: lastMessage.role,
      isSpeaking,
      alreadySpoken: messageId === lastSpokenMessageId,
    });

    // Only speak if:
    // 1. It's an assistant message
    // 2. We're not currently speaking
    // 3. We haven't spoken this exact message before
    if (
      lastMessage.role === "assistant" &&
      !isSpeaking &&
      messageId !== lastSpokenMessageId
    ) {
      console.log("🔊 SPEAKING NOW:", lastMessage.content.substring(0, 50));
      setLastSpokenMessageId(messageId);

      speak(lastMessage.content)
        .then(() => {
          console.log("✅ Finished speaking, waiting 500ms before listening");
          setTimeout(() => {
            if (!isListening) {
              console.log("🎤 Auto-starting listening");
              toggleListening();
            }
          }, 500);
        })
        .catch((error) => {
          console.error("❌ Speech failed:", error);
          logger.error("Failed to speak message:", error);
        });
    }
  }, [messages, isReady, hasStarted, isSpeaking, lastSpokenMessageId]);

  const handleStart = () => {
    setHasStarted(true);
  };

  if (micPermission !== "granted") {
    return (
      <MicPermissionPrompt status={micPermission} onRetry={retryPermission} />
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Welcome to PathFinder
          </h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            I'm here to help you discover the perfect major and career path
            through a friendly conversation. When you're ready, click the button
            below and we'll start exploring your interests together.
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
      <ProgressBar currentStage={currentStage} questionCount={questionCount} />

      <MainQuestionBanner question={agentState.current_question} />

      <PinBar
        pinnedRecommendations={pinnedRecommendations}
        onUnpin={(id) => togglePin(id, false)}
      />

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        <div className="lg:w-1/2 h-1/2 lg:h-full border-r border-gray-200 relative">
          <ChatPane
            messages={messages}
            isListening={isListening}
            isSpeaking={isSpeaking}
            onToggleMic={toggleListening}
          />

          {/* SKIP BUTTON - Only show during questions stage */}
          {currentStage === "questions" && (
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={skipToMajors}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium text-sm hover:from-blue-600 hover:to-cyan-600 transition-all transform hover:scale-105 shadow-md flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                </svg>
                Skip to Majors
              </button>
            </div>
          )}
        </div>

        <div className="lg:w-1/2 h-1/2 lg:h-full overflow-y-auto p-4 bg-gray-50">
          <div className="max-w-2xl mx-auto space-y-4">
            {currentStage === "questions" && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <p className="text-lg font-medium mb-2">
                    Building your profile...
                  </p>
                  <p className="text-sm">
                    I'm learning about you through our conversation!
                  </p>
                  <p className="text-xs mt-2 text-gray-400">
                    {questionCount} of 4 questions asked
                  </p>
                </div>
              </div>
            )}

            {currentStage === "majors" && majorRecommendations.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Majors That Fit You
                </h2>
                <p className="text-gray-600 mb-4">
                  Select a major to explore career possibilities!
                </p>
                <div className="space-y-3">
                  {majorRecommendations.map((major) => (
                    <div
                      key={major.id}
                      onClick={() => selectMajor(major.id)}
                      className="cursor-pointer"
                    >
                      <MajorCard
                        recommendation={major}
                        onTogglePin={togglePin}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStage === "careers" && careerRecommendations.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Career Paths for Your Major
                </h2>
                <div className="space-y-3">
                  {careerRecommendations.map((career) => (
                    <CareerCard
                      key={career.id}
                      recommendation={career}
                      onTogglePin={togglePin}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
