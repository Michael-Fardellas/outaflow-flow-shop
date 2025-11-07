import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";
import logo from "@/assets/outaflow-logo.png";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-md border-b border-border/20">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/mainpage" className="flex items-center gap-2 logo-hover relative">
          <img src={logo} alt="Outaflow" className="h-8 w-auto" />
          <div className="logo-reveal">Precision in Motion — Premium Minimalist Apparel</div>
        </Link>
        
        <nav className="flex items-center gap-6">
          <a 
            href="https://instagram.com/outaflow0" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors glow"
          >
            <Instagram className="h-5 w-5" />
          </a>
          
        </nav>
      </div>
    </header>
  );
};
