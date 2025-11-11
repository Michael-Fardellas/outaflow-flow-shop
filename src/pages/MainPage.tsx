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
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

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
      {/* Scroll progress bar */}
      <div 
        className="scroll-progress" 
        style={{ width: `${scrollProgress}%` }}
      />
      
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
                {/* Soft vertical light beam - no solid panel */}
                <div 
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-full opacity-[0.08]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
                    filter: 'blur(60px)',
                  }}
                />
                
                {/* Floating particle accents */}
                <div 
                  className="absolute left-[15%] top-[20%] w-24 h-32 opacity-[0.04]"
                  style={{
                    background: 'radial-gradient(ellipse, rgba(255,255,255,0.5) 0%, transparent 60%)',
                    filter: 'blur(20px)',
                    animation: 'float-vertical 20s ease-in-out infinite'
                  }}
                />
                <div 
                  className="absolute right-[15%] top-[60%] w-24 h-32 opacity-[0.04]"
                  style={{
                    background: 'radial-gradient(ellipse, rgba(255,255,255,0.5) 0%, transparent 60%)',
                    filter: 'blur(20px)',
                    animation: 'float-vertical 20s ease-in-out infinite',
                    animationDelay: '-10s'
                  }}
                />
              </>
            )}
            
            {isHelmet && (
              <>
                <div className="tunnel-light" />
                <div className="smoke-band" />
              </>
            )}
            
            {isLovesGone && (
              <>
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(30, 60, 100, 0.1) 0%, transparent 70%)'
                  }}
                />
                <div className="diagonal-beam" />
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
                    boxShadow: imageHover === productId && isButterfly ? `0 0 40px rgba(255,255,255,0.4)` : undefined,
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
