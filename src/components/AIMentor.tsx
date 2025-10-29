import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bot, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Message = { role: "user" | "assistant"; content: string };

const AIMentor = ({ userName }: { userName?: string }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "Please sign in to use AI mentor", variant: "destructive" });
        return;
      }

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-mentor`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          userName: userName 
        }),
      });

      if (resp.status === 429) {
        toast({ title: "Rate limit exceeded", description: "Please try again later.", variant: "destructive" });
        setMessages((prev) => prev.slice(0, -1));
        setIsLoading(false);
        return;
      }

      if (resp.status === 402) {
        toast({ title: "AI usage limit reached", description: "Please contact support.", variant: "destructive" });
        setMessages((prev) => prev.slice(0, -1));
        setIsLoading(false);
        return;
      }

      if (!resp.ok || !resp.body) {
        throw new Error("Failed to start stream");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) =>
                prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m))
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to get response from mentor.", variant: "destructive" });
      setMessages((prev) => prev.slice(0, -1));
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Bot className="w-6 h-6 text-primary" />
        AI Career Mentor
      </h2>
      <div className="flex-1 space-y-4 mb-4 overflow-y-auto max-h-[400px] min-h-[400px]">
        {messages.length === 0 && (
          <p className="text-muted-foreground text-center py-12">Ask me anything about your career journey!</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && <Bot className="w-6 h-6 text-primary flex-shrink-0 mt-1" />}
            <div
              className={`rounded-lg p-4 max-w-[80%] ${
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground ml-auto" 
                  : "bg-muted text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            </div>
            {msg.role === "user" && <User className="w-6 h-6 text-primary flex-shrink-0 mt-1" />}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2">
        <Textarea
          placeholder="Ask your mentor..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          disabled={isLoading}
          className="resize-none"
          rows={2}
        />
        <Button onClick={sendMessage} disabled={isLoading || !input.trim()} className="gradient-hero text-white">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
        </Button>
      </div>
    </Card>
  );
};

export default AIMentor;