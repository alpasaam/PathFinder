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

const HARDCODED_QUESTIONS = [
  "What excites you about college the most right now?",
  "Where would you like to live in the future?",
  "What makes you feel productive or fulfilled?",
  "Which high school or first-year courses felt most natural to you?",
  "What classes have you most enjoyed so far?",
  "Which subjects made you feel \"in the zone\"?",
  "Which classes have you disliked or found least engaging?",
];

export function usePathFinder() {
  const [sessionId] = useState(() => generateSessionId());
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [currentStage, setCurrentStage] = useState<ProgressStage>("questions");
  const [questionCount, setQuestionCount] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedMajorId, setSelectedMajorId] = useState<string | null>(null);
  const [agentState, setAgentState] = useState<AgentState>({
    current_question: "Getting ready to chat with you...",
    conversation_stage: "questions",
    question_count: 0,
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
        "Hi! I'm PathFinder. I'm here to help you discover what major and career might be perfect for you. Let's have a quick chat so I can get to know you better! Ready? Let's start: " + HARDCODED_QUESTIONS[0],
      timestamp: Date.now(),
    };

    setMessages([greetingMessage]);
    setQuestionCount(1);
    setCurrentQuestionIndex(0);
    setAgentState((prev) => ({
      ...prev,
      current_question: HARDCODED_QUESTIONS[0],
      question_count: 1,
    }));
  };

  const addMessage = useCallback(
    async (message: ConversationMessage) => {
      console.log("🎤 USER SPOKE:", message.content);

      // Add user message
      const updatedMessages = [...messages, message];
      setMessages(updatedMessages);

      if (message.role === "user") {
        const nextIndex = currentQuestionIndex + 1;

        // Check if we've finished all questions
        if (nextIndex >= HARDCODED_QUESTIONS.length) {
          console.log("🎯 ALL QUESTIONS COMPLETE - GENERATING MAJORS");

          // Add final message
          const finalMessage: ConversationMessage = {
            role: "assistant",
            content: "Thanks for sharing! Let me analyze your responses and recommend some majors that would be a great fit for you.",
            timestamp: Date.now(),
          };

          const finalMessages = [...updatedMessages, finalMessage];
          setMessages(finalMessages);

          // Transition to majors
          setCurrentStage("majors");
          setQuestionCount(HARDCODED_QUESTIONS.length);
          setAgentState((prev) => ({
            ...prev,
            conversation_stage: "majors",
            question_count: HARDCODED_QUESTIONS.length,
            current_question: "Here are some majors that might fit you!",
          }));

          await generateMajorRecommendations(finalMessages);
        } else {
          // Ask next question
          const nextQuestion = HARDCODED_QUESTIONS[nextIndex];
          const responseMessage: ConversationMessage = {
            role: "assistant",
            content: nextQuestion,
            timestamp: Date.now(),
          };

          const newMessages = [...updatedMessages, responseMessage];
          setMessages(newMessages);
          setCurrentQuestionIndex(nextIndex);
          setQuestionCount(nextIndex + 1);
          setAgentState((prev) => ({
            ...prev,
            current_question: nextQuestion,
            question_count: nextIndex + 1,
          }));
        }
      }
    },
    [messages, currentQuestionIndex]
  );


  const generateMajorRecommendations = async (
    conversationHistory: ConversationMessage[]
  ) => {
    try {
      logger.info("Generating major recommendations...");

      // Create a prompt from the conversation
      const conversationText = conversationHistory
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      const prompt = `Based on this conversation with a student, recommend 5-7 college majors that would be a great fit. For each major, provide:
- Title (the major name)
- Why it fits (2-3 sentences explaining why based on their answers)
- Salary range (e.g., "$60k-$90k")
- Day in the life (2-3 sentences describing what studying this major is like)
- Details (any additional relevant information)

Conversation:
${conversationText}

Respond in JSON format with an array of majors:
{
  "majors": [
    {
      "title": "Computer Science",
      "why_fits": "...",
      "salary_range": "...",
      "day_in_life": "...",
      "details": "..."
    }
  ]
}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`OpenAI API error: ${response.status} ${errorText}`);
        throw new Error(
          `Failed to generate major recommendations (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      if (result.majors && Array.isArray(result.majors)) {
        const majorRecs: Recommendation[] = result.majors.map((rec: any) => ({
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

      logger.info("Major recommendations generated successfully");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Error generating major recommendations:", errorMsg);
    }
  };

  const generateCareerRecommendations = async (majorId: string) => {
    try {
      logger.info("Generating career recommendations for major:", majorId);

      const major = recommendations.find((r) => r.id === majorId);
      if (!major) return;

      const conversationText = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      const prompt = `Based on this conversation with a student who has chosen ${major.title} as their major, recommend 5-7 career paths. For each career, provide:
- Title (the career/job title)
- Why it fits (2-3 sentences explaining why based on their personality and the major)
- Salary range (e.g., "$70k-$120k")
- Day in the life (2-3 sentences describing what a typical day looks like)
- Details (any additional relevant information about the career path)

Conversation:
${conversationText}

Respond in JSON format with an array of careers:
{
  "careers": [
    {
      "title": "Software Engineer",
      "why_fits": "...",
      "salary_range": "...",
      "day_in_life": "...",
      "details": "..."
    }
  ]
}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`OpenAI API error: ${response.status} ${errorText}`);
        throw new Error(
          `Failed to generate career recommendations (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      if (result.careers && Array.isArray(result.careers)) {
        const careerRecs: Recommendation[] = result.careers.map((rec: any) => ({
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

  const selectMajor = async (majorId: string) => {
    await generateCareerRecommendations(majorId);
  };

  const skipToMajors = async () => {
    console.log("⏭️ SKIPPING TO MAJORS");

    // Set stage to majors
    setCurrentStage("majors");
    setQuestionCount(HARDCODED_QUESTIONS.length);
    setAgentState((prev) => ({
      ...prev,
      conversation_stage: "majors",
      question_count: HARDCODED_QUESTIONS.length,
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

    // Generate recommendations
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
