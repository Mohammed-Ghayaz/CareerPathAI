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
    const { content, userId } = await req.json();
    
    if (!content || !userId) {
      throw new Error('Content and userId are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Analyze journal entry with AI
    const analysisPrompt = `Analyze this journal entry and extract:
1. Emotions (as array of emotion names)
2. Skills mentioned or demonstrated (as array)
3. Interests or passions (as array)
4. A brief summary (2-3 sentences)
5. Key insights about career potential and growth areas
6. A mood score from 1-10

Journal entry:
${content}

Return as JSON with this exact structure:
{
  "emotions": ["emotion1", "emotion2"],
  "skills": ["skill1", "skill2"],
  "interests": ["interest1", "interest2"],
  "summary": "Brief summary here",
  "insights": "Career insights and growth areas",
  "moodScore": 7
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a career guidance AI that analyzes journal entries to help users discover their ideal career paths.' },
          { role: 'user', content: analysisPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Parse AI response
    let analysis;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      // Provide fallback analysis
      analysis = {
        emotions: ['thoughtful'],
        skills: [],
        interests: [],
        summary: 'Analysis in progress...',
        insights: 'Keep journaling to discover patterns in your career journey.',
        moodScore: 5
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-journal function:', error);
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