import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/outaflow-logo.png";

interface PasswordProtectProps {
  children: React.ReactNode;
}

const PasswordProtect = ({ children }: PasswordProtectProps) => {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("outaflow_auth");
    if (auth === "authenticated") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === "tsivis2004!") {
      localStorage.setItem("outaflow_auth", "authenticated");
      setIsAuthenticated(true);
      toast.success("Access granted");
    } else {
      toast.error("Invalid password");
      setPassword("");
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="relative z-10 text-center space-y-12 px-4 max-w-md animate-fade-in">
        <img 
          src={logo} 
          alt="OUTAFLOW" 
          className="h-40 w-auto mx-auto breathing" 
        />
        
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-light tracking-[0.3em] glow">
            ENTER PASSWORD
          </h1>
          <p className="text-lg tracking-widest text-muted-foreground">
            Access Required
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          <Input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="w-full h-14 bg-transparent border-2 border-foreground text-foreground placeholder:text-muted-foreground text-center text-base tracking-wider glow-input"
            autoFocus
          />
          <Button 
            type="submit"
            size="lg"
            className="w-full bg-foreground text-background hover:bg-background hover:text-foreground border-2 border-foreground transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
          >
            ENTER
          </Button>
        </form>
      </div>
    </div>
  );
};

export default PasswordProtect;
