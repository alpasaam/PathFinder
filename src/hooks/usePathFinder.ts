import { useState, useEffect, useCallback } from 'react';
import { ConversationMessage, Recommendation, RIASECScores, AgentState, ProgressStage } from '../lib/types';
import {
  createConversation,
  getConversation,
  updateConversation,
  getRecommendations,
  togglePinRecommendation,
  createRecommendation
} from '../lib/supabase';
import { generateSessionId } from '../lib/utils/format';
import { logger } from '../lib/utils/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function usePathFinder() {
  const [sessionId] = useState(() => generateSessionId());
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [currentStage, setCurrentStage] = useState<ProgressStage>('questions');
  const [questionCount, setQuestionCount] = useState(0);
  const [selectedMajorId, setSelectedMajorId] = useState<string | null>(null);
  const [agentState, setAgentState] = useState<AgentState>({
    current_question: 'Getting ready to chat with you...',
    conversation_stage: 'questions',
    question_count: 0,
    gathered_info: {
      interests: [],
      values: [],
      enjoyed_courses: [],
      disliked_courses: [],
      personality_traits: []
    }
  });
  const [riasecScores, setRiasecScores] = useState<RIASECScores>({
    realistic: 0,
    investigative: 0,
    artistic: 0,
    social: 0,
    enterprising: 0,
    conventional: 0
  });

  useEffect(() => {
    initializeConversation();
  }, []);

  const initializeConversation = async () => {
    let conversation = await getConversation(sessionId);

    if (!conversation) {
      conversation = await createConversation(sessionId);
    }

    if (conversation) {
      setConversationId(conversation.id);
      setCurrentStage(conversation.current_stage || 'questions');
      setQuestionCount(conversation.question_count || 0);
      setSelectedMajorId(conversation.selected_major_id);
      logger.info('Conversation initialized', { sessionId, id: conversation.id });

      if (conversation.conversation_data && conversation.conversation_data.length > 0) {
        setMessages(conversation.conversation_data as ConversationMessage[]);
      } else {
        await sendInitialGreeting();
      }
    }
  };

  const sendInitialGreeting = async () => {
    const greetingMessage: ConversationMessage = {
      role: 'assistant',
      content: "Hi! I'm PathFinder. I'm here to help you discover what major and career might be perfect for you. Let's chat and explore together! What excites you most about college right now?",
      timestamp: Date.now()
    };

    setMessages([greetingMessage]);
    setAgentState(prev => ({
      ...prev,
      current_question: 'What excites you most about college right now?',
      question_count: 0
    }));

    await updateConversation(sessionId, {
      conversation_data: [greetingMessage],
      current_stage: 'questions',
      question_count: 0
    } as any);
  };

  const addMessage = useCallback(async (message: ConversationMessage) => {
    console.log('addMessage called with:', message);

    const updatedMessages = [...messages, message];
    console.log('Updated messages:', updatedMessages);

    setMessages(updatedMessages);

    if (message.role === 'user') {
      console.log('Getting agent response for user message');
      await getAgentResponse(updatedMessages);
    }

    await updateConversation(sessionId, {
      conversation_data: updatedMessages
    } as any);
  }, [sessionId, messages]);

  const getAgentResponse = async (conversationHistory: ConversationMessage[]) => {
    try {
      logger.info('Requesting agent response for', conversationHistory.length, 'messages');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/agent-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: conversationHistory.map(m => ({
            role: m.role,
            content: m.content
          })),
          stage: agentState.conversation_stage
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Agent API error:', response.status, errorText);
        throw new Error(`Failed to get agent response (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (!data.message) {
        throw new Error('Agent response missing message field');
      }

      logger.info('Received agent response:', data.message.substring(0, 100));

      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: Date.now()
      };

      const updatedHistory = [...conversationHistory, assistantMessage];

      setMessages(updatedHistory);

      const userMessages = updatedHistory.filter(m => m.role === 'user').length;
      const newQuestionCount = Math.min(userMessages, 4);
      setQuestionCount(newQuestionCount);

      const newStage = data.next_stage || currentStage;
      if (newStage !== currentStage) {
        setCurrentStage(newStage);
      }

      setAgentState(prev => ({
        ...prev,
        current_question: extractQuestion(data.message),
        conversation_stage: newStage,
        question_count: newQuestionCount
      }));

      await updateConversation(sessionId, {
        conversation_data: updatedHistory,
        current_stage: newStage,
        question_count: newQuestionCount
      } as any);

      if (newQuestionCount >= 4 && currentStage === 'questions') {
        await calculateRIASEC(updatedHistory);
        await generateMajorRecommendations(updatedHistory);
      }

      return assistantMessage;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting agent response:', errorMsg);
      throw new Error(`Agent communication failed: ${errorMsg}`);
    }
  };

  const calculateRIASEC = async (conversationHistory: ConversationMessage[]) => {
    try {
      logger.info('Calculating RIASEC scores...');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/calculate-riasec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_data: conversationHistory
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('RIASEC API error:', response.status, errorText);
        throw new Error(`Failed to calculate RIASEC scores (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      const scores: RIASECScores = {
        realistic: data.realistic || 0,
        investigative: data.investigative || 0,
        artistic: data.artistic || 0,
        social: data.social || 0,
        enterprising: data.enterprising || 0,
        conventional: data.conventional || 0
      };

      setRiasecScores(scores);

      await updateConversation(sessionId, {
        riasec_scores: scores
      } as any);

      logger.info('RIASEC scores calculated', { scores, confidence: data.confidence });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error calculating RIASEC:', errorMsg);
    }
  };

  const generateMajorRecommendations = async (conversationHistory: ConversationMessage[]) => {
    try {
      logger.info('Generating major recommendations...');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/recommend-paths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_data: conversationHistory,
          riasec_scores: riasecScores,
          session_id: sessionId,
          type: 'major'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Major recommendations API error:', response.status, errorText);
        throw new Error(`Failed to generate major recommendations (${response.status}): ${errorText}`);
      }

      await loadRecommendations();
      setCurrentStage('majors');

      await updateConversation(sessionId, {
        current_stage: 'majors'
      } as any);

      setAgentState(prev => ({
        ...prev,
        conversation_stage: 'majors',
        current_question: 'Here are some majors that might fit you!'
      }));

      logger.info('Major recommendations generated successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error generating major recommendations:', errorMsg);
    }
  };

  const generateCareerRecommendations = async (majorId: string) => {
    try {
      logger.info('Generating career recommendations for major:', majorId);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/recommend-paths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_data: messages,
          riasec_scores: riasecScores,
          session_id: sessionId,
          type: 'career',
          major_id: majorId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Career recommendations API error:', response.status, errorText);
        throw new Error(`Failed to generate career recommendations (${response.status}): ${errorText}`);
      }

      await loadRecommendations();
      setCurrentStage('careers');
      setSelectedMajorId(majorId);

      await updateConversation(sessionId, {
        current_stage: 'careers',
        selected_major_id: majorId
      } as any);

      setAgentState(prev => ({
        ...prev,
        conversation_stage: 'careers',
        current_question: 'Here are some career paths for your chosen major!'
      }));

      logger.info('Career recommendations generated successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error generating career recommendations:', errorMsg);
    }
  };

  const loadRecommendations = async () => {
    if (!conversationId) return;

    const recs = await getRecommendations(conversationId);
    setRecommendations(recs);
  };

  const togglePin = async (recommendationId: string, isPinned: boolean) => {
    const success = await togglePinRecommendation(recommendationId, isPinned);
    if (success) {
      setRecommendations(prev =>
        prev.map(rec =>
          rec.id === recommendationId ? { ...rec, is_pinned: isPinned } : rec
        )
      );
    }
  };

  const extractQuestion = (text: string): string => {
    const questionMatch = text.match(/[^.!?]*\?/);
    return questionMatch ? questionMatch[0].trim() : text.split('.')[0] || text;
  };

  const selectMajor = async (majorId: string) => {
    await generateCareerRecommendations(majorId);
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
    majorRecommendations: recommendations.filter(r => r.type === 'major'),
    careerRecommendations: recommendations.filter(r => r.type === 'career'),
    pinnedRecommendations: recommendations.filter(r => r.is_pinned)
  };
}
