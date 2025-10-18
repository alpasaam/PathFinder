import { Router, Request, Response } from 'express';

const router = Router();

const RIASEC_SCORING_PROMPT = `Based on the conversation so far, estimate the student's RIASEC personality profile.

RIASEC Types:
- Realistic (R): Practical, hands-on, working with tools/machines/animals
- Investigative (I): Analytical, research-oriented, problem-solving
- Artistic (A): Creative, expressive, design-focused
- Social (S): People-oriented, helping, teaching
- Enterprising (E): Leadership, persuasion, business-oriented
- Conventional (C): Organized, detail-oriented, data/procedures

Score each dimension from 0-100 based on evidence from the conversation.

Return JSON:
{
  "realistic": 0-100,
  "investigative": 0-100,
  "artistic": 0-100,
  "social": 0-100,
  "enterprising": 0-100,
  "conventional": 0-100,
  "confidence": "low|medium|high",
  "reasoning": "Brief explanation of the scores"
}`;

router.post('/', async (req: Request, res: Response) => {
  try {
    const { conversation_data } = req.body;

    if (!conversation_data || !Array.isArray(conversation_data)) {
      return res.status(400).json({ error: 'Invalid conversation_data format' });
    }

    const conversationSummary = conversation_data
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `${RIASEC_SCORING_PROMPT}\n\nConversation:\n${conversationSummary}`;

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
        temperature: 0.5,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await openaiResponse.json();
    const result = JSON.parse(data.choices[0].message.content);

    res.json(result);
  } catch (error) {
    console.error('Error in calculate-riasec:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
