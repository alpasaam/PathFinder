import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { messages, stage } = await req.json();

    const userMessages = messages.filter((m: any) => m.role === 'user');
    const questionCount = userMessages.length;

    let systemPrompt = SYSTEM_PROMPT;
    let nextStage = stage;

    if (stage === 'questions' && questionCount >= 4) {
      systemPrompt += "\n\nIMPORTANT: You have asked 4 questions. Now tell the student you're ready to show them major recommendations. Say something like 'Based on everything you've shared, I have some great major recommendations for you!'";
      nextStage = 'majors';
    } else if (stage === 'questions') {
      systemPrompt += `\n\nIMPORTANT: You have asked ${questionCount} questions so far. You can ask ${4 - questionCount} more question(s) before moving to recommendations.`;
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY") || ""}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: 0.8,
        max_tokens: 150,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API request failed: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    const assistantMessage = data.choices[0].message.content;

    console.log("Agent response:", { questionCount, stage, nextStage, message: assistantMessage });

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        next_stage: nextStage
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in agent-chat:", error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});