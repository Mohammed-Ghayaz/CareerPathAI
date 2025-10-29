import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import VoiceRecorder from "./VoiceRecorder";

interface JournalEntryProps {
  userId: string;
  onSave: () => void;
  onCancel: () => void;
}

const JournalEntry = ({ userId, onSave, onCancel }: JournalEntryProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      toast({ title: "Please write something", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: analysis } = await supabase.functions.invoke("analyze-journal", {
        body: { content, userId },
      });

      const { error } = await supabase.from("journal_entries").insert({
        user_id: userId,
        title: title || "Untitled Entry",
        content,
        mood_score: analysis?.moodScore || 5,
        emotions: analysis?.emotions || [],
        detected_skills: analysis?.skills || [],
        detected_interests: analysis?.interests || [],
        ai_summary: analysis?.summary || "",
        ai_insights: analysis?.insights || "",
      });

      if (error) throw error;
      onSave();
    } catch (error: any) {
      toast({ title: "Error saving entry", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setContent((prev) => prev + (prev ? " " : "") + text);
    toast({ title: "Transcribed!", description: "Voice added to your entry" });
  };

  return (
    <Card className="p-6 shadow-medium">
      <h2 className="text-2xl font-bold mb-6">New Journal Entry</h2>
      <div className="space-y-4">
        <Input
          placeholder="Entry title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="relative">
          <Textarea
            placeholder="Write about your day, goals, challenges, learnings..."
            className="min-h-[300px] pr-16"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="absolute bottom-3 right-3">
            <VoiceRecorder onTranscript={handleVoiceTranscript} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="gradient-hero text-white">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save & Analyze
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default JournalEntry;