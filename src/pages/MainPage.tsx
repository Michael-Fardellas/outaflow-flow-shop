import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/cartStore";
import { storefrontApiRequest, STOREFRONT_PRODUCTS_QUERY, ShopifyProduct } from "@/lib/shopify";
import { Loader2, ChevronDown } from "lucide-react";
import logo from "@/assets/outaflow-logo.png";
import { CartDrawer } from "@/components/CartDrawer";

const MainPage = () => {
  const [email, setEmail] = useState("");
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [progressBarColor, setProgressBarColor] = useState("white");
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSizes, setSelectedSizes] = useState<{ [key: string]: number }>({});
  const [visibleSections, setVisibleSections] = useState<{ [key: string]: boolean }>({});
  const [imageHover, setImageHover] = useState<string | null>(null);
  const [fabricDetailsOpen, setFabricDetailsOpen] = useState<{ [key: string]: boolean }>({});
  const [visorTrigger, setVisorTrigger] = useState<{ [key: string]: boolean }>({});
  const [floorLightActive, setFloorLightActive] = useState<{ [key: string]: boolean }>({});
  const addItem = useCartStore(state => state.addItem);
  
  const heroRef = useRef<HTMLDivElement>(null);
  const productRefs = useRef<(HTMLDivElement | null)[]>([]);
  const outroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchProducts();
  }, []);

  useEffect(() => {
    // Setup intersection observer for animations
    const observerOptions = {
      threshold: 0.15,
      rootMargin: '-10% 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleSections(prev => ({
            ...prev,
            [entry.target.id]: true
          }));
        }
      });
    }, observerOptions);

    // Observe all sections
    const sections = [
      heroRef.current,
      ...productRefs.current,
      outroRef.current
    ].filter((ref): ref is HTMLDivElement => ref !== null);
    
    sections.forEach(ref => {
      observer.observe(ref);
    });

    return () => {
      sections.forEach(ref => {
        observer.unobserve(ref);
      });
    };
  }, [products.length]);

  const fetchProducts = async () => {
    try {
      const data = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first: 10 });
      if (data.data.products.edges) {
        setProducts(data.data.products.edges);
        const initialSizes: { [key: string]: number } = {};
        data.data.products.edges.forEach((product: ShopifyProduct) => {
          initialSizes[product.node.id] = 0;
        });
        setSelectedSizes(initialSizes);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };
    const handleScroll = () => {
      setScrollY(window.scrollY);
      
      // Calculate scroll progress
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const progress = (scrollTop / (documentHeight - windowHeight)) * 100;
      setScrollProgress(progress);
      
      // Determine which section we're in and set progress bar color
      const sections = productRefs.current.filter(ref => ref !== null);
      const viewportCenter = scrollTop + windowHeight / 2;
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (section) {
          const rect = section.getBoundingClientRect();
          const sectionTop = scrollTop + rect.top;
          const sectionBottom = sectionTop + rect.height;
          
          if (viewportCenter >= sectionTop && viewportCenter < sectionBottom) {
            const handle = products[i]?.node.handle || "";
            if (handle.includes('butterfly')) {
              setProgressBarColor('white');
            } else if (handle.includes('helmet')) {
              setProgressBarColor('gray');
            } else if (handle.includes('fire') || handle.includes('love')) {
              setProgressBarColor('blue');
            }
            break;
          }
        }
      }
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [products]);

  const handleAddToCart = (product: ShopifyProduct, productId: string) => {
    const variantIndex = selectedSizes[product.node.id] || 0;
    const variant = product.node.variants.edges[variantIndex].node;
    
    // Add glow effect to product
    const productElement = document.getElementById(productId);
    if (productElement) {
      productElement.classList.add('product-glow');
      setTimeout(() => {
        productElement.classList.remove('product-glow');
      }, 600);
    }
    
    const cartItem = {
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success(`Added to Cart — ${product.node.title}`, {
      duration: 2000,
      position: "top-center",
      style: {
        background: 'rgba(0, 0, 0, 0.95)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }
    });
  };

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

      toast.success("You're on the list. Welcome to the future.");
      setEmail("");
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground relative">
      {/* Floating cart that scrolls with content */}
      <div className="sticky top-4 z-40 px-4">
        <div className="flex justify-end">
          <CartDrawer />
        </div>
      </div>
      {/* Scroll progress bar with gradient */}
      <div className="scroll-progress-container">
        <div 
          className="scroll-progress-gradient" 
          style={{ 
            width: `${scrollProgress}%`,
            background: progressBarColor === 'white' 
              ? 'rgba(255,255,255,0.95)'
              : progressBarColor === 'gray'
                ? 'rgba(140,140,140,0.95)'
                : 'rgba(70,130,200,0.95)',
            transition: 'width 0.05s cubic-bezier(0.4, 0, 0.2, 1), background 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: progressBarColor === 'white'
              ? '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.4), 0 0 60px rgba(255,255,255,0.2)'
              : progressBarColor === 'gray'
                ? '0 0 20px rgba(140,140,140,0.8), 0 0 40px rgba(140,140,140,0.4), 0 0 60px rgba(140,140,140,0.2)'
                : '0 0 20px rgba(70,130,200,0.9), 0 0 40px rgba(70,130,200,0.5), 0 0 60px rgba(70,130,200,0.3)'
          }}
        />
      </div>
      
      {mounted && (
        <div 
          className="cursor-glow" 
          style={{ 
            left: `${cursorPos.x}px`, 
            top: `${cursorPos.y}px` 
          }} 
        />
      )}

      {/* Section 1: Hero Intro */}
      <section 
        id="hero"
        ref={heroRef}
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      >
        <div 
          className="absolute inset-0 pointer-events-none parallax-bg"
          style={{
            background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 60%)`,
            transform: `translateY(${scrollY * -0.15}px)`
          }}
        />
        
        <div className="relative z-10 text-center space-y-8 px-4">
          <img 
            src={logo} 
            alt="OUTAFLOW" 
            className={`h-32 w-auto mx-auto breathing transition-all duration-1000 ease-out ${
              visibleSections.hero ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          />
          <h2 className={`text-2xl md:text-4xl font-light tracking-[0.3em] glow text-reveal transition-all duration-1200 ease-out delay-300 ${
            visibleSections.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            MINIMALISM IN MOTION.
          </h2>
        </div>
        
        <div className="absolute bottom-12 animate-bounce">
          <p className="text-xs tracking-widest uppercase text-muted-foreground">Scroll to Discover</p>
          <ChevronDown className="h-6 w-6 mx-auto mt-2 text-muted-foreground" />
        </div>
      </section>

      {/* Product Sections - Dynamically rendered */}
      {products.map((product, index) => {
        const productId = `product${index + 1}`;
        const handle = product.node.handle;
        const isButterfly = handle.includes('butterfly');
        const isHelmet = handle.includes('helmet');
        const isLovesGone = handle.includes('fire') || handle.includes('love');
        
        return (
          <section 
            key={product.node.id}
            id={productId}
            ref={(el) => {
              if (el) productRefs.current[index] = el as HTMLDivElement;
            }}
            className="min-h-screen flex items-center justify-center relative overflow-hidden py-20"
          >
            {/* Background effects per product */}
            {isButterfly && (
              <>
                {/* Enhanced white radial glow */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 70%)',
                    filter: 'blur(50px)'
                  }}
                />
                {/* Pulsing white background layer */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-50"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12) 0%, rgba(200,200,200,0.05) 50%, transparent 80%)',
                    animation: 'breathe 8s ease-in-out infinite'
                  }}
                />
                {/* Soft vertical light beam */}
                <div 
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-full opacity-[0.08]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
                    filter: 'blur(60px)',
                  }}
                />
                
                {/* Floating butterfly silhouettes */}
                <div className="absolute left-[10%] top-[15%] opacity-[0.15]">
                  <svg width="60" height="60" viewBox="0 0 120 100" fill="white" style={{ animation: 'float 12s ease-in-out infinite' }}>
                    {/* Left upper wing - thicker */}
                    <path d="M 60 50 Q 25 15, 12 35 Q 8 50, 20 55 Q 38 58, 60 50 Z" />
                    {/* Right upper wing - thicker */}
                    <path d="M 60 50 Q 95 15, 108 35 Q 112 50, 100 55 Q 82 58, 60 50 Z" />
                    {/* Left lower wing - thicker */}
                    <path d="M 60 50 Q 30 68, 22 82 Q 18 92, 32 90 Q 50 85, 60 50 Z" />
                    {/* Right lower wing - thicker */}
                    <path d="M 60 50 Q 90 68, 98 82 Q 102 92, 88 90 Q 70 85, 60 50 Z" />
                    {/* Body */}
                    <ellipse cx="60" cy="50" rx="4" ry="32" fill="white" />
                    {/* Head */}
                    <circle cx="60" cy="32" r="5" fill="white" />
                    {/* Antennae */}
                    <path d="M 60 32 Q 55 22, 52 16" stroke="white" strokeWidth="1.5" fill="none" />
                    <path d="M 60 32 Q 65 22, 68 16" stroke="white" strokeWidth="1.5" fill="none" />
                    <circle cx="52" cy="16" r="2" fill="white" />
                    <circle cx="68" cy="16" r="2" fill="white" />
                  </svg>
                </div>
                <div className="absolute right-[15%] top-[50%] opacity-[0.12]">
                  <svg width="45" height="45" viewBox="0 0 120 100" fill="white" style={{ animation: 'float 15s ease-in-out infinite', animationDelay: '-5s' }}>
                    <path d="M 60 50 Q 25 15, 12 35 Q 8 50, 20 55 Q 38 58, 60 50 Z" />
                    <path d="M 60 50 Q 95 15, 108 35 Q 112 50, 100 55 Q 82 58, 60 50 Z" />
                    <path d="M 60 50 Q 30 68, 22 82 Q 18 92, 32 90 Q 50 85, 60 50 Z" />
                    <path d="M 60 50 Q 90 68, 98 82 Q 102 92, 88 90 Q 70 85, 60 50 Z" />
                    <ellipse cx="60" cy="50" rx="4" ry="32" fill="white" />
                    <circle cx="60" cy="32" r="5" fill="white" />
                    <path d="M 60 32 Q 55 22, 52 16" stroke="white" strokeWidth="1.5" fill="none" />
                    <path d="M 60 32 Q 65 22, 68 16" stroke="white" strokeWidth="1.5" fill="none" />
                    <circle cx="52" cy="16" r="2" fill="white" />
                    <circle cx="68" cy="16" r="2" fill="white" />
                  </svg>
                </div>
                <div className="absolute left-[70%] top-[70%] opacity-[0.10]">
                  <svg width="50" height="50" viewBox="0 0 120 100" fill="white" style={{ animation: 'float 18s ease-in-out infinite', animationDelay: '-10s' }}>
                    <path d="M 60 50 Q 25 15, 12 35 Q 8 50, 20 55 Q 38 58, 60 50 Z" />
                    <path d="M 60 50 Q 95 15, 108 35 Q 112 50, 100 55 Q 82 58, 60 50 Z" />
                    <path d="M 60 50 Q 30 68, 22 82 Q 18 92, 32 90 Q 50 85, 60 50 Z" />
                    <path d="M 60 50 Q 90 68, 98 82 Q 102 92, 88 90 Q 70 85, 60 50 Z" />
                    <ellipse cx="60" cy="50" rx="4" ry="32" fill="white" />
                    <circle cx="60" cy="32" r="5" fill="white" />
                    <path d="M 60 32 Q 55 22, 52 16" stroke="white" strokeWidth="1.5" fill="none" />
                    <path d="M 60 32 Q 65 22, 68 16" stroke="white" strokeWidth="1.5" fill="none" />
                    <circle cx="52" cy="16" r="2" fill="white" />
                    <circle cx="68" cy="16" r="2" fill="white" />
                  </svg>
                </div>
              </>
            )}
            
            {isHelmet && (
              <>
                {/* Gray atmospheric glow matching helmet graphic */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(140,140,140,0.12) 0%, transparent 70%)',
                    filter: 'blur(50px)'
                  }}
                />
                {/* Cold gray layer */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-40"
                  style={{
                    background: 'linear-gradient(180deg, rgba(80,80,80,0.15) 0%, rgba(40,40,40,0.08) 50%, transparent 100%)',
                  }}
                />
                <div className="tunnel-light" />
                <div className="smoke-band" />
                
                {/* Floating flower petals */}
                <div className="absolute right-[12%] top-[20%] opacity-[0.18]">
                  <svg width="35" height="35" viewBox="0 0 100 100" fill="white" style={{ animation: 'float 14s ease-in-out infinite', filter: 'blur(0.5px)' }}>
                    <ellipse cx="50" cy="20" rx="12" ry="18" />
                    <ellipse cx="75" cy="40" rx="12" ry="18" transform="rotate(72 75 40)" />
                    <ellipse cx="65" cy="72" rx="12" ry="18" transform="rotate(144 65 72)" />
                    <ellipse cx="35" cy="72" rx="12" ry="18" transform="rotate(216 35 72)" />
                    <ellipse cx="25" cy="40" rx="12" ry="18" transform="rotate(288 25 40)" />
                    <circle cx="50" cy="50" r="10" fill="rgba(255,255,255,0.8)" />
                  </svg>
                </div>
                <div className="absolute left-[18%] top-[65%] opacity-[0.15]">
                  <svg width="30" height="30" viewBox="0 0 100 100" fill="white" style={{ animation: 'float 16s ease-in-out infinite', animationDelay: '-7s', filter: 'blur(0.5px)' }}>
                    <ellipse cx="50" cy="20" rx="12" ry="18" />
                    <ellipse cx="75" cy="40" rx="12" ry="18" transform="rotate(72 75 40)" />
                    <ellipse cx="65" cy="72" rx="12" ry="18" transform="rotate(144 65 72)" />
                    <ellipse cx="35" cy="72" rx="12" ry="18" transform="rotate(216 35 72)" />
                    <ellipse cx="25" cy="40" rx="12" ry="18" transform="rotate(288 25 40)" />
                    <circle cx="50" cy="50" r="10" fill="rgba(255,255,255,0.8)" />
                  </svg>
                </div>
                <div className="absolute right-[75%] top-[40%] opacity-[0.12]">
                  <svg width="40" height="40" viewBox="0 0 100 100" fill="white" style={{ animation: 'float 20s ease-in-out infinite', animationDelay: '-12s', filter: 'blur(0.5px)' }}>
                    <ellipse cx="50" cy="20" rx="12" ry="18" />
                    <ellipse cx="75" cy="40" rx="12" ry="18" transform="rotate(72 75 40)" />
                    <ellipse cx="65" cy="72" rx="12" ry="18" transform="rotate(144 65 72)" />
                    <ellipse cx="35" cy="72" rx="12" ry="18" transform="rotate(216 35 72)" />
                    <ellipse cx="25" cy="40" rx="12" ry="18" transform="rotate(288 25 40)" />
                    <circle cx="50" cy="50" r="10" fill="rgba(255,255,255,0.8)" />
                  </svg>
                </div>
              </>
            )}
            
            {isLovesGone && (
              <>
                {/* Stronger blue radial glow */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(70, 130, 200, 0.18) 0%, transparent 70%)',
                    filter: 'blur(40px)'
                  }}
                />
                {/* Pulsing blue background layer */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-60"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(70, 130, 200, 0.15) 0%, rgba(30, 60, 100, 0.08) 50%, transparent 80%)',
                    animation: 'blue-glow-pulse 10s ease-in-out infinite'
                  }}
                />
                <div className="diagonal-beam" />
                {/* Gradient fade to black at bottom */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-[40vh] pointer-events-none"
                  style={{
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,1) 100%)'
                  }}
                />
                
                {/* Broken heart elements */}
                <div className="absolute left-[15%] top-[25%] opacity-[0.20]">
                  <svg width="50" height="50" viewBox="0 0 60 60" fill="rgb(70,130,200)" style={{ animation: 'float 13s ease-in-out infinite' }}>
                    <path d="M30,50 L18,35 Q10,25 15,15 Q20,10 25,15 L30,20" />
                    <path d="M30,20 L35,15 Q40,10 45,15 Q50,25 42,35 L30,50" style={{ transform: 'translateX(3px)', opacity: 0.7 }} />
                  </svg>
                </div>
                <div className="absolute right-[10%] top-[60%] opacity-[0.18]">
                  <svg width="40" height="40" viewBox="0 0 60 60" fill="rgb(70,130,200)" style={{ animation: 'float 17s ease-in-out infinite', animationDelay: '-8s' }}>
                    <path d="M30,50 L18,35 Q10,25 15,15 Q20,10 25,15 L30,20" />
                    <path d="M30,20 L35,15 Q40,10 45,15 Q50,25 42,35 L30,50" style={{ transform: 'translateX(3px)', opacity: 0.7 }} />
                  </svg>
                </div>
                <div className="absolute left-[75%] top-[40%] opacity-[0.15]">
                  <svg width="35" height="35" viewBox="0 0 60 60" fill="rgb(70,130,200)" style={{ animation: 'float 20s ease-in-out infinite', animationDelay: '-15s' }}>
                    <path d="M30,50 L18,35 Q10,25 15,15 Q20,10 25,15 L30,20" />
                    <path d="M30,20 L35,15 Q40,10 45,15 Q50,25 42,35 L30,50" style={{ transform: 'translateX(3px)', opacity: 0.7 }} />
                  </svg>
                </div>
              </>
            )}
            
            <div className={`container mx-auto px-4 ${isHelmet ? 'max-w-6xl' : 'max-w-4xl'} relative z-10`}>
              <div className={isHelmet ? 'grid grid-cols-1 lg:grid-cols-2 gap-12 items-start' : ''}>
                {/* Image Section */}
                <div 
                  className={`relative overflow-hidden product-hover-container ambient-shadow ${!isHelmet ? 'mb-8' : 'lg:row-span-2 lg:mt-20'}`}
                  id={`product-${index + 1}`}
                  onMouseEnter={() => {
                    setImageHover(productId);
                    if (isHelmet) {
                      setVisorTrigger(prev => ({ ...prev, [productId]: true }));
                      setTimeout(() => setVisorTrigger(prev => ({ ...prev, [productId]: false })), 800);
                    }
                    if (isLovesGone) {
                      setFloorLightActive(prev => ({ ...prev, [productId]: true }));
                    }
                  }}
                  onMouseLeave={() => {
                    setImageHover(null);
                    if (isLovesGone) {
                      setFloorLightActive(prev => ({ ...prev, [productId]: false }));
                    }
                  }}
                  style={{
                    boxShadow: imageHover === productId && isButterfly 
                      ? `0 0 60px rgba(255,255,255,0.5), 0 20px 80px rgba(255,255,255,0.3)` 
                      : isHelmet
                        ? `0 20px 60px rgba(140,140,140,0.4), 0 0 80px rgba(100,100,100,0.25)`
                      : isLovesGone 
                        ? `0 20px 60px rgba(70, 130, 200, 0.5), 0 0 80px rgba(70, 130, 200, 0.3)`
                        : undefined,
                    transition: 'box-shadow 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  {isButterfly && (
                    <>
                      <div className="vertical-spotlight" />
                      <div className="floating-particle" style={{ top: '20%', right: '25%' }} />
                    </>
                  )}
                  
                  {isHelmet && (
                    <div className={`visor-sweep ${visorTrigger[productId] ? 'trigger' : ''}`} />
                  )}
                  
                  {isLovesGone && (
                    <>
                      <div className={`floor-light ${floorLightActive[productId] ? 'active' : ''}`} />
                      <div style={{ position: 'absolute', top: '15%', right: '30%' }}>
                        <div className="sparkle-dot" />
                        <div className="sparkle-dot" style={{ marginLeft: '8px' }} />
                        <div className="sparkle-dot" style={{ marginLeft: '16px' }} />
                      </div>
                    </>
                  )}
                  
                  <Link to={`/product/${product.node.handle}`}>
                    <img 
                      src={product.node.images.edges[0]?.node.url}
                      alt={product.node.title}
                      className={`w-full h-auto product-image-zoom transition-all duration-1000 ease-out ${
                        visibleSections[productId] ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                      }`}
                      style={{
                        filter: imageHover === productId ? 'brightness(1.12)' : 'brightness(1)',
                        transition: 'filter 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  </Link>
                </div>
                
                {/* Content Section */}
                <div className="space-y-8">
                  {isHelmet && (
                    <p className="text-xs tracking-widest text-muted-foreground uppercase">
                      Performance Cotton 280 gsm
                    </p>
                  )}
                  
                  <div>
                    <h3 className={`text-4xl md:text-5xl font-light tracking-wider uppercase text-reveal transition-all duration-1000 ease-out delay-200 ${
                      visibleSections[productId] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                    } ${isLovesGone ? 'tracking-widest' : ''}`}>
                      {product.node.title}
                    </h3>
                    <p className={`text-sm tracking-widest text-muted-foreground mt-2 transition-all duration-1000 ease-out delay-300 ${
                      visibleSections[productId] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    } ${isButterfly ? 'italic font-serif' : ''} ${isLovesGone ? 'text-nightclub-blue' : ''}`}>
                      {isButterfly && "Rebellion in Bloom."}
                      {isHelmet && "Built for Momentum."}
                      {isLovesGone && "Love fades. Style stays."}
                    </p>
                  </div>
                  
                  {isHelmet && (
                    <div className="flex gap-2 flex-wrap">
                      <span className="pill-badge">Heavyweight</span>
                      <span className="pill-badge">Fit Holds Shape</span>
                      <span className="pill-badge">Day to Night</span>
                    </div>
                  )}
                  
                  {isLovesGone && (
                    <p className="text-xs tracking-wider text-nightclub-blue">
                      Sorona blend. Breathable. Fast dry.
                    </p>
                  )}
                  
                  <p className={`text-lg text-muted-foreground leading-relaxed transition-all duration-1000 ease-out delay-400 ${
                    visibleSections[productId] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                  }`}>
                    {product.node.description}
                  </p>

                  <div className={`space-y-4 transition-all duration-1000 ease-out delay-700 ${
                    visibleSections[productId] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                  }`}>
                    <p className="text-3xl font-light tracking-wider">
                      ${parseFloat(product.node.priceRange.minVariantPrice.amount).toFixed(2)} {product.node.priceRange.minVariantPrice.currencyCode}
                    </p>
                    
                    <div className="flex gap-2 flex-wrap">
                      {product.node.variants.edges.map((variant, idx) => (
                        <button
                          key={variant.node.id}
                          onClick={() => setSelectedSizes(prev => ({ ...prev, [product.node.id]: idx }))}
                          className={`size-button px-6 py-2 border transition-all duration-300 ${
                            selectedSizes[product.node.id] === idx
                              ? isLovesGone ? 'bg-nightclub-blue text-white border-nightclub-blue' : 'bg-foreground text-background'
                              : 'bg-transparent text-foreground hover:bg-foreground/10'
                          } ${isLovesGone ? 'border-nightclub-blue' : ''}`}
                        >
                          {variant.node.title}
                        </button>
                      ))}
                    </div>

                    <Button
                      onClick={() => handleAddToCart(product, `product-${index + 1}`)}
                      size="lg"
                      className={`w-full transition-all duration-500 ${
                        isLovesGone 
                          ? 'bg-foreground text-background hover:bg-nightclub-blue hover:text-white border-nightclub-blue hover:shadow-[0_0_30px_rgba(70,130,200,0.4)]'
                          : 'bg-foreground text-background hover:bg-foreground/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]'
                      }`}
                    >
                      ADD TO CART
                    </Button>
                    
                    <button
                      onClick={() => setFabricDetailsOpen(prev => ({ ...prev, [productId]: !prev[productId] }))}
                      className="w-full text-sm tracking-wider text-muted-foreground hover:text-foreground transition-colors uppercase"
                    >
                      {fabricDetailsOpen[productId] ? '− Close' : '+ Fabric Details'}
                    </button>
                    
                    {fabricDetailsOpen[productId] && (
                      <div className={`
                        ${isButterfly ? 'fabric-panel-right bg-white/90 text-black' : ''}
                        ${isHelmet ? 'fabric-panel-bottom bg-background/95 border border-white/20' : ''}
                        ${isLovesGone ? 'fabric-panel-left bg-nightclub-blue/10 text-white' : ''}
                        p-6 rounded backdrop-blur-sm space-y-3 text-sm
                      `}>
                        <h4 className="font-semibold tracking-wider uppercase">Material Details</h4>
                        <p className="leading-relaxed">{product.node.description}</p>
                        {isHelmet && (
                          <p className="text-xs tracking-wider text-muted-foreground">
                            Structure level: High
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* Section 5: Brand Outro */}
      <section 
        id="outro"
        ref={outroRef}
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          {visibleSections.outro && <div className="footer-beam" />}
        </div>
        
        <div className="relative z-10 text-center space-y-12 px-4 max-w-md">
          <h2 className={`text-3xl md:text-5xl font-light tracking-[0.3em] glow breathing transition-all duration-1200 ease-out ${
            visibleSections.outro ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}>
            OUTAFLOW
          </h2>
          <p className={`text-lg tracking-widest text-muted-foreground transition-all duration-1000 ease-out delay-300 ${
            visibleSections.outro ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            Designed for Movement.
          </p>
          
          <form onSubmit={handleSubmit} className={`space-y-6 w-full transition-all duration-1000 ease-out delay-500 ${
            visibleSections.outro ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}>
            <Input 
              type="email" 
              placeholder="Get notified on next drops" 
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
            className={`inline-block text-sm tracking-widest hover:glow transition-all duration-1000 ease-out delay-700 uppercase ${
              visibleSections.outro ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            @outaflow0
          </a>
        </div>
      </section>
    </div>
  );
};

export default MainPage;
