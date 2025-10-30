import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/outaflow-logo.png";

const Index = () => {
  const [email, setEmail] = useState("");
  const [showTypewriter, setShowTypewriter] = useState(false);
  const [showSecondText, setShowSecondText] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer1 = setTimeout(() => setShowTypewriter(true), 2000);
    const timer2 = setTimeout(() => setShowSecondText(true), 5500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email");
      return;
    }
    toast.success("You're on the list. Welcome to the future.");
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Cursor glow effect */}
      {mounted && (
        <div 
          className="cursor-glow"
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
          }}
        />
      )}

      {/* Subtle smoke/shadow background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-muted/5 rounded-full blur-3xl -top-48 -left-48 animate-smoke" />
        <div className="absolute w-96 h-96 bg-muted/5 rounded-full blur-3xl top-1/2 right-0 animate-smoke" style={{ animationDelay: "2s" }} />
        <div className="absolute w-96 h-96 bg-muted/5 rounded-full blur-3xl bottom-0 left-1/3 animate-smoke" style={{ animationDelay: "4s" }} />
      </div>

      {/* Main content */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Logo with fade and pulse */}
        <div className="mb-16 animate-fade-in-slow">
          <img 
            src={logo} 
            alt="Outaflow" 
            className="h-32 w-auto animate-pulse-glow animate-glitch" 
            style={{ animationDelay: "3s", filter: "brightness(1.1)" }}
          />
        </div>

        {/* Typewriter text */}
        <div className="text-center mb-20 space-y-6">
          {showTypewriter && (
            <div className="overflow-hidden border-r-2 border-foreground animate-typewriter inline-block">
              <h1 className="text-4xl md:text-6xl font-light tracking-wider whitespace-nowrap pr-2">
                Something clean is coming
              </h1>
            </div>
          )}
          
          {showSecondText && (
            <p className="text-xl md:text-3xl font-extralight tracking-widest animate-fade-in glow">
              Be the first to know.
            </p>
          )}
        </div>

        {/* Email capture section */}
        {showSecondText && (
          <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 bg-transparent border-2 border-foreground text-foreground placeholder:text-muted-foreground text-center text-lg tracking-wider glow-input focus:border-foreground focus:ring-0 focus:ring-offset-0"
              />
              <Button
                type="submit"
                className="w-full h-14 bg-foreground text-background hover:bg-background hover:text-foreground border-2 border-foreground transition-all duration-300 text-lg tracking-widest font-light"
              >
                NOTIFY ME
              </Button>
            </form>
            
            <p className="text-center text-xs tracking-widest mt-6 text-muted-foreground uppercase">
              Early access. Premium only.
            </p>
          </div>
        )}

        {/* Instagram link */}
        {showSecondText && (
          <div className="absolute bottom-8 animate-fade-in" style={{ animationDelay: "1s" }}>
            <a 
              href="https://instagram.com/outaflow0" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm tracking-widest hover:glow transition-all duration-300 uppercase"
            >
              @outaflow0
            </a>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
