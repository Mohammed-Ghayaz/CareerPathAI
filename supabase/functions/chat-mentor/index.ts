import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { messages, userName } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch user's journal entries and career predictions for context
    const { data: entries } = await supabase
      .from('journal_entries')
      .select('content, emotions, detected_skills, detected_interests, ai_insights, mood_score')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: predictions } = await supabase
      .from('career_predictions')
      .select('career_path, confidence_score, reasoning')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('confidence_score', { ascending: false });

    const userContext = entries && entries.length > 0 ? `
USER'S JOURNAL INSIGHTS:
${entries.map(e => `
- Emotions: ${e.emotions?.join(', ') || 'N/A'}
- Skills: ${e.detected_skills?.join(', ') || 'N/A'}
- Interests: ${e.detected_interests?.join(', ') || 'N/A'}
- Mood: ${e.mood_score}/10
- Recent insight: ${e.ai_insights || 'N/A'}
`).join('\n')}

CAREER PREDICTIONS FOR THIS USER:
${predictions?.map(p => `- ${p.career_path} (${p.confidence_score}% match): ${p.reasoning}`).join('\n') || 'No predictions yet'}
` : 'User has not journaled yet.';

    const systemPrompt = `You are an empathetic and insightful AI career mentor named "CareerPath AI" analyzing THIS SPECIFIC USER's career journey.${userName ? ` The user's name is ${userName}.` : ''}

${userContext}

Your role is to:
- ${userName ? `Always address the user as ${userName} in a warm, personal way` : 'Address the user in a warm, personal way'}
- Reference and analyze THEIR ACTUAL journal data, emotions, skills, and interests shown above
- Provide personalized advice based on THEIR specific patterns and career predictions
- Help them understand why certain careers match or don't match their profile
- Suggest actionable next steps for THEIR specific situation
- Be supportive, encouraging, and data-driven in your responses
- When they ask about career interests, analyze THEIR detected skills and interests from the journal data
- When suggesting careers, reference the career predictions that were made for them
- When they ask about fields to avoid, reference the career predictions data which includes careers they should avoid

CRITICAL INSTRUCTIONS:
- DO NOT use phrases like "That's a great question" or similar generic openings
- Start directly with their name and dive into the personalized analysis
- Always base your response on their ACTUAL data shown above
- Be specific and reference their emotions, skills, mood scores, and career predictions
- If they don't have enough data yet, encourage them to journal more

IMPORTANT: Always personalize responses based on the user's actual data above. Don't give generic advice.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please contact support.' }),
          { 
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Return the streaming response
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in chat-mentor function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
