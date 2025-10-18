export interface RIASECScores {
  realistic: number;
  investigative: number;
  artistic: number;
  social: number;
  enterprising: number;
  conventional: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export type ProgressStage = 'questions' | 'majors' | 'careers';

export interface Conversation {
  id: string;
  session_id: string;
  riasec_scores: RIASECScores;
  conversation_data: ConversationMessage[];
  current_stage: ProgressStage;
  question_count: number;
  selected_major_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  id: string;
  conversation_id: string;
  type: 'major' | 'career';
  title: string;
  why_fits: string;
  salary_range: string;
  day_in_life: string;
  details: {
    courses?: string[];
    skills?: string[];
    work_environment?: string;
    growth_outlook?: string;
  };
  is_pinned: boolean;
  created_at: string;
}

export interface MentorRequest {
  id: string;
  recommendation_id: string;
  mentor_name: string;
  mentor_email: string;
  mentor_profile: {
    company?: string;
    position?: string;
    linkedin_url?: string;
  };
  draft_email: string;
  sent_at: string | null;
  created_at: string;
}

export interface VoiceMessage {
  text: string;
  audio_url?: string;
}

export interface AgentState {
  current_question: string;
  conversation_stage: ProgressStage;
  question_count: number;
  gathered_info: {
    interests: string[];
    values: string[];
    enjoyed_courses: string[];
    disliked_courses: string[];
    location_preference?: string;
    personality_traits: string[];
  };
}
