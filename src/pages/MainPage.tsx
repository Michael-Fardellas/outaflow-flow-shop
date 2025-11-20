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
  const [selectedImageView, setSelectedImageView] = useState<{ [key: string]: "front" | "back" }>({});
  const [imageTransitioning, setImageTransitioning] = useState<{ [key: string]: boolean }>({});
  const [sizeChartModalOpen, setSizeChartModalOpen] = useState(false);
  const addItem = useCartStore(state => state.addItem);
  
  const heroRef = useRef<HTMLDivElement>(null);
  const productRefs = useRef<(HTMLDivElement | null)[]>([]);
  const outroRef = useRef<HTMLDivElement>(null);

  // Material data mapping
  const materialData: { [key: string]: { composition: string; weight: string; features: string } } = {
    "love": {
      composition: "73% cotton / 27% Sorona polymer blend",
      weight: "240 gsm",
      features: "Moisture-wicking, breathable, fast-drying"
    },
    "helmet": {
      composition: "100% cotton heavyweight",
      weight: "280 gsm",
      features: "Dense knit, structured drape, high shape retention"
    },
    "butterfly": {
      composition: "100% cotton heavyweight",
      weight: "280 gsm",
      features: "Dense knit, structured drape, high shape retention"
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchProducts();
  }, []);

  useEffect(() => {
    // Keyboard shortcut: C for cart
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') {
        const cartButton = document.querySelector('[data-cart-trigger]') as HTMLButtonElement;
        if (cartButton) {
          cartButton.click();
        }
      }
      // ESC to close size chart modal
      if (e.key === 'Escape' && sizeChartModalOpen) {
        setSizeChartModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [sizeChartModalOpen]);

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

  // Load saved sizes from localStorage
  useEffect(() => {
    if (products.length > 0) {
      const savedSizes: { [key: string]: number } = {};
      products.forEach((product) => {
        const saved = localStorage.getItem(`selected-size-${product.node.handle}`);
        if (saved) {
          savedSizes[product.node.id] = parseInt(saved);
        }
      });
      if (Object.keys(savedSizes).length > 0) {
        setSelectedSizes(prev => ({ ...prev, ...savedSizes }));
      }
    }
  }, [products]);

  const fetchProducts = async () => {
    try {
      const data = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first: 10 });
      if (data.data.products.edges) {
        setProducts(data.data.products.edges);
        const initialSizes: { [key: string]: number } = {};
        const initialViews: { [key: string]: "front" | "back" } = {};
        data.data.products.edges.forEach((product: ShopifyProduct) => {
          initialSizes[product.node.id] = 0;
          initialViews[product.node.id] = "front";
        });
        setSelectedSizes(initialSizes);
        setSelectedImageView(initialViews);
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

    let ticking = false;
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const progress = (scrollTop / (documentHeight - windowHeight)) * 100;

      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setScrollY(scrollTop);
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

          ticking = false;
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial call to sync progress bar on load
    handleScroll();

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

  const handleImageToggle = (productId: string, view: "front" | "back") => {
    if (selectedImageView[productId] === view || imageTransitioning[productId]) return;
    
    setImageTransitioning(prev => ({ ...prev, [productId]: true }));
    setSelectedImageView(prev => ({ ...prev, [productId]: view }));
    
    setTimeout(() => {
      setImageTransitioning(prev => ({ ...prev, [productId]: false }));
    }, 160);
  };

  const handleSizeSelect = (productId: string, handle: string, idx: number) => {
    setSelectedSizes(prev => ({ ...prev, [productId]: idx }));
    // Save to localStorage with 24 hour expiry
    localStorage.setItem(`selected-size-${handle}`, idx.toString());
    setTimeout(() => {
      localStorage.removeItem(`selected-size-${handle}`);
    }, 24 * 60 * 60 * 1000);
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

  const getMaterialForProduct = (handle: string) => {
    if (handle.includes('love') || handle.includes('fire')) {
      return materialData.love;
    } else if (handle.includes('helmet')) {
      return materialData.helmet;
    } else if (handle.includes('butterfly')) {
      return materialData.butterfly;
    }
    return materialData.butterfly; // default
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
          <div data-cart-trigger>
            <CartDrawer />
          </div>
        </div>
      </div>

      {/* Scroll progress bar with gradient */}
      <div className="scroll-progress-container">
        <div 
          className="scroll-progress-gradient" 
          style={{ 
            transform: `scaleX(${scrollProgress / 100})`,
            transformOrigin: 'left',
            willChange: 'transform',
            background: progressBarColor === 'white' 
              ? 'rgba(255,255,255,0.95)'
              : progressBarColor === 'gray'
                ? 'rgba(140,140,140,0.95)'
                : 'rgba(70,130,200,0.95)',
            transition: 'background 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
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
            MADE WITH PURPOSE.
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
        const currentView = selectedImageView[product.node.id] || "front";
        const imageIndex = currentView === "front" ? 0 : 1;
        const material = getMaterialForProduct(handle);
        
        // Layout alternation: butterfly (left text), helmet (right text), love's gone (centered)
        const isLeftLayout = isButterfly;
        const isRightLayout = isHelmet;
        const isCenteredLayout = isLovesGone;
        
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
                {/* Soft atmospheric white glow - NO solid panels */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(255,255,255,0.12) 0%, transparent 70%)',
                    filter: 'blur(60px)'
                  }}
                />
                
                {/* Vertical spotlight sweep */}
                <div className="vertical-spotlight" />
                
                {/* Floating particles */}
                <div className="floating-particle" style={{ top: '25%', right: '30%', zIndex: 2 }} />
                <div className="floating-particle" style={{ top: '30%', right: '28%', animationDelay: '2s', zIndex: 2 }} />
                <div className="floating-particle" style={{ top: '28%', right: '32%', animationDelay: '4s', zIndex: 2 }} />
              </>
            )}
            
            {isHelmet && (
              <>
                {/* Pure black background with tunnel light */}
                <div className="tunnel-light" />
                <div className="smoke-band" />
              </>
            )}
            
            {isLovesGone && (
              <>
                {/* Deep navy radial glow */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(70, 130, 200, 0.20) 0%, rgba(30, 50, 80, 0.08) 50%, transparent 70%)',
                    filter: 'blur(40px)'
                  }}
                />
                
                {/* Pulsing blue background layer */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-70"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(70, 130, 200, 0.15) 0%, rgba(30, 60, 100, 0.08) 50%, transparent 80%)',
                    animation: 'blue-glow-pulse 10s ease-in-out infinite'
                  }}
                />
                
                {/* Diagonal blue beam */}
                <div className="diagonal-beam" />
                
                {/* Gradient fade to black at bottom */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-[40vh] pointer-events-none"
                  style={{
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,1) 100%)'
                  }}
                />
              </>
            )}
            
            <div className={`container mx-auto px-4 ${isHelmet ? 'max-w-6xl' : 'max-w-5xl'} relative z-10`}>
              <div className={`grid grid-cols-1 ${!isCenteredLayout ? 'lg:grid-cols-2' : ''} gap-12 items-center`}>
                {/* Text Section - Left for Butterfly, Right for Helmet, Center for Love's Gone */}
                {(isLeftLayout || isCenteredLayout) && (
                  <div className={`space-y-6 ${isCenteredLayout ? 'text-center mx-auto max-w-2xl order-2' : ''}`}>
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
                      <p className={`text-sm tracking-widest mt-2 transition-all duration-1000 ease-out delay-300 ${
                        visibleSections[productId] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                      } ${isButterfly ? 'italic font-serif text-muted-foreground' : ''} ${isHelmet ? 'text-muted-foreground' : ''} ${isLovesGone ? 'nightclub-blue' : ''}`}>
                        {isButterfly && "Rebellion in Bloom"}
                        {isHelmet && "Built for Momentum"}
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
                    
                    {isButterfly && (
                      <div className="flex gap-2 flex-wrap text-xs tracking-wider text-muted-foreground">
                        <span className="pill-badge">Heavyweight</span>
                        <span className="pill-badge">Structured Drape</span>
                        <span className="pill-badge">Breathable Cotton</span>
                      </div>
                    )}
                    
                    {isLovesGone && (
                      <p className="text-xs tracking-wider nightclub-blue">
                        Sorona blend • Breathable • Fast dry
                      </p>
                    )}
                    
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
                            onClick={() => handleSizeSelect(product.node.id, product.node.handle, idx)}
                            className={`size-button px-6 py-2 border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background ${
                              selectedSizes[product.node.id] === idx
                                ? isLovesGone ? 'bg-nightclub-blue text-white border-nightclub-blue' : 'bg-foreground text-background'
                                : 'bg-transparent text-foreground hover:bg-foreground/10'
                            } ${isLovesGone ? 'border-nightclub-blue focus:ring-nightclub-blue' : 'focus:ring-foreground'}`}
                            aria-label={`Select size ${variant.node.title}`}
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
                        aria-expanded={fabricDetailsOpen[productId]}
                      >
                        {fabricDetailsOpen[productId] ? '− Close' : '+ Fabric Details'}
                      </button>
                      
                      {fabricDetailsOpen[productId] && (
                        <div className={`
                          ${isButterfly ? 'fabric-panel-right bg-white/95 text-black' : ''}
                          ${isHelmet ? 'fabric-panel-bottom bg-black/95 text-white border border-white/20' : ''}
                          ${isLovesGone ? 'fabric-panel-left bg-black/90 text-white border border-nightclub-blue/30 backdrop-blur-sm' : ''}
                          p-6 rounded space-y-3 text-sm
                        `}>
                          <h4 className="font-semibold tracking-wider uppercase">Material Details</h4>
                          <p className="leading-relaxed">{material.composition}</p>
                          <p className="leading-relaxed">{material.weight}</p>
                          <p className="leading-relaxed">{material.features}</p>
                          {isHelmet && (
                            <p className="text-xs tracking-wider text-muted-foreground">
                              Structure level: High
                            </p>
                          )}
                          <div className="pt-3 mt-3 border-t border-white/20">
                            <h5 className="font-semibold tracking-wider uppercase mb-2">Size and Fit</h5>
                            <p className="text-xs leading-relaxed">The printed graphic contains a typographic size chart motif used across designs.</p>
                            <button
                              onClick={() => setSizeChartModalOpen(true)}
                              className="text-xs underline mt-2 hover:text-foreground transition-colors"
                            >
                              View Size Guide
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Image Section */}
                <div 
                  className={`relative overflow-hidden product-hover-container ambient-shadow ${
                    isHelmet ? 'lg:order-first' : ''
                  } ${isCenteredLayout ? 'order-1 max-w-lg mx-auto' : ''}`}
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
                  {/* Front/Back Toggle Tabs */}
                  <div className="flex gap-4 mb-4 justify-center">
                    <button
                      onClick={() => handleImageToggle(product.node.id, "front")}
                      className={`text-sm tracking-widest uppercase pb-2 border-b-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background ${
                        currentView === "front"
                          ? isLovesGone ? 'border-nightclub-blue nightclub-blue' : 'border-foreground text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      } ${isLovesGone ? 'focus:ring-nightclub-blue' : 'focus:ring-foreground'}`}
                      aria-pressed={currentView === "front"}
                    >
                      Front
                    </button>
                    <button
                      onClick={() => handleImageToggle(product.node.id, "back")}
                      className={`text-sm tracking-widest uppercase pb-2 border-b-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background ${
                        currentView === "back"
                          ? isLovesGone ? 'border-nightclub-blue nightclub-blue' : 'border-foreground text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      } ${isLovesGone ? 'focus:ring-nightclub-blue' : 'focus:ring-foreground'}`}
                      aria-pressed={currentView === "back"}
                    >
                      Back
                    </button>
                  </div>

                  {/* Image effects overlay */}
                  {isButterfly && currentView === "front" && (
                    <>
                      <div className="vertical-spotlight" />
                    </>
                  )}
                  
                  {isHelmet && currentView === "front" && (
                    <div className={`visor-sweep ${visorTrigger[productId] ? 'trigger' : ''}`} />
                  )}
                  
                  {isLovesGone && currentView === "front" && (
                    <>
                      <div className={`floor-light ${floorLightActive[productId] ? 'active' : ''}`} />
                      <div style={{ position: 'absolute', top: '18%', right: '32%', zIndex: 2 }}>
                        <div className="sparkle-dot" />
                        <div className="sparkle-dot" style={{ marginLeft: '8px' }} />
                      </div>
                    </>
                  )}
                  
                  {/* Gallery frame for Butterfly back view */}
                  {isButterfly && currentView === "back" && (
                    <div className="gallery-frame" />
                  )}
                  
                  {/* Progress bar for Helmet back view */}
                  {isHelmet && currentView === "back" && (
                    <div className="progress-bar" />
                  )}
                  
                  <Link to={`/product/${product.node.handle}`} className="block">
                    <img 
                      src={product.node.images.edges[imageIndex]?.node.url}
                      alt={`${product.node.title} ${currentView}`}
                      className={`w-full h-auto product-image-zoom transition-all duration-1000 ease-out ${
                        visibleSections[productId] ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                      } ${isLovesGone && currentView === "back" ? 'desaturate-pulse' : ''}`}
                      style={{
                        filter: imageHover === productId ? 'brightness(1.08)' : 'brightness(1)',
                        transition: 'filter 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  </Link>
                </div>

                {/* Text Section - Right for Helmet */}
                {isRightLayout && (
                  <div className="space-y-6">
                    <p className="text-xs tracking-widest text-muted-foreground uppercase">
                      Performance Cotton 280 gsm
                    </p>
                    
                    <div>
                      <h3 className={`text-4xl md:text-5xl font-light tracking-wider uppercase text-reveal transition-all duration-1000 ease-out delay-200 ${
                        visibleSections[productId] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                      }`}>
                        {product.node.title}
                      </h3>
                      <p className={`text-sm tracking-widest text-muted-foreground mt-2 transition-all duration-1000 ease-out delay-300 ${
                        visibleSections[productId] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                      }`}>
                        Built for Momentum
                      </p>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <span className="pill-badge">Heavyweight</span>
                      <span className="pill-badge">Fit Holds Shape</span>
                      <span className="pill-badge">Day to Night</span>
                    </div>
                    
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
                            onClick={() => handleSizeSelect(product.node.id, product.node.handle, idx)}
                            className={`size-button px-6 py-2 border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-foreground ${
                              selectedSizes[product.node.id] === idx
                                ? 'bg-foreground text-background'
                                : 'bg-transparent text-foreground hover:bg-foreground/10'
                            }`}
                            aria-label={`Select size ${variant.node.title}`}
                          >
                            {variant.node.title}
                          </button>
                        ))}
                      </div>

                      <Button
                        onClick={() => handleAddToCart(product, `product-${index + 1}`)}
                        size="lg"
                        className="w-full transition-all duration-500 bg-foreground text-background hover:bg-foreground/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                      >
                        ADD TO CART
                      </Button>
                      
                      <button
                        onClick={() => setFabricDetailsOpen(prev => ({ ...prev, [productId]: !prev[productId] }))}
                        className="w-full text-sm tracking-wider text-muted-foreground hover:text-foreground transition-colors uppercase"
                        aria-expanded={fabricDetailsOpen[productId]}
                      >
                        {fabricDetailsOpen[productId] ? '− Close' : '+ Fabric Details'}
                      </button>
                      
                      {fabricDetailsOpen[productId] && (
                        <div className="fabric-panel-bottom bg-black/95 text-white border border-white/20 p-6 rounded space-y-3 text-sm">
                          <h4 className="font-semibold tracking-wider uppercase">Material Details</h4>
                          <p className="leading-relaxed">{material.composition}</p>
                          <p className="leading-relaxed">{material.weight}</p>
                          <p className="leading-relaxed">{material.features}</p>
                          <p className="text-xs tracking-wider text-muted-foreground">
                            Structure level: High
                          </p>
                          <div className="pt-3 mt-3 border-t border-white/20">
                            <h5 className="font-semibold tracking-wider uppercase mb-2">Size and Fit</h5>
                            <p className="text-xs leading-relaxed">The printed graphic contains a typographic size chart motif used across designs.</p>
                            <button
                              onClick={() => setSizeChartModalOpen(true)}
                              className="text-xs underline mt-2 hover:text-foreground transition-colors"
                            >
                              View Size Guide
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })}

      {/* Section: Brand Outro */}
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

      {/* Watermark */}
      <div className="fixed bottom-6 right-6 text-[10px] tracking-[0.2em] uppercase z-50">
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

      {/* Size Chart Modal */}
      {sizeChartModalOpen && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSizeChartModalOpen(false)}
        >
          <div 
            className="bg-background border border-white/20 rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-light tracking-wider uppercase">Size Guide</h3>
              <button
                onClick={() => setSizeChartModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-2xl"
                aria-label="Close size chart"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">All measurements are in inches.</p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-2">Size</th>
                    <th className="text-left py-3 px-2">Chest</th>
                    <th className="text-left py-3 px-2">Length</th>
                    <th className="text-left py-3 px-2">Shoulder</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10">
                    <td className="py-3 px-2">S</td>
                    <td className="py-3 px-2">36-38</td>
                    <td className="py-3 px-2">27</td>
                    <td className="py-3 px-2">17</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 px-2">M</td>
                    <td className="py-3 px-2">38-40</td>
                    <td className="py-3 px-2">28</td>
                    <td className="py-3 px-2">18</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 px-2">L</td>
                    <td className="py-3 px-2">40-42</td>
                    <td className="py-3 px-2">29</td>
                    <td className="py-3 px-2">19</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 px-2">XL</td>
                    <td className="py-3 px-2">42-44</td>
                    <td className="py-3 px-2">30</td>
                    <td className="py-3 px-2">20</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2">2XL</td>
                    <td className="py-3 px-2">44-46</td>
                    <td className="py-3 px-2">31</td>
                    <td className="py-3 px-2">21</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground pt-4">
                Note: The typographic size chart printed on the garment is a design element and not a functional measurement guide. Please refer to this table for accurate sizing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage;
