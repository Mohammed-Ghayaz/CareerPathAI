import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { 
  BookOpen, 
  Brain, 
  LogOut, 
  MessageSquare, 
  PlusCircle,
  TrendingUp,
  Sparkles
} from "lucide-react";
import JournalEntry from "@/components/JournalEntry";
import CareerPredictions from "@/components/CareerPredictions";
import MoodChart from "@/components/MoodChart";
import AIMentor from "@/components/AIMentor";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"overview" | "journal" | "careers" | "mentor">("overview");
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [showNewEntry, setShowNewEntry] = useState(false);

  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      
      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      setUserProfile(profile);
      await fetchJournalEntries(session.user.id);
    } catch (error) {
      console.error("Error checking user:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchJournalEntries = async (userId: string) => {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching entries:", error);
    } else {
      setJournalEntries(data || []);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleEntryCreated = () => {
    setShowNewEntry(false);
    if (user) {
      fetchJournalEntries(user.id);
    }
    toast({
      title: "Entry saved!",
      description: "Your journal entry has been analyzed.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold">CareerPathAI</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 py-2 overflow-x-auto">
            <Button
              variant={activeView === "overview" ? "default" : "ghost"}
              onClick={() => setActiveView("overview")}
              className="flex-shrink-0"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Overview
            </Button>
            <Button
              variant={activeView === "journal" ? "default" : "ghost"}
              onClick={() => setActiveView("journal")}
              className="flex-shrink-0"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Journal
            </Button>
            <Button
              variant={activeView === "careers" ? "default" : "ghost"}
              onClick={() => setActiveView("careers")}
              className="flex-shrink-0"
            >
              <Brain className="w-4 h-4 mr-2" />
              Career Insights
            </Button>
            <Button
              variant={activeView === "mentor" ? "default" : "ghost"}
              onClick={() => setActiveView("mentor")}
              className="flex-shrink-0"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              AI Mentor
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeView === "overview" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                Welcome back, {userProfile?.full_name || user?.user_metadata?.full_name || "there"}! 👋
              </h2>
              <p className="text-muted-foreground">Here's your career discovery progress</p>
            </div>
              <Button 
                onClick={() => {
                  setShowNewEntry(true);
                  setActiveView("journal");
                }}
                className="gradient-hero text-white shadow-glow"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                New Entry
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 shadow-medium">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Recent Journal Entries
                </h3>
                {journalEntries.length > 0 ? (
                  <div className="space-y-3">
                    {journalEntries.slice(0, 3).map((entry) => (
                      <div key={entry.id} className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">
                          {entry.title || "Untitled Entry"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No entries yet. Start journaling!</p>
                )}
              </Card>

              <Card className="p-6 shadow-medium">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Career Predictions
                </h3>
                <CareerPredictions userId={user?.id} compact />
              </Card>
            </div>

            <Card className="p-6 shadow-medium">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Mood & Productivity Trends
              </h3>
              <MoodChart userId={user?.id} />
            </Card>
          </div>
        )}

        {activeView === "journal" && (
          <div className="max-w-4xl mx-auto">
            {showNewEntry ? (
              <JournalEntry 
                userId={user?.id}
                onSave={handleEntryCreated}
                onCancel={() => setShowNewEntry(false)}
              />
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold">Your Journal</h2>
                  <Button 
                    onClick={() => setShowNewEntry(true)}
                    className="gradient-hero text-white"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    New Entry
                  </Button>
                </div>
                {journalEntries.length > 0 ? (
                  <div className="space-y-4">
                    {journalEntries.map((entry) => (
                      <Card key={entry.id} className="p-6 shadow-soft hover:shadow-medium transition-shadow">
                        <h3 className="text-xl font-bold mb-2">
                          {entry.title || "Untitled Entry"}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {new Date(entry.created_at).toLocaleDateString()} • Mood: {entry.mood_score}/10
                        </p>
                        <p className="text-muted-foreground line-clamp-3 mb-4">
                          {entry.content}
                        </p>
                        {entry.ai_summary && (
                          <div className="bg-primary/5 p-4 rounded-lg">
                            <p className="text-sm font-medium mb-1">AI Summary:</p>
                            <p className="text-sm text-muted-foreground">{entry.ai_summary}</p>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center shadow-medium">
                    <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-2">Start Your Journey</h3>
                    <p className="text-muted-foreground mb-6">
                      Begin journaling to unlock personalized career insights
                    </p>
                    <Button 
                      onClick={() => setShowNewEntry(true)}
                      className="gradient-hero text-white"
                    >
                      Write Your First Entry
                    </Button>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {activeView === "careers" && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Career Path Predictions</h2>
            <CareerPredictions userId={user?.id} />
          </div>
        )}

        {activeView === "mentor" && (
          <div className="max-w-4xl mx-auto">
            <AIMentor userName={userProfile?.full_name || user?.user_metadata?.full_name || "there"} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;