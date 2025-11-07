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
import soronaImg from "@/assets/sorona-quickdry.png";
import earthtoneImg from "@/assets/earthtone-heavyweight.png";
import oversizedImg from "@/assets/oversized-stitched.png";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const MainPage = () => {
  const [email, setEmail] = useState("");
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSizes, setSelectedSizes] = useState<{ [key: string]: number }>({});
  const [fabricOpen, setFabricOpen] = useState<{ [key: string]: boolean }>({});
  const [visibleSections, setVisibleSections] = useState<{ [key: string]: boolean }>({ 
    hero: true,
    product1: true,
    product2: true,
    product3: true,
    outro: true
  });
  const [isIdle, setIsIdle] = useState(false);
  const [imageHover, setImageHover] = useState<string | null>(null);
  const addItem = useCartStore(state => state.addItem);
  
  const heroRef = useRef<HTMLDivElement>(null);
  const product1Ref = useRef<HTMLDivElement>(null);
  const product2Ref = useRef<HTMLDivElement>(null);
  const product3Ref = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchProducts();

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
    const sections = [heroRef, product1Ref, product2Ref, product3Ref, outroRef];
    sections.forEach(ref => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => {
      sections.forEach(ref => {
        if (ref.current) {
          observer.unobserve(ref.current);
        }
      });
    };
  }, []);

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
      setIsIdle(false);
    };
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setIsIdle(false);
    };
    
    let idleTimer: NodeJS.Timeout;
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setIsIdle(true), 10000);
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", resetIdleTimer);
    window.addEventListener("scroll", resetIdleTimer);
    resetIdleTimer();
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", resetIdleTimer);
      window.removeEventListener("scroll", resetIdleTimer);
      clearTimeout(idleTimer);
    };
  }, []);

  const handleAddToCart = (product: ShopifyProduct) => {
    const variantIndex = selectedSizes[product.node.id] || 0;
    const variant = product.node.variants.edges[variantIndex].node;
    
    const cartItem = {
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success("Added to cart", {
      style: { background: "black", color: "white", border: "1px solid white" }
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

  const getSpotlightY = (ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) return 0;
    const rect = ref.current.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    return Math.max(0, Math.min(100, ((window.innerHeight / 2 - center) / window.innerHeight) * 100 + 50));
  };

  return (
    <div className="bg-background text-foreground relative">
      {/* Film grain overlay */}
      <div className="film-grain" />
      
      {/* Cursor glow effect */}
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
            background: `radial-gradient(circle at 50% ${getSpotlightY(heroRef)}%, rgba(255,255,255,0.08) 0%, transparent 60%)`,
            transform: `translateY(${scrollY * -0.15}px)`
          }}
        />
        {isIdle && <div className="idle-sweep" />}
        
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

      {/* Section 2: Product 1 - Sorona Quick Dry */}
      {products[0] && (
        <section 
          id="product1"
          ref={product1Ref}
          className="min-h-screen flex items-center justify-center relative overflow-hidden py-20"
        >
          <div 
            className="absolute inset-0 pointer-events-none parallax-bg"
            style={{
              background: `radial-gradient(circle at 50% ${getSpotlightY(product1Ref)}%, rgba(255,255,255,0.12) 0%, transparent 70%)`,
              transform: `translateY(${scrollY * -0.12}px)`
            }}
          />
          {isIdle && <div className="idle-sweep" />}
          
          <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            <div 
              className="relative overflow-hidden"
              onMouseEnter={() => setImageHover('product1')}
              onMouseLeave={() => setImageHover(null)}
            >
              <div className="spotlight-sweep" style={{ animationDelay: '0s' }} />
              <div className="spotlight-diagonal" style={{ animationDelay: '6s' }} />
              <Link to={`/product/${products[0].node.handle}`}>
                <img 
                  src={products[0].node.images.edges[0]?.node.url || soronaImg}
                  alt={products[0].node.title}
                  className={`w-full h-auto transition-all duration-1000 ease-out ${
                    visibleSections.product1 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  }`}
                  style={{
                    filter: imageHover === 'product1' ? 'brightness(1.12)' : 'brightness(1)',
                    transition: 'filter 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              </Link>
            </div>
            
            <div className="space-y-8">
              <h3 className={`text-4xl md:text-5xl font-light tracking-wider uppercase text-reveal transition-all duration-1000 ease-out delay-200 ${
                visibleSections.product1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}>
                {products[0].node.title}
              </h3>
              <p className={`text-lg text-muted-foreground leading-relaxed transition-all duration-1000 ease-out delay-400 ${
                visibleSections.product1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}>
                {products[0].node.description}
              </p>

              <div className={`transition-all duration-1000 ease-out delay-500 ${
                visibleSections.product1 ? 'opacity-100' : 'opacity-0'
              }`}>
              <Collapsible
                open={fabricOpen[products[0].node.id]} 
                onOpenChange={() => setFabricOpen(prev => ({ ...prev, [products[0].node.id]: !prev[products[0].node.id] }))}
              >
                <CollapsibleTrigger className="flex items-center gap-2 text-sm tracking-widest uppercase hover:text-accent transition-colors">
                  Fabric Details
                  <ChevronDown className={`h-4 w-4 transition-transform ${fabricOpen[products[0].node.id] ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-2 text-sm text-muted-foreground border-l-2 border-muted pl-4">
                  <p>• Material: 73.31% cotton, 26.69% Sorona</p>
                  <p>• Fabric Weight: 240 gsm (7.1 oz)</p>
                  <p>• Thickness: Moderate</p>
                  <p>• Breathability: High</p>
                </CollapsibleContent>
              </Collapsible>

              </div>

              <div className={`space-y-4 transition-all duration-1000 ease-out delay-700 ${
                visibleSections.product1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}>
                <p className="text-3xl font-light tracking-wider">
                  ${parseFloat(products[0].node.priceRange.minVariantPrice.amount).toFixed(2)} {products[0].node.priceRange.minVariantPrice.currencyCode}
                </p>
                
                <div className="flex gap-2 flex-wrap">
                  {products[0].node.variants.edges.map((variant, idx) => (
                    <button
                      key={variant.node.id}
                      onClick={() => setSelectedSizes(prev => ({ ...prev, [products[0].node.id]: idx }))}
                      className={`px-6 py-2 border transition-all duration-300 ${
                        selectedSizes[products[0].node.id] === idx
                          ? 'bg-foreground text-background'
                          : 'bg-transparent text-foreground hover:bg-foreground/10'
                      }`}
                    >
                      {variant.node.title}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={() => handleAddToCart(products[0])}
                  size="lg"
                  className="w-full bg-foreground text-background hover:bg-foreground/90 transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                >
                  ADD TO CART
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Section 3: Product 2 - Earthtone Heavyweight */}
      {products[1] && (
        <section 
          id="product2"
          ref={product2Ref}
          className="min-h-screen flex items-center justify-center relative overflow-hidden py-20"
        >
          <div 
            className="absolute inset-0 pointer-events-none parallax-bg"
            style={{
              background: `radial-gradient(circle at 50% ${getSpotlightY(product2Ref)}%, rgba(255,255,255,0.12) 0%, transparent 70%)`,
              transform: `translateY(${scrollY * -0.1}px)`
            }}
          />
          {isIdle && <div className="idle-sweep" />}
          
          <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            <div className="space-y-8 order-2 lg:order-1">
              <h3 className={`text-4xl md:text-5xl font-light tracking-wider uppercase text-reveal transition-all duration-1000 ease-out delay-200 ${
                visibleSections.product2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}>
                {products[1].node.title}
              </h3>
              <p className={`text-lg text-muted-foreground leading-relaxed transition-all duration-1000 ease-out delay-400 ${
                visibleSections.product2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}>
                {products[1].node.description}
              </p>

              <div className={`transition-all duration-1000 ease-out delay-500 ${
                visibleSections.product2 ? 'opacity-100' : 'opacity-0'
              }`}>
              <Collapsible
                open={fabricOpen[products[1].node.id]} 
                onOpenChange={() => setFabricOpen(prev => ({ ...prev, [products[1].node.id]: !prev[products[1].node.id] }))}
              >
                <CollapsibleTrigger className="flex items-center gap-2 text-sm tracking-widest uppercase hover:text-accent transition-colors">
                  Fabric Details
                  <ChevronDown className={`h-4 w-4 transition-transform ${fabricOpen[products[1].node.id] ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-2 text-sm text-muted-foreground border-l-2 border-muted pl-4">
                  <p>• 100% Premium Cotton</p>
                  <p>• Heavyweight Construction</p>
                  <p>• Earthtone Dyed</p>
                  <p>• Durable & Long-lasting</p>
                </CollapsibleContent>
              </Collapsible>

              </div>

              <div className={`space-y-4 transition-all duration-1000 ease-out delay-700 ${
                visibleSections.product2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}>
                <p className="text-3xl font-light tracking-wider">
                  ${parseFloat(products[1].node.priceRange.minVariantPrice.amount).toFixed(2)} {products[1].node.priceRange.minVariantPrice.currencyCode}
                </p>
                
                <div className="flex gap-2 flex-wrap">
                  {products[1].node.variants.edges.map((variant, idx) => (
                    <button
                      key={variant.node.id}
                      onClick={() => setSelectedSizes(prev => ({ ...prev, [products[1].node.id]: idx }))}
                      className={`px-6 py-2 border transition-all duration-300 ${
                        selectedSizes[products[1].node.id] === idx
                          ? 'bg-foreground text-background'
                          : 'bg-transparent text-foreground hover:bg-foreground/10'
                      }`}
                    >
                      {variant.node.title}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={() => handleAddToCart(products[1])}
                  size="lg"
                  className="w-full bg-foreground text-background hover:bg-foreground/90 transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                >
                  ADD TO CART
                </Button>
              </div>
            </div>

            <div 
              className="relative order-1 lg:order-2 overflow-hidden"
              onMouseEnter={() => setImageHover('product2')}
              onMouseLeave={() => setImageHover(null)}
            >
              <div className="spotlight-vertical" style={{ animationDelay: '4s' }} />
              <div className="spotlight-diagonal" style={{ animationDelay: '10s' }} />
              <Link to={`/product/${products[1].node.handle}`}>
                <img 
                  src={products[1].node.images.edges[0]?.node.url || earthtoneImg}
                  alt={products[1].node.title}
                  className={`w-full h-auto transition-all duration-1000 ease-out ${
                    visibleSections.product2 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  }`}
                  style={{
                    filter: imageHover === 'product2' ? 'brightness(1.12)' : 'brightness(1)',
                    transition: 'filter 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Section 4: Product 3 - Oversized Stitched */}
      {products[2] && (
        <section 
          id="product3"
          ref={product3Ref}
          className="min-h-screen flex items-center justify-center relative overflow-hidden py-20"
        >
          <div 
            className="absolute inset-0 pointer-events-none parallax-bg"
            style={{
              background: `radial-gradient(circle at 50% ${getSpotlightY(product3Ref)}%, rgba(255,255,255,0.15) 0%, transparent 60%)`,
              transform: `translateY(${scrollY * -0.08}px)`
            }}
          />
          {isIdle && <div className="idle-sweep" />}
          
          <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            <div 
              className="relative overflow-hidden"
              onMouseEnter={() => setImageHover('product3')}
              onMouseLeave={() => setImageHover(null)}
            >
              <div className="spotlight-sweep" style={{ animationDelay: '8s' }} />
              <div className="spotlight-diagonal" style={{ animationDelay: '14s' }} />
              <Link to={`/product/${products[2].node.handle}`}>
                <img 
                  src={products[2].node.images.edges[0]?.node.url || oversizedImg}
                  alt={products[2].node.title}
                  className={`w-full h-auto transition-all duration-1000 ease-out ${
                    visibleSections.product3 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  }`}
                  style={{
                    filter: imageHover === 'product3' ? 'brightness(1.12)' : 'brightness(1)',
                    transition: 'filter 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              </Link>
            </div>
            
            <div className="space-y-8">
              <h3 className={`text-4xl md:text-5xl font-light tracking-wider uppercase text-reveal transition-all duration-1000 ease-out delay-200 ${
                visibleSections.product3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}>
                {products[2].node.title}
              </h3>
              <p className={`text-lg text-muted-foreground leading-relaxed transition-all duration-1000 ease-out delay-400 ${
                visibleSections.product3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}>
                Engineered for those who move with purpose.
              </p>
              <p className={`text-muted-foreground leading-relaxed transition-all duration-1000 ease-out delay-500 ${
                visibleSections.product3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}>
                {products[2].node.description}
              </p>

              <div className={`transition-all duration-1000 ease-out delay-600 ${
                visibleSections.product3 ? 'opacity-100' : 'opacity-0'
              }`}>
              <Collapsible
                open={fabricOpen[products[2].node.id]} 
                onOpenChange={() => setFabricOpen(prev => ({ ...prev, [products[2].node.id]: !prev[products[2].node.id] }))}
              >
                <CollapsibleTrigger className="flex items-center gap-2 text-sm tracking-widest uppercase hover:text-accent transition-colors">
                  Fabric Details
                  <ChevronDown className={`h-4 w-4 transition-transform ${fabricOpen[products[2].node.id] ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-2 text-sm text-muted-foreground border-l-2 border-muted pl-4">
                  <p>• Oversized Fit</p>
                  <p>• Premium Stitching Detail</p>
                  <p>• High-Quality Cotton Blend</p>
                  <p>• Statement Design</p>
                </CollapsibleContent>
              </Collapsible>

              </div>

              <div className={`space-y-4 transition-all duration-1000 ease-out delay-800 ${
                visibleSections.product3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}>
                <p className="text-3xl font-light tracking-wider">
                  ${parseFloat(products[2].node.priceRange.minVariantPrice.amount).toFixed(2)} {products[2].node.priceRange.minVariantPrice.currencyCode}
                </p>
                
                <div className="flex gap-2 flex-wrap">
                  {products[2].node.variants.edges.map((variant, idx) => (
                    <button
                      key={variant.node.id}
                      onClick={() => setSelectedSizes(prev => ({ ...prev, [products[2].node.id]: idx }))}
                      className={`px-6 py-2 border transition-all duration-300 ${
                        selectedSizes[products[2].node.id] === idx
                          ? 'bg-foreground text-background'
                          : 'bg-transparent text-foreground hover:bg-foreground/10'
                      }`}
                    >
                      {variant.node.title}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={() => handleAddToCart(products[2])}
                  size="lg"
                  className="w-full bg-foreground text-background hover:bg-foreground/90 transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                >
                  ADD TO CART
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Section 5: Brand Outro */}
      <section 
        id="outro"
        ref={outroRef}
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          {visibleSections.outro && <div className="footer-beam" />}
        </div>
        {isIdle && <div className="idle-sweep" />}
        
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