import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, Sparkles, Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import jsPDF from "jspdf";

const CareerPredictions = ({ userId, compact = false }: { userId: string; compact?: boolean }) => {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [careersToAvoid, setCareersToAvoid] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadCachedPredictions();

      // ✅ Load from localStorage in case DB doesn't return it
      const cachedAvoid = localStorage.getItem(`careersToAvoid_${userId}`);
      if (cachedAvoid) {
        setCareersToAvoid(JSON.parse(cachedAvoid));
      }
    }
  }, [userId]);

  const loadCachedPredictions = async () => {
    try {
      const { data, error } = await supabase
        .from("career_predictions")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("confidence_score", { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setPredictions(data);
        setLastAnalyzed(data[0].updated_at);
      }

      // ✅ Load careers to avoid from DB
      const { data: avoidData, error: avoidError } = await supabase
        .from("career_avoidances")
        .select("career_path, reason")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (avoidError) throw avoidError;

      const avoidList =
        (avoidData || []).map((a) => ({
          careerPath: a.career_path,
          reason: a.reason || "",
        })) || [];

      // ✅ Update state and cache
      if (avoidList.length > 0) {
        setCareersToAvoid(avoidList);
        localStorage.setItem(`careersToAvoid_${userId}`, JSON.stringify(avoidList));
      }
    } catch (error) {
      console.error("Error loading cached predictions:", error);
    }
  };

  const generateNewPredictions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("predict-career");
      if (error) throw error;
      
      if (data?.message) {
        toast({ title: "Not enough data", description: data.message });
        setPredictions([]);
        setCareersToAvoid([]);
        localStorage.removeItem(`careersToAvoid_${userId}`);
      } else if (data?.predictions) {
        setPredictions(data.predictions);
        const avoidList = data.avoid || [];
        setCareersToAvoid(avoidList);

        // ✅ Persist avoid list
        localStorage.setItem(`careersToAvoid_${userId}`, JSON.stringify(avoidList));

        await loadCachedPredictions();
        toast({ title: "Success!", description: "Career predictions updated" });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to generate predictions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;
    
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Career Path Report", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: "center" });
    if (lastAnalyzed) {
      yPos += 5;
      doc.text(`Last Analyzed: ${new Date(lastAnalyzed).toLocaleDateString()}`, pageWidth / 2, yPos, { align: "center" });
    }
    yPos += 15;
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Top Career Matches", 15, yPos);
    yPos += 10;
    
    predictions.forEach((pred, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}. ${pred.career_path}`, 15, yPos);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Confidence: ${pred.confidence_score}%`, 25, yPos + 5);
      yPos += 10;
      
      const reasoningLines = doc.splitTextToSize(`Reasoning: ${pred.reasoning}`, pageWidth - 35);
      doc.text(reasoningLines, 20, yPos);
      yPos += reasoningLines.length * 5 + 5;
      
      if (pred.recommended_skills && pred.recommended_skills.length > 0) {
        doc.text(`Skills to develop: ${pred.recommended_skills.join(", ")}`, 20, yPos);
        yPos += 10;
      }
      
      yPos += 5;
    });
    
    if (careersToAvoid.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      yPos += 10;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Careers to Reconsider", 15, yPos);
      yPos += 10;
      
      careersToAvoid.forEach((career, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${career.careerPath}`, 15, yPos);
        yPos += 5;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const reasonLines = doc.splitTextToSize(`Reason: ${career.reason}`, pageWidth - 35);
        doc.text(reasonLines, 20, yPos);
        yPos += reasonLines.length * 5 + 10;
      });
    }
    
    doc.save(`career-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: "Downloaded!", description: "Your career report has been downloaded as PDF" });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Analyzing your journey...</p>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="text-center py-8">
        <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-4">Keep journaling to get predictions</p>
        <Button onClick={generateNewPredictions} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate Predictions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-lg font-semibold">Top Career Matches</h3>
          {lastAnalyzed && (
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(lastAnalyzed).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {!compact && (
            <Button onClick={downloadReport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Report
            </Button>
          )}
          <Button onClick={generateNewPredictions} variant="ghost" size="sm" disabled={loading}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {predictions.map((pred, i) => (
        <Card key={pred.id || i} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-lg">{pred.career_path}</h4>
            <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded">
              {pred.confidence_score}%
            </span>
          </div>
          {!compact && (
            <>
              <p className="text-sm text-muted-foreground mt-2">{pred.reasoning}</p>
              
              {pred.recommended_skills && pred.recommended_skills.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold mb-1">Skills to develop:</p>
                  <div className="flex flex-wrap gap-1">
                    {pred.recommended_skills.map((skill: string, idx: number) => (
                      <span key={idx} className="text-xs bg-secondary px-2 py-1 rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {pred.learning_resources && pred.learning_resources.length > 0 && (
                <Collapsible className="mt-3">
                  <CollapsibleTrigger className="text-xs font-semibold text-primary hover:underline">
                    View Learning Resources →
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-1">
                    {pred.learning_resources.map((resource: any, idx: number) => (
                      <a
                        key={idx}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-muted-foreground hover:text-primary"
                      >
                        • {resource.title} ({resource.type})
                      </a>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </>
          )}
        </Card>
      ))}

      {!compact && careersToAvoid.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Careers to Reconsider
          </h3>
          {careersToAvoid.map((career, i) => (
            <Card key={i} className="p-4 mb-2 border-destructive/30 bg-destructive/5">
              <h4 className="font-bold text-sm mb-1 text-destructive">{career.careerPath}</h4>
              <p className="text-xs text-muted-foreground">{career.reason}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CareerPredictions;
