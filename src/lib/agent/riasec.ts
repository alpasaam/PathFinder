import { RIASECScores } from '../types';

export interface RIASECResult {
  scores: RIASECScores;
  top_types: string[];
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
}

export function getTopRIASECTypes(scores: RIASECScores, count: number = 3): string[] {
  const entries = Object.entries(scores) as [keyof RIASECScores, number][];
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([type]) => type);
}

export function calculateRIASECConfidence(scores: RIASECScores): 'low' | 'medium' | 'high' {
  const values = Object.values(scores);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;

  if (range < 20) return 'low';
  if (range < 40) return 'medium';
  return 'high';
}

export function mergeRIASECScores(
  conversationScores: RIASECScores,
  onetScores?: RIASECScores
): RIASECScores {
  if (!onetScores) return conversationScores;

  return {
    realistic: Math.round((conversationScores.realistic * 0.6) + (onetScores.realistic * 0.4)),
    investigative: Math.round((conversationScores.investigative * 0.6) + (onetScores.investigative * 0.4)),
    artistic: Math.round((conversationScores.artistic * 0.6) + (onetScores.artistic * 0.4)),
    social: Math.round((conversationScores.social * 0.6) + (onetScores.social * 0.4)),
    enterprising: Math.round((conversationScores.enterprising * 0.6) + (onetScores.enterprising * 0.4)),
    conventional: Math.round((conversationScores.conventional * 0.6) + (onetScores.conventional * 0.4))
  };
}

export function getRIASECDescription(type: string): string {
  const descriptions: Record<string, string> = {
    realistic: 'You enjoy hands-on work, practical problem-solving, and working with tools or machines.',
    investigative: 'You love analyzing information, researching topics deeply, and solving complex problems.',
    artistic: 'You thrive when creating, expressing yourself, and bringing new ideas to life.',
    social: 'You feel energized helping others, teaching, and making a positive impact on people.',
    enterprising: 'You enjoy leading projects, persuading others, and driving toward ambitious goals.',
    conventional: 'You excel at organizing information, following systems, and maintaining order.'
  };

  return descriptions[type.toLowerCase()] || '';
}

export const MAJOR_DATABASE = {
  realistic: [
    { name: 'Mechanical Engineering', strength: 95 },
    { name: 'Construction Management', strength: 90 },
    { name: 'Agricultural Science', strength: 85 }
  ],
  investigative: [
    { name: 'Computer Science', strength: 95 },
    { name: 'Data Science', strength: 90 },
    { name: 'Biology', strength: 85 },
    { name: 'Chemistry', strength: 85 },
    { name: 'Physics', strength: 90 }
  ],
  artistic: [
    { name: 'Graphic Design', strength: 95 },
    { name: 'Fine Arts', strength: 90 },
    { name: 'Creative Writing', strength: 85 },
    { name: 'Film Production', strength: 88 }
  ],
  social: [
    { name: 'Psychology', strength: 95 },
    { name: 'Education', strength: 90 },
    { name: 'Social Work', strength: 88 },
    { name: 'Nursing', strength: 85 }
  ],
  enterprising: [
    { name: 'Business Administration', strength: 95 },
    { name: 'Marketing', strength: 90 },
    { name: 'Finance', strength: 85 },
    { name: 'Entrepreneurship', strength: 88 }
  ],
  conventional: [
    { name: 'Accounting', strength: 95 },
    { name: 'Information Systems', strength: 85 },
    { name: 'Supply Chain Management', strength: 80 }
  ]
};
