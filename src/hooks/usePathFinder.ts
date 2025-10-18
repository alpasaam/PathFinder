import { useState, useEffect, useCallback } from 'react';
import { ConversationMessage, Recommendation, RIASECScores, AgentState } from '../lib/types';
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
  const [agentState, setAgentState] = useState<AgentState>({
    current_question: 'Getting ready to chat with you...',
    conversation_stage: 'greeting',
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
      current_question: 'What excites you most about college right now?'
    }));

    await updateConversation(sessionId, {
      conversation_data: [greetingMessage]
    } as any);
  };

  const addMessage = useCallback(async (message: ConversationMessage) => {
    console.log('addMessage called with:', message);
    setMessages(prev => {
      console.log('Previous messages:', prev);
      const updatedMessages = [...prev, message];
      console.log('Updated messages:', updatedMessages);

      if (message.role === 'user') {
        console.log('Getting agent response for user message');
        getAgentResponse(updatedMessages);
      }

      updateConversation(sessionId, {
        conversation_data: updatedMessages
      } as any);

      return updatedMessages;
    });
  }, [sessionId]);

  const getAgentResponse = async (conversationHistory: ConversationMessage[]) => {
    try {
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
        throw new Error('Failed to get agent response');
      }

      const data = await response.json();

      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setAgentState(prev => ({
        ...prev,
        current_question: extractQuestion(data.message),
        conversation_stage: data.next_stage || prev.conversation_stage
      }));

      if (conversationHistory.length >= 8 && agentState.conversation_stage === 'exploration') {
        await calculateRIASEC(conversationHistory);
      }

      if (conversationHistory.length >= 12 && !recommendations.length) {
        await generateRecommendations(conversationHistory);
      }

      return assistantMessage;
    } catch (error) {
      logger.error('Error getting agent response:', error);
      throw error;
    }
  };

  const calculateRIASEC = async (conversationHistory: ConversationMessage[]) => {
    try {
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
        throw new Error('Failed to calculate RIASEC scores');
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
      logger.error('Error calculating RIASEC:', error);
    }
  };

  const generateRecommendations = async (conversationHistory: ConversationMessage[]) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/recommend-paths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_data: conversationHistory,
          riasec_scores: riasecScores,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate recommendations');
      }

      await loadRecommendations();

      setAgentState(prev => ({
        ...prev,
        conversation_stage: 'recommendation',
        current_question: 'Here are some paths that might fit you!'
      }));

      logger.info('Recommendations generated');
    } catch (error) {
      logger.error('Error generating recommendations:', error);
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

  return {
    messages,
    recommendations,
    agentState,
    riasecScores,
    addMessage,
    togglePin,
    pinnedRecommendations: recommendations.filter(r => r.is_pinned)
  };
}
