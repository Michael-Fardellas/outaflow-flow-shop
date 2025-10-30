import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/outaflow-logo.png";
const Index = () => {
  const [email, setEmail] = useState("");
  const [typewriterText, setTypewriterText] = useState("");
  const [showSecondText, setShowSecondText] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [cursorPos, setCursorPos] = useState({
    x: 0,
    y: 0
  });
  const [mounted, setMounted] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);
  const RATE_LIMIT_COOLDOWN = 60000; // 60 seconds
  const fullText = "Something clean is coming";
  useEffect(() => {
    setMounted(true);

    // Start typewriter after logo appears
    const startTimer = setTimeout(() => {
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex <= fullText.length) {
          setTypewriterText(fullText.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setTimeout(() => {
            setShowCursor(false);
            setTimeout(() => {
              setShowSecondText(true);
              setTimeout(() => {
                setShowForm(true);
              }, 1000);
            }, 800);
          }, 500);
        }
      }, 100); // 100ms per character

      return () => clearInterval(typingInterval);
    }, 2000);
    return () => clearTimeout(startTimer);
  }, []);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({
        x: e.clientX,
        y: e.clientY
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitTime;
    if (timeSinceLastSubmit < RATE_LIMIT_COOLDOWN) {
      const remainingSeconds = Math.ceil((RATE_LIMIT_COOLDOWN - timeSinceLastSubmit) / 1000);
      toast.error(`Please wait ${remainingSeconds} seconds before submitting again`);
      return;
    }
    
    // Input validation
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    
    // Trim and lowercase email
    const normalizedEmail = email.trim().toLowerCase();
    
    // Email length validation
    if (normalizedEmail.length > 255) {
      toast.error("Email address is too long");
      return;
    }
    
    // Email format validation
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

      toast.success("You're on the list. Welcome to the future.");
      setEmail("");
      setLastSubmitTime(now);
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    }
  };
  return <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Cursor glow effect */}
      {mounted && <div className="cursor-glow" style={{
      left: `${cursorPos.x}px`,
      top: `${cursorPos.y}px`
    }} />}

      {/* Subtle smoke/shadow background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-muted/5 rounded-full blur-3xl -top-48 -left-48 animate-smoke" />
        <div className="absolute w-96 h-96 bg-muted/5 rounded-full blur-3xl top-1/2 right-0 animate-smoke" style={{
        animationDelay: "2s"
      }} />
        <div className="absolute w-96 h-96 bg-muted/5 rounded-full blur-3xl bottom-0 left-1/3 animate-smoke" style={{
        animationDelay: "4s"
      }} />
      </div>

      {/* Main content */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Logo with fade and pulse */}
        <div className="mb-16 animate-fade-in-slow">
          <img src={logo} alt="Outaflow" className="h-32 w-auto animate-pulse-glow animate-glitch" style={{
          animationDelay: "3s",
          filter: "brightness(1.1)"
        }} />
        </div>

        {/* Typewriter text */}
        <div className="text-center mb-20 space-y-6 w-full max-w-4xl px-4">
          <div className="relative min-h-[80px] sm:min-h-[120px] flex items-center justify-center">
            <h1 className="text-2xl sm:text-4xl md:text-6xl font-light tracking-wider">
              {typewriterText}
              {showCursor && <span className="inline-block w-0.5 h-8 sm:h-12 md:h-16 bg-foreground ml-1 animate-blink" />}
            </h1>
          </div>
          
          {showSecondText && <p className="text-lg sm:text-xl md:text-3xl font-extralight tracking-widest animate-fade-in glow">
              Be the first to know.
            </p>}
        </div>

        {/* Email capture section */}
        {showForm && <div className="w-full max-w-md animate-fade-in">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} className="w-full h-14 bg-transparent border-2 border-foreground text-foreground placeholder:text-muted-foreground text-center text-lg tracking-wider glow-input focus:border-foreground focus:ring-0 focus:ring-offset-0" />
              <Button type="submit" className="w-full h-14 bg-foreground text-background hover:bg-background hover:text-foreground border-2 border-foreground transition-all duration-300 text-lg tracking-widest font-light">
                NOTIFY ME
              </Button>
            </form>
            
            <p className="text-center text-xs tracking-widest mt-6 text-muted-foreground uppercase">Early access</p>
          </div>}

        {/* Instagram link */}
        {showForm && <div className="absolute bottom-8 animate-fade-in">
            <a href="https://instagram.com/outaflow0" target="_blank" rel="noopener noreferrer" className="text-sm tracking-widest hover:glow transition-all duration-300 uppercase">
              @outaflow0
            </a>
          </div>}
      </main>
    </div>;
};
export default Index;