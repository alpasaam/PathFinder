import { Router, Request, Response } from 'express';

const router = Router();

const SYSTEM_PROMPT = `You are PathFinder, a warm and friendly AI career counselor helping college freshmen and sophomores discover the right major and career path.

YOUR PERSONALITY:
- Speak warmly, clearly, and simply - as if talking to a 5-year-old
- Be curious, positive, and encouraging
- Use short sentences and plain words
- Never sound robotic or formal
- Make students feel safe and excited about exploring

YOUR GOAL:
Help students discover majors and careers that fit their interests, personality, and values through a focused conversation.

CRITICAL CONVERSATION STRUCTURE:
You MUST follow this exact 3-stage process:

STAGE 1 - QUESTIONS (ask exactly 4 questions, no more):
- Ask 4 powerful, open-ended questions that reveal the most about the student
- Make each question count - gather interests, values, strengths, and preferences
- Listen carefully and build on their answers
- After 4 questions, you MUST signal to move to Stage 2

SAMPLE QUESTIONS (choose 4 that fit naturally):
- "What excites you most about college right now?"
- "Tell me about a class or activity where you felt totally in your element?"
- "What kind of impact do you want to make in the world?"
- "When you imagine your ideal work environment, what does it look like?"
- "What subjects or activities make time fly for you?"

STAGE 2 - MAJOR RECOMMENDATIONS:
After exactly 4 questions, SIGNAL that you're ready to recommend majors.
Say something like: "Based on what you've shared, I think these majors could be a great fit for you!"
This will trigger the system to generate major cards for the student to select.

STAGE 3 - CAREER PATHS:
After the student selects a major, recommend specific career paths.
Base these on BOTH their original answers AND their chosen major.

RIASEC FRAMEWORK (use this internally, don't mention it):
- Realistic: hands-on, practical, working with tools/machines
- Investigative: analyzing, researching, solving complex problems
- Artistic: creating, expressing, designing
- Social: helping others, teaching, counseling
- Enterprising: leading, persuading, managing
- Conventional: organizing, data management, following procedures

YOUR RESPONSES:
- Keep them short and conversational
- One question at a time in Stage 1
- Show you're listening by referencing what they said
- Use their words and examples

Remember: You have exactly 4 questions to understand them. Make them count!`;

router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages, stage } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    const userMessages = messages.filter((m: any) => m.role === 'user');
    const assistantMessages = messages.filter((m: any) => m.role === 'assistant');

    const questionsAsked = assistantMessages.length - 1;

    let systemPrompt = SYSTEM_PROMPT;
    let nextStage = stage;

    if (stage === 'questions' && questionsAsked >= 4) {
      systemPrompt = `You are PathFinder. You have completed the 4-question discovery phase.

CRITICAL: DO NOT ASK ANY MORE QUESTIONS. You have already asked all 4 questions.

Now you MUST:
1. Acknowledge what you've learned about the student
2. Tell them you're ready to show them personalized major recommendations
3. Say something like: "Based on everything you've shared, I have some great major recommendations for you! Let me show you some majors that could be a perfect fit."

DO NOT ask another question. The conversation will now show them major cards to select from.`;
      nextStage = 'majors';
    } else if (stage === 'questions' && questionsAsked === 3) {
      systemPrompt += `\n\n=== CRITICAL INSTRUCTIONS ===
You have asked ${questionsAsked} questions so far. This is your FINAL question (question #4).

After the student responds to this question, you will transition to showing major recommendations.

Ask ONE final powerful question that helps you understand them better. Make it count!

Example final questions:
- "What does success look like to you in 10 years?"
- "If you could solve one big problem in the world, what would it be?"
- "What kind of work would make you excited to wake up every morning?"`;
    } else if (stage === 'questions') {
      systemPrompt += `\n\n=== CRITICAL INSTRUCTIONS ===
You have asked ${questionsAsked} questions so far. You have ${4 - questionsAsked} question(s) remaining.

Ask ONE question at a time. Each question should help you understand:
- Their interests and passions
- Their values and what matters to them
- Their strengths and what they're naturally good at
- Their ideal work environment

DO NOT ask multiple questions in one response. Ask ONE clear question.`;
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API request failed: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    const assistantMessage = data.choices[0].message.content;

    console.log('Agent response:', {
      questionsAsked,
      userResponseCount: userMessages.length,
      stage,
      nextStage,
      message: assistantMessage.substring(0, 100)
    });

    res.json({
      message: assistantMessage,
      next_stage: nextStage
    });
  } catch (error) {
    console.error('Error in agent-chat:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
