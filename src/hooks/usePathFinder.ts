import { useState, useEffect, useCallback } from "react";
import {
  ConversationMessage,
  Recommendation,
  RIASECScores,
  AgentState,
  ProgressStage,
} from "../lib/types";
import { generateSessionId } from "../lib/utils/format";
import { logger } from "../lib/utils/logger";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function usePathFinder() {
  const [sessionId] = useState(() => generateSessionId());
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [currentStage, setCurrentStage] = useState<ProgressStage>("questions");
  const [questionCount, setQuestionCount] = useState(1); // Start at 1 for the first question
  const [selectedMajorId, setSelectedMajorId] = useState<string | null>(null);
  const [agentState, setAgentState] = useState<AgentState>({
    current_question: "Getting ready to chat with you...",
    conversation_stage: "questions",
    question_count: 1,
    gathered_info: {
      interests: [],
      values: [],
      enjoyed_courses: [],
      disliked_courses: [],
      personality_traits: [],
    },
  });
  const [riasecScores, setRiasecScores] = useState<RIASECScores>({
    realistic: 0,
    investigative: 0,
    artistic: 0,
    social: 0,
    enterprising: 0,
    conventional: 0,
  });

  useEffect(() => {
    sendInitialGreeting();
  }, []);

  const sendInitialGreeting = () => {
    const greetingMessage: ConversationMessage = {
      role: "assistant",
      content:
        "Hi! I'm PathFinder. I'm here to help you discover what major and career might be perfect for you. Let's have a quick chat so I can get to know you better! Ready? Let's start: What excites you most about college right now?",
      timestamp: Date.now(),
    };

    setMessages([greetingMessage]);
    setQuestionCount(1); // Start at 1 since we're asking the first question
    setAgentState((prev) => ({
      ...prev,
      current_question: "What excites you most about college right now?",
      question_count: 1,
    }));
  };

  const addMessage = useCallback(
    async (message: ConversationMessage) => {
      console.log("🎤 USER SPOKE:", message.content);

      // IMMEDIATELY add user message
      const updatedMessages = [...messages, message];
      setMessages(updatedMessages);

      if (message.role === "user") {
        // IMMEDIATELY increment question count BEFORE calling backend
        const nextQuestionNum = questionCount + 1;
        console.log(`🔢 INCREMENTING: ${questionCount} → ${nextQuestionNum}`);
        setQuestionCount(nextQuestionNum);

        // Update agent state immediately
        setAgentState((prev) => ({
          ...prev,
          question_count: nextQuestionNum,
        }));

        // Now get response with the NEXT question number
        await getAgentResponse(updatedMessages, nextQuestionNum);
      }
    },
    [messages, questionCount]
  );

  const getAgentResponse = async (
    conversationHistory: ConversationMessage[],
    nextQuestionNumber: number
  ) => {
    try {
      const currentStageValue = agentState.conversation_stage;

      console.log(
        `📤 SENDING TO BACKEND - Question: ${nextQuestionNumber}, Stage: ${currentStageValue}, Messages: ${conversationHistory.length}`
      );

      const response = await fetch(`${API_URL}/api/agent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversationHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stage: currentStageValue,
          question_number: nextQuestionNumber,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Agent API error: ${response.status} ${errorText}`);
        throw new Error(
          `Failed to get agent response (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();

      if (!data.message) {
        throw new Error("Agent response missing message field");
      }

      console.log(`📥 GOT RESPONSE - Next stage: ${data.next_stage}`);
      console.log(`💬 AI says:`, data.message);

      const assistantMessage: ConversationMessage = {
        role: "assistant",
        content: data.message,
        timestamp: Date.now(),
      };

      const updatedHistory = [...conversationHistory, assistantMessage];
      setMessages(updatedHistory);

      const newStage = data.next_stage || currentStageValue;

      setAgentState((prev) => ({
        ...prev,
        current_question: extractQuestion(data.message),
        conversation_stage: newStage,
        question_count: nextQuestionNumber,
      }));

      // Transition to majors stage after 4 questions
      if (newStage === "majors" && currentStageValue === "questions") {
        console.log("🎯 TRANSITIONING TO MAJORS!");
        setCurrentStage("majors");
        await calculateRIASEC(updatedHistory);
        await generateMajorRecommendations(updatedHistory);
      } else if (newStage !== currentStageValue) {
        console.log(
          `🔄 Stage changed from ${currentStageValue} to ${newStage}`
        );
        setCurrentStage(newStage);
      }

      return assistantMessage;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Error getting agent response:", errorMsg);
      throw new Error(`Agent communication failed: ${errorMsg}`);
    }
  };

  const calculateRIASEC = async (
    conversationHistory: ConversationMessage[]
  ) => {
    try {
      logger.info("Calculating RIASEC scores...");

      const response = await fetch(`${API_URL}/api/calculate-riasec`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_data: conversationHistory,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`RIASEC API error: ${response.status} ${errorText}`);
        throw new Error(
          `Failed to calculate RIASEC scores (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();

      const scores: RIASECScores = {
        realistic: data.realistic || 0,
        investigative: data.investigative || 0,
        artistic: data.artistic || 0,
        social: data.social || 0,
        enterprising: data.enterprising || 0,
        conventional: data.conventional || 0,
      };

      setRiasecScores(scores);
      logger.info("RIASEC scores calculated", {
        scores,
        confidence: data.confidence,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Error calculating RIASEC:", errorMsg);
    }
  };

  const generateMajorRecommendations = async (
    conversationHistory: ConversationMessage[]
  ) => {
    try {
      logger.info("Generating major recommendations...");

      const response = await fetch(`${API_URL}/api/recommend-paths`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_data: conversationHistory,
          riasec_scores: riasecScores,
          session_id: sessionId,
          type: "major",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          `Major recommendations API error: ${response.status} ${errorText}`
        );
        throw new Error(
          `Failed to generate major recommendations (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();

      if (data.majors && Array.isArray(data.majors)) {
        const majorRecs: Recommendation[] = data.majors.map((rec: any) => ({
          id: generateSessionId(),
          type: "major",
          title: rec.title,
          description: rec.why_fits,
          match_score: 85,
          metadata: {
            salary_range: rec.salary_range,
            day_in_life: rec.day_in_life,
            details: rec.details,
          },
          is_pinned: false,
        }));

        setRecommendations((prev) => [...prev, ...majorRecs]);
        logger.info("Added major recommendations:", majorRecs.length);
      }

      setCurrentStage("majors");
      setAgentState((prev) => ({
        ...prev,
        conversation_stage: "majors",
        current_question: "Here are some majors that might fit you!",
      }));

      logger.info("Major recommendations generated successfully");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Error generating major recommendations:", errorMsg);
    }
  };

  const generateCareerRecommendations = async (majorId: string) => {
    try {
      logger.info("Generating career recommendations for major:", majorId);

      const response = await fetch(`${API_URL}/api/recommend-paths`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_data: messages,
          riasec_scores: riasecScores,
          session_id: sessionId,
          type: "career",
          major_id: majorId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          `Career recommendations API error: ${response.status} ${errorText}`
        );
        throw new Error(
          `Failed to generate career recommendations (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();

      if (data.careers && Array.isArray(data.careers)) {
        const careerRecs: Recommendation[] = data.careers.map((rec: any) => ({
          id: generateSessionId(),
          type: "career",
          title: rec.title,
          description: rec.why_fits,
          match_score: 85,
          metadata: {
            salary_range: rec.salary_range,
            day_in_life: rec.day_in_life,
            details: rec.details,
          },
          is_pinned: false,
        }));

        setRecommendations((prev) => [...prev, ...careerRecs]);
        logger.info("Added career recommendations:", careerRecs.length);
      }

      setCurrentStage("careers");
      setSelectedMajorId(majorId);
      setAgentState((prev) => ({
        ...prev,
        conversation_stage: "careers",
        current_question: "Here are some career paths for your chosen major!",
      }));

      logger.info("Career recommendations generated successfully");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Error generating career recommendations:", errorMsg);
    }
  };

  const togglePin = (recommendationId: string, isPinned: boolean) => {
    setRecommendations((prev) =>
      prev.map((rec) =>
        rec.id === recommendationId ? { ...rec, is_pinned: isPinned } : rec
      )
    );
  };

  const extractQuestion = (text: string): string => {
    const questionMatch = text.match(/[^.!?]*\?/);
    return questionMatch ? questionMatch[0].trim() : text.split(".")[0] || text;
  };

  const selectMajor = async (majorId: string) => {
    await generateCareerRecommendations(majorId);
  };

  const skipToMajors = async () => {
    console.log("⏭️ SKIPPING TO MAJORS");

    // Set stage to majors
    setCurrentStage("majors");
    setQuestionCount(4); // Set to completed
    setAgentState((prev) => ({
      ...prev,
      conversation_stage: "majors",
      question_count: 4,
      current_question: "Here are some major recommendations for you!",
    }));

    // Add a system message
    const skipMessage: ConversationMessage = {
      role: "assistant",
      content:
        "Let me show you some great major recommendations based on our conversation so far!",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, skipMessage]);

    // Calculate RIASEC and generate recommendations
    await calculateRIASEC(messages);
    await generateMajorRecommendations(messages);
  };

  return {
    messages,
    recommendations,
    agentState,
    riasecScores,
    currentStage,
    questionCount,
    selectedMajorId,
    addMessage,
    togglePin,
    selectMajor,
    skipToMajors,
    majorRecommendations: recommendations.filter((r) => r.type === "major"),
    careerRecommendations: recommendations.filter((r) => r.type === "career"),
    pinnedRecommendations: recommendations.filter((r) => r.is_pinned),
  };
}
