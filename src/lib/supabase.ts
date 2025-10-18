import { createClient } from '@supabase/supabase-js';
import { Conversation, Recommendation, MentorRequest } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function createConversation(sessionId: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      session_id: sessionId,
      riasec_scores: {},
      conversation_data: []
    })
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      console.log('Conversation already exists, fetching it');
      return await getConversation(sessionId);
    }
    console.error('Error creating conversation:', error);
    return null;
  }

  return data;
}

export async function getConversation(sessionId: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching conversation:', error);
    return null;
  }

  return data;
}

export async function updateConversation(
  sessionId: string,
  updates: Partial<Conversation>
): Promise<boolean> {
  const { error } = await supabase
    .from('conversations')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('session_id', sessionId);

  if (error) {
    console.error('Error updating conversation:', error);
    return false;
  }

  return true;
}

export async function createRecommendation(
  recommendation: Omit<Recommendation, 'id' | 'created_at'>
): Promise<Recommendation | null> {
  const { data, error } = await supabase
    .from('recommendations')
    .insert(recommendation)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error creating recommendation:', error);
    return null;
  }

  return data;
}

export async function getRecommendations(conversationId: string): Promise<Recommendation[]> {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }

  return data || [];
}

export async function togglePinRecommendation(
  recommendationId: string,
  isPinned: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from('recommendations')
    .update({ is_pinned: isPinned })
    .eq('id', recommendationId);

  if (error) {
    console.error('Error toggling pin:', error);
    return false;
  }

  return true;
}

export async function createMentorRequest(
  request: Omit<MentorRequest, 'id' | 'created_at'>
): Promise<MentorRequest | null> {
  const { data, error } = await supabase
    .from('mentor_requests')
    .insert(request)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error creating mentor request:', error);
    return null;
  }

  return data;
}

export async function markMentorRequestSent(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('mentor_requests')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) {
    console.error('Error marking mentor request as sent:', error);
    return false;
  }

  return true;
}
