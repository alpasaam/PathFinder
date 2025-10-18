import { Router, Request, Response } from "express";

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

router.post("/", async (req: Request, res: Response) => {
  try {
    const { messages, stage, question_number } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    // Use the question_number passed from frontend
    const currentQuestionNumber = question_number || 1;

    console.log("📊 Backend received:", {
      totalMessages: messages.length,
      stage,
      question_number: currentQuestionNumber,
    });

    let systemPrompt = SYSTEM_PROMPT;
    let nextStage = stage;

    // After question 4 is answered (question_number will be 5), transition to majors
    if (stage === "questions" && currentQuestionNumber > 4) {
      systemPrompt = `You are PathFinder. You have completed the 4-question discovery phase.

CRITICAL: DO NOT ASK ANY MORE QUESTIONS. You have already asked all 4 questions.

Now you MUST:
1. Briefly acknowledge what you've learned about the student (1-2 sentences max)
2. Tell them you're excited to show them major recommendations
3. Say something like: "I've got some amazing major recommendations for you based on everything you shared! Let me show you what I found."

Keep your response SHORT - under 30 words. Be enthusiastic but concise!`;
      nextStage = "majors";
      console.log("✅ TRANSITIONING TO MAJORS (question > 4)");
    } else if (stage === "questions") {
      systemPrompt += `\n\n=== CRITICAL INSTRUCTIONS ===
This is question ${currentQuestionNumber} of 4.

Ask ONE clear, conversational question. Make it:
- Short and easy to understand
- Open-ended to get them talking
- Different from what you've already asked

Each question should explore:
- Their interests and what excites them
- Their values and what matters to them
- Their strengths and natural talents
- Their ideal work environment or impact

DO NOT ask multiple questions. DO NOT repeat yourself. Ask ONE new question that builds on what you've learned.`;
      console.log(`💬 Asking question ${currentQuestionNumber} of 4`);
    }

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          temperature: 0.7,
          max_tokens: 150,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API request failed: ${openaiResponse.status}`);
    }

    const data: any = await openaiResponse.json();
    const assistantMessage = data.choices[0].message.content;

    console.log("✅ Agent response:", {
      question_number: currentQuestionNumber,
      stage,
      nextStage,
      message: assistantMessage.substring(0, 100),
    });

    res.json({
      message: assistantMessage,
      next_stage: nextStage,
      question_number: currentQuestionNumber,
    });
  } catch (error) {
    console.error("Error in agent-chat:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
