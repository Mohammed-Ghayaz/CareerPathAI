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

    // Get user's journal entries
    const { data: entries, error: entriesError } = await supabase
      .from('journal_entries')
      .select('content, emotions, detected_skills, detected_interests, ai_insights, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (entriesError) {
      throw new Error(`Failed to fetch entries: ${entriesError.message}`);
    }

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Not enough data yet. Keep journaling to get personalized career predictions!' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Prepare data for analysis
    const journalSummary = entries.map(e => ({
      content: e.content.substring(0, 500),
      emotions: e.emotions,
      skills: e.detected_skills,
      interests: e.detected_interests,
      insights: e.ai_insights
    }));

    const predictionPrompt = `Based on these journal entries, predict career paths that would be the best fit. 
Analyze recurring themes in emotions, skills demonstrated, interests, and growth patterns.

Journal data:
${JSON.stringify(journalSummary, null, 2)}

Return as JSON with this EXACT structure:
{
  "recommended": [
    {
      "careerPath": "Career title",
      "confidenceScore": 85,
      "reasoning": "Why this career fits based on the journal patterns",
      "recommendedSkills": ["skill1", "skill2", "skill3"],
      "learningResources": [
        {"title": "Resource 1", "type": "course", "url": "example.com"},
        {"title": "Resource 2", "type": "article", "url": "example.com"}
      ]
    }
  ],
  "avoid": [
    {
      "careerPath": "Career to avoid",
      "reason": "Why this career may not be suitable based on patterns"
    }
  ]
}

Provide exactly 3 recommended careers and 3 careers to avoid.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert career guidance AI that analyzes patterns in journal entries to predict ideal career paths.' 
          },
          { role: 'user', content: predictionPrompt }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    let result;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON object found in AI response');
      }
    } catch (e) {
      console.error('Failed to parse AI predictions:', e);
      result = {
        recommended: [{
          careerPath: 'Technology & Innovation',
          confidenceScore: 70,
          reasoning: 'Based on your reflective thinking and problem-solving approach',
          recommendedSkills: ['Critical Thinking', 'Communication', 'Adaptability'],
          learningResources: []
        }],
        avoid: [{
          careerPath: 'Routine Administrative Work',
          reason: 'May not align with your creative and analytical thinking patterns'
        }]
      };
    }

    // Delete old predictions
    await supabase
      .from('career_predictions')
      .delete()
      .eq('user_id', user.id);

    // Store new predictions
    for (const prediction of result.recommended) {
      await supabase
        .from('career_predictions')
        .insert({
          user_id: user.id,
          career_path: prediction.careerPath,
          confidence_score: prediction.confidenceScore,
          reasoning: prediction.reasoning,
          recommended_skills: prediction.recommendedSkills,
          learning_resources: prediction.learningResources,
          is_active: true
        });
    }

    // Replace careers to avoid for this user
    await supabase
      .from('career_avoidances')
      .delete()
      .eq('user_id', user.id);

    if (Array.isArray(result.avoid)) {
      for (const avoid of result.avoid) {
        await supabase
          .from('career_avoidances')
          .insert({
            user_id: user.id,
            career_path: avoid.careerPath,
            reason: avoid.reason,
          });
      }
    }

    return new Response(JSON.stringify({ 
      predictions: result.recommended,
      avoid: result.avoid 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in predict-career function:', error);
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