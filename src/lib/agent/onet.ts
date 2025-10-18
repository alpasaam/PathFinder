import { RIASECScores } from '../types';

export interface ONetInterestProfile {
  scores: RIASECScores;
  career_matches: string[];
}

export async function getONetInterestProfile(
  responses: Record<string, number>
): Promise<ONetInterestProfile | null> {
  try {
    const response = await fetch('https://services.onetcenter.org/ws/online/interest_profiler/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ responses })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return parseONetResponse(data);
  } catch (error) {
    console.error('O*NET API error:', error);
    return null;
  }
}

function parseONetResponse(data: any): ONetInterestProfile {
  return {
    scores: {
      realistic: data.realistic || 0,
      investigative: data.investigative || 0,
      artistic: data.artistic || 0,
      social: data.social || 0,
      enterprising: data.enterprising || 0,
      conventional: data.conventional || 0
    },
    career_matches: data.career_matches || []
  };
}

export function generateONetQuestions(): Array<{ id: string; text: string; category: keyof RIASECScores }> {
  return [
    { id: 'q1', text: 'Build kitchen cabinets', category: 'realistic' },
    { id: 'q2', text: 'Study the structure of the human body', category: 'investigative' },
    { id: 'q3', text: 'Direct a play', category: 'artistic' },
    { id: 'q4', text: 'Help people with personal problems', category: 'social' },
    { id: 'q5', text: 'Manage a store', category: 'enterprising' },
    { id: 'q6', text: 'Keep detailed records', category: 'conventional' }
  ];
}
