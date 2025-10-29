import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

const MoodChart = ({ userId }: { userId: string }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchMoodData();
    }
  }, [userId]);

  const fetchMoodData = async () => {
    setLoading(true);
    try {
      // Fetch journal entries with mood scores
      const { data: entries, error } = await supabase
        .from("journal_entries")
        .select("created_at, mood_score")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(30);

      if (error) throw error;

      if (entries && entries.length > 0) {
        const formattedData = entries.map((entry) => ({
          date: new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          mood: entry.mood_score || 5,
        }));
        setChartData(formattedData);
      }
    } catch (error) {
      console.error("Error fetching mood data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Start journaling to see your mood trends over time
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="date" 
            className="text-xs fill-muted-foreground"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            domain={[0, 10]} 
            className="text-xs fill-muted-foreground"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="mood" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
            name="Mood Score"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MoodChart;
