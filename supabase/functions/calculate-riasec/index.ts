import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { conversation_data } = await req.json();

    const conversationSummary = conversation_data
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const prompt = `${RIASEC_SCORING_PROMPT}\n\nConversation:\n${conversationSummary}`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY") || ""}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error("OpenAI API request failed");
    }

    const data = await openaiResponse.json();
    const result = JSON.parse(data.choices[0].message.content);

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
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