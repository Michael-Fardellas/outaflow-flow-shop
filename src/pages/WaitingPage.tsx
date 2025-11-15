import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/outaflow-logo.png";

const WaitingPage = () => {
  const [email, setEmail] = useState("");
  const [displayText, setDisplayText] = useState("");
  const fullText = "MADE WITH PURPOSE.";
  
  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error("Please enter a valid email");
      return;
    }

    try {
      const { error } = await supabase
        .from('email_signups')
        .insert([{ email: normalizedEmail }]);

      if (error) {
        if (error.code === '23505') {
          toast.error("This email is already registered");
        } else {
          toast.error("Something went wrong. Please try again.");
        }
        return;
      }

      // Call edge function to send emails
      try {
        await supabase.functions.invoke('send-signup-notification', {
          body: { email: normalizedEmail }
        });
      } catch (emailError) {
        console.error('Error sending notification emails:', emailError);
        // Don't show error to user since signup was successful
      }

      toast.success("You're on the list. Welcome to the future.");
      setEmail("");
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="relative z-10 text-center space-y-12 px-4 max-w-md animate-fade-in">
        <img 
          src={logo} 
          alt="OUTAFLOW" 
          className="h-40 w-auto mx-auto breathing" 
        />
        
        <div className="space-y-6">
          <h1 className="text-4xl md:text-6xl font-light tracking-[0.3em] glow">
            COMING SOON
          </h1>
          <p className="text-lg tracking-widest text-muted-foreground min-h-[2rem]">
            {displayText}
            <span className="animate-pulse">|</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          <Input 
            type="email" 
            placeholder="Get notified on launch" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full h-14 bg-transparent border-2 border-foreground text-foreground placeholder:text-muted-foreground text-center text-base tracking-wider glow-input"
          />
          <Button 
            type="submit"
            size="lg"
            className="w-full bg-foreground text-background hover:bg-background hover:text-foreground border-2 border-foreground transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
          >
            NOTIFY ME
          </Button>
        </form>

        <a 
          href="https://instagram.com/outaflow0" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-block text-sm tracking-widest hover:glow transition-all duration-300 uppercase"
        >
          @outaflow0
        </a>
      </div>
      
      <div className="absolute bottom-6 right-6 text-[10px] tracking-[0.2em] uppercase">
        <a 
          href="https://instagram.com/mixalis_fardellas" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-muted-foreground/30 hover:text-muted-foreground/70 transition-all duration-500 group"
        >
          <span className="w-8 h-[1px] bg-muted-foreground/20 group-hover:bg-muted-foreground/50 transition-all duration-500"></span>
          <span className="font-light">Made by @mixalis_fardellas</span>
        </a>
      </div>
    </div>
  );
};

export default WaitingPage;
