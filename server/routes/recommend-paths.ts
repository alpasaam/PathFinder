import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const RECOMMENDATION_PROMPT = `Based on the conversation, analyze the student's profile and recommend 2-3 majors and 2-3 related careers.

For each recommendation, provide:
1. Title (major or career name)
2. Why it fits (1 sentence explaining the connection to what they shared)
3. Salary range (realistic expectations)
4. Day in the life (3-4 sentence description)
5. Details:
   - Example courses or skills they'd learn
   - Work environment description
   - Growth outlook

Make recommendations feel personal and connected to specific things they mentioned in the conversation.

Format your response as JSON:
{
  "majors": [
    {
      "title": "Psychology",
      "why_fits": "You love understanding why people do things and want to help them.",
      "salary_range": "$50K - $90K",
      "day_in_life": "...",
      "details": {
        "courses": [...],
        "skills": [...],
        "work_environment": "...",
        "growth_outlook": "..."
      }
    }
  ],
  "careers": [...]
}`;

router.post('/', async (req: Request, res: Response) => {
  try {
    const { conversation_data, riasec_scores, session_id } = req.body;

    if (!conversation_data || !Array.isArray(conversation_data)) {
      return res.status(400).json({ error: 'Invalid conversation_data format' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    const conversationSummary = conversation_data
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `${RECOMMENDATION_PROMPT}\n\nConversation:\n${conversationSummary}\n\nRIASEC Scores: ${JSON.stringify(riasec_scores)}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await openaiResponse.json();
    const recommendations = JSON.parse(data.choices[0].message.content);

    if (supabaseUrl && supabaseAnonKey && session_id) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { data: conversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('session_id', session_id)
          .maybeSingle();

        if (conversation) {
          for (const major of recommendations.majors || []) {
            await supabase.from('recommendations').insert({
              conversation_id: conversation.id,
              type: 'major',
              title: major.title,
              why_fits: major.why_fits,
              salary_range: major.salary_range,
              day_in_life: major.day_in_life,
              details: major.details,
            });
          }

          for (const career of recommendations.careers || []) {
            await supabase.from('recommendations').insert({
              conversation_id: conversation.id,
              type: 'career',
              title: career.title,
              why_fits: career.why_fits,
              salary_range: career.salary_range,
              day_in_life: career.day_in_life,
              details: career.details,
            });
          }
        }
      } catch (dbError) {
        console.warn('Database operation failed (continuing):', dbError);
      }
    }

    res.json(recommendations);
  } catch (error) {
    console.error('Error in recommend-paths:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
