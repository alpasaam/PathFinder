import { useState, useEffect, useCallback } from 'react';
import { ConversationMessage, Recommendation, RIASECScores, AgentState, ProgressStage } from '../lib/types';
import { generateSessionId } from '../lib/utils/format';
import { logger } from '../lib/utils/logger';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function usePathFinder() {
  const [sessionId] = useState(() => generateSessionId());
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
    sendInitialGreeting();
  }, []);

  const sendInitialGreeting = () => {
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
  };

  const addMessage = useCallback(async (message: ConversationMessage) => {
    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);

    if (message.role === 'user') {
      await getAgentResponse(updatedMessages);
    }
  }, [messages]);

  const getAgentResponse = async (conversationHistory: ConversationMessage[]) => {
    try {
      logger.info('Requesting agent response for', conversationHistory.length, 'messages');

      const response = await fetch(`${API_URL}/api/agent-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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

      setAgentState(prev => ({
        ...prev,
        current_question: extractQuestion(data.message),
        conversation_stage: newStage,
        question_count: newQuestionCount
      }));

      if (newStage === 'majors' && currentStage === 'questions') {
        logger.info('Transitioning to majors stage - generating recommendations');
        setCurrentStage(newStage);
        await calculateRIASEC(updatedHistory);
        await generateMajorRecommendations(updatedHistory);
      } else if (newStage !== currentStage) {
        setCurrentStage(newStage);
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

      const response = await fetch(`${API_URL}/api/calculate-riasec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
      logger.info('RIASEC scores calculated', { scores, confidence: data.confidence });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error calculating RIASEC:', errorMsg);
    }
  };

  const generateMajorRecommendations = async (conversationHistory: ConversationMessage[]) => {
    try {
      logger.info('Generating major recommendations...');

      const response = await fetch(`${API_URL}/api/recommend-paths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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

      const data = await response.json();

      if (data.majors && Array.isArray(data.majors)) {
        const majorRecs: Recommendation[] = data.majors.map((rec: any) => ({
          id: generateSessionId(),
          type: 'major',
          title: rec.title,
          description: rec.why_fits,
          match_score: 85,
          metadata: {
            salary_range: rec.salary_range,
            day_in_life: rec.day_in_life,
            details: rec.details
          },
          is_pinned: false
        }));

        setRecommendations(prev => [...prev, ...majorRecs]);
        logger.info('Added major recommendations:', majorRecs.length);
      }

      setCurrentStage('majors');
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

      const response = await fetch(`${API_URL}/api/recommend-paths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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

      const data = await response.json();

      if (data.careers && Array.isArray(data.careers)) {
        const careerRecs: Recommendation[] = data.careers.map((rec: any) => ({
          id: generateSessionId(),
          type: 'career',
          title: rec.title,
          description: rec.why_fits,
          match_score: 85,
          metadata: {
            salary_range: rec.salary_range,
            day_in_life: rec.day_in_life,
            details: rec.details
          },
          is_pinned: false
        }));

        setRecommendations(prev => [...prev, ...careerRecs]);
        logger.info('Added career recommendations:', careerRecs.length);
      }

      setCurrentStage('careers');
      setSelectedMajorId(majorId);
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

  const togglePin = (recommendationId: string, isPinned: boolean) => {
    setRecommendations(prev =>
      prev.map(rec =>
        rec.id === recommendationId ? { ...rec, is_pinned: isPinned } : rec
      )
    );
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
