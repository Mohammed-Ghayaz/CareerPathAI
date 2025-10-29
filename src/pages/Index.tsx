import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, LineChart, MessageSquare, Sparkles, TrendingUp, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  return <div className="min-h-screen">
      {/* Hero Section */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-8 animate-float">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI-Powered Career Discovery</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Discover Your Ideal
              <br />
              Career Path Through
              <br />
              <span className="bg-clip-text text-yellow-200">
                Self-Reflection
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-2xl mx-auto">
              Journal your thoughts, goals, and experiences. Let AI analyze patterns to predict your perfect career fit.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")} className="bg-white text-primary hover:bg-white/90 shadow-glow text-lg px-8 py-6">
                Start Your Journey
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="border-2 border-white hover:bg-white/10 text-lg px-8 py-6 text-purple-700">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Your Personal Career
              <span className="text-primary"> Intelligence Platform</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Combining journaling, emotional intelligence, and AI to guide your professional journey
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="p-6 shadow-medium hover:shadow-glow transition-all duration-300 border-2">
              <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI Journal Analysis</h3>
              <p className="text-muted-foreground">
                Our AI analyzes your entries to extract emotions, skills, and interests automatically.
              </p>
            </Card>

            <Card className="p-6 shadow-medium hover:shadow-glow transition-all duration-300 border-2">
              <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Career Predictions</h3>
              <p className="text-muted-foreground">
                Discover your top 3 career paths with confidence scores based on your unique patterns.
              </p>
            </Card>

            <Card className="p-6 shadow-medium hover:shadow-glow transition-all duration-300 border-2">
              <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mb-4">
                <LineChart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Mood & Growth Tracking</h3>
              <p className="text-muted-foreground">
                Visualize your emotional journey and productivity trends over time.
              </p>
            </Card>

            <Card className="p-6 shadow-medium hover:shadow-glow transition-all duration-300 border-2">
              <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI Mentor Chat</h3>
              <p className="text-muted-foreground">
                Get instant guidance, motivation, and career advice from your AI mentor.
              </p>
            </Card>

            <Card className="p-6 shadow-medium hover:shadow-glow transition-all duration-300 border-2">
              <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Skill Gap Analysis</h3>
              <p className="text-muted-foreground">
                Identify skills to develop and get personalized learning recommendations.
              </p>
            </Card>

            <Card className="p-6 shadow-medium hover:shadow-glow transition-all duration-300 border-2">
              <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Continuous Learning</h3>
              <p className="text-muted-foreground">
                AI adapts to your growth, updating recommendations as you journal and evolve.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Discover Your Path?
            </h2>
            <p className="text-xl mb-8 text-white/90">
              Start your journey to meaningful work and personal growth today.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="bg-white text-primary hover:bg-white/90 shadow-glow text-lg px-8 py-6">
              Get Started Free
            </Button>
          </div>
        </div>
      </section>
    </div>;
};
export default Index;
