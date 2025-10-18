import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { conversation_data, riasec_scores, session_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const conversationSummary = conversation_data
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const prompt = `${RECOMMENDATION_PROMPT}\n\nConversation:\n${conversationSummary}\n\nRIASEC Scores: ${JSON.stringify(riasec_scores)}`;

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
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error("OpenAI API request failed");
    }

    const data = await openaiResponse.json();
    const recommendations = JSON.parse(data.choices[0].message.content);

    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("session_id", session_id)
      .single();

    if (conversation) {
      for (const major of recommendations.majors || []) {
        await supabase.from("recommendations").insert({
          conversation_id: conversation.id,
          type: "major",
          title: major.title,
          why_fits: major.why_fits,
          salary_range: major.salary_range,
          day_in_life: major.day_in_life,
          details: major.details,
        });
      }

      for (const career of recommendations.careers || []) {
        await supabase.from("recommendations").insert({
          conversation_id: conversation.id,
          type: "career",
          title: career.title,
          why_fits: career.why_fits,
          salary_range: career.salary_range,
          day_in_life: career.day_in_life,
          details: career.details,
        });
      }
    }

    return new Response(
      JSON.stringify(recommendations),
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