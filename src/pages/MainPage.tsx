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

// Data normalization helper
const cleanDescription = (html: string): string => {
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

// Size chart data
const sizeCharts = {
  R00227: {
    name: "R00227",
    sizes: [
      { size: "XS", chest_in: "31.5-33.1", chest_cm: "80-84", length_in: "25.2", length_cm: "64", shoulder_in: "15.7", shoulder_cm: "40", sleeve_in: "7.1", sleeve_cm: "18" },
      { size: "S", chest_in: "33.1-35.4", chest_cm: "84-90", length_in: "26.4", length_cm: "67", shoulder_in: "16.5", shoulder_cm: "42", sleeve_in: "7.5", sleeve_cm: "19" },
      { size: "M", chest_in: "35.4-38.6", chest_cm: "90-98", length_in: "27.6", length_cm: "70", shoulder_in: "17.3", shoulder_cm: "44", sleeve_in: "7.9", sleeve_cm: "20" },
      { size: "L", chest_in: "38.6-41.7", chest_cm: "98-106", length_in: "28.7", length_cm: "73", shoulder_in: "18.1", shoulder_cm: "46", sleeve_in: "8.3", sleeve_cm: "21" },
      { size: "XL", chest_in: "41.7-44.9", chest_cm: "106-114", length_in: "29.9", length_cm: "76", shoulder_in: "18.9", shoulder_cm: "48", sleeve_in: "8.7", sleeve_cm: "22" },
      { size: "XXL", chest_in: "44.9-48.0", chest_cm: "114-122", length_in: "31.1", length_cm: "79", shoulder_in: "19.7", shoulder_cm: "50", sleeve_in: "9.1", sleeve_cm: "23" }
    ]
  },
  RU0130: {
    name: "RU0130",
    sizes: [
      { size: "S", chest_in: "41.7", chest_cm: "106", length_in: "26.8", length_cm: "68", shoulder_in: "20.9", shoulder_cm: "53", sleeve_in: "8.3", sleeve_cm: "21" },
      { size: "M", chest_in: "43.3", chest_cm: "110", length_in: "27.6", length_cm: "70", shoulder_in: "21.7", shoulder_cm: "55", sleeve_in: "8.7", sleeve_cm: "22" },
      { size: "L", chest_in: "44.9", chest_cm: "114", length_in: "28.3", length_cm: "72", shoulder_in: "22.4", shoulder_cm: "57", sleeve_in: "9.1", sleeve_cm: "23" },
      { size: "XL", chest_in: "46.5", chest_cm: "118", length_in: "29.1", length_cm: "74", shoulder_in: "23.2", shoulder_cm: "59", sleeve_in: "9.4", sleeve_cm: "24" },
      { size: "2XL", chest_in: "48.0", chest_cm: "122", length_in: "29.9", length_cm: "76", shoulder_in: "24.0", shoulder_cm: "61", sleeve_in: "9.8", sleeve_cm: "25" }
    ]
  }
};

// Material data with full specifications
const materialData: { [key: string]: any } = {
  "helmet": {
    id: "R00227",
    title: "Helmet Flowers Tee — Black",
    gender: "Unisex",
    model: "Regular",
    fabric: "100% cotton",
    weight: "9.0 oz/yd² (305 g/m²)",
    thickness: "Moderate",
    stretch: "Slight stretch",
    care: "30°C gentle wash, do not bleach, tumble dry low, iron low avoiding print, no dry clean",
    features: "Casual, Basics, Daily, Pure Cotton, Short Sleeve, Regular Sleeve, Round Neck, Spring Summer",
    printSize: "40×52 cm",
    notes: "Due to different batches and manual measurement, there may be slight differences in fabric and size between products.",
    sizeChart: "R00227"
  },
  "butterfly": {
    id: "R00227",
    title: "Butterfly Mask Tee — Black",
    gender: "Unisex",
    model: "Regular",
    fabric: "100% cotton",
    weight: "9.0 oz/yd² (305 g/m²)",
    thickness: "Moderate",
    stretch: "Slight stretch",
    care: "30°C gentle wash, do not bleach, tumble dry low, iron low avoiding print, no dry clean",
    features: "Casual, Basics, Daily, Pure Cotton, Short Sleeve, Regular Sleeve, Round Neck, Spring Summer",
    printSize: "40×52 cm",
    notes: "Due to different batches and manual measurement, there may be slight differences in fabric and size between products.",
    sizeChart: "R00227"
  },
  "love": {
    id: "RU0130",
    title: "Love's Gone but the Fit's Fire",
    gender: "Unisex",
    model: "Loose",
    fabric: "73.31% cotton, 26.69% Sorona",
    weight: "7.1 oz/yd² (240 g/m²)",
    thickness: "Moderate",
    care: "30°C gentle wash, do not bleach, tumble dry low, iron low avoiding print, no dry clean",
    features: "Basics, Casual, Street, Drop Shoulder, Long, Loose, All Seasons",
    printSize: "40×52 cm",
    notes: "Sorona® hang tag included. This fabric combines natural cotton comfort with Sorona's moisture-wicking performance.",
    sizeChart: "RU0130"
  }
};

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
  const [sizeChartModalOpen, setSizeChartModalOpen] = useState<string | null>(null);
  const [backImageLoaded, setBackImageLoaded] = useState<{ [key: string]: boolean }>({});
  const addItem = useCartStore(state => state.addItem);
  
  const heroRef = useRef<HTMLDivElement>(null);
  const productRefs = useRef<(HTMLDivElement | null)[]>([]);
  const outroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchProducts();
  }, []);

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') {
        const cartButton = document.querySelector('[data-cart-trigger]') as HTMLButtonElement;
        if (cartButton) {
          cartButton.click();
        }
      }
      if (e.key === 'Escape' && sizeChartModalOpen) {
        setSizeChartModalOpen(null);
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
          
          // Preload next section images
          const currentIndex = parseInt(entry.target.id.replace('product', '')) - 1;
          if (!isNaN(currentIndex) && products[currentIndex + 1]) {
            const nextProduct = products[currentIndex + 1];
            if (nextProduct.node.images.edges[1]?.node.url) {
              const img = new Image();
              img.src = nextProduct.node.images.edges[1].node.url;
            }
          }
        }
      });
    }, observerOptions);

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
        const initialVisible: { [key: string]: boolean } = { hero: true, outro: true };
        data.data.products.edges.forEach((product: ShopifyProduct, index: number) => {
          initialSizes[product.node.id] = 0;
          initialViews[product.node.id] = "front";
          initialVisible[`product${index + 1}`] = true;
        });
        setSelectedSizes(initialSizes);
        setSelectedImageView(initialViews);
        setVisibleSections(initialVisible);
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
    handleScroll();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [products]);

  const handleAddToCart = (product: ShopifyProduct, productId: string) => {
    const variantIndex = selectedSizes[product.node.id] || 0;
    const variant = product.node.variants.edges[variantIndex].node;
    
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
    
    const toastContainer = document.createElement('div');
    toastContainer.setAttribute('aria-live', 'polite');
    toastContainer.setAttribute('role', 'status');
    
    toast.success(`Added to Cart — ${product.node.title}`, {
      duration: 2000,
      position: "bottom-left",
      style: {
        background: 'rgba(0, 0, 0, 0.95)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }
    });
  };

  const handleImageToggle = (productId: string, view: "front" | "back") => {
    if (selectedImageView[productId] === view || imageTransitioning[productId]) return;
    
    // Lazy load back image if needed
    if (view === "back" && !backImageLoaded[productId]) {
      const product = products.find(p => p.node.id === productId);
      if (product?.node.images.edges[1]?.node.url) {
        const img = new Image();
        img.onload = () => {
          setBackImageLoaded(prev => ({ ...prev, [productId]: true }));
        };
        img.src = product.node.images.edges[1].node.url;
      }
    }
    
    setImageTransitioning(prev => ({ ...prev, [productId]: true }));
    setSelectedImageView(prev => ({ ...prev, [productId]: view }));
    
    setTimeout(() => {
      setImageTransitioning(prev => ({ ...prev, [productId]: false }));
    }, 160);
  };

  const handleSizeSelect = (productId: string, handle: string, idx: number) => {
    setSelectedSizes(prev => ({ ...prev, [productId]: idx }));
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
    return materialData.butterfly;
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
      <div className="sticky top-4 z-40 px-4">
        <div className="flex justify-end">
          <div data-cart-trigger>
            <CartDrawer />
          </div>
        </div>
      </div>

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

      {/* Hero Section */}
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

      {/* Product Sections */}
      {products.map((product, index) => {
        const productId = `product${index + 1}`;
        const handle = product.node.handle;
        const isButterfly = handle.includes('butterfly');
        const isHelmet = handle.includes('helmet');
        const isLovesGone = handle.includes('fire') || handle.includes('love');
        const currentView = selectedImageView[product.node.id] || "front";
        const imageIndex = currentView === "front" ? 0 : 1;
        const material = getMaterialForProduct(handle);
        
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
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(255,255,255,0.12) 0%, transparent 70%)',
                    filter: 'blur(60px)'
                  }}
                />
                
                <div className="vertical-spotlight" />
                
                <div className="floating-particle" style={{ top: '25%', right: '30%', zIndex: 2 }} />
                <div className="floating-particle" style={{ top: '30%', right: '28%', animationDelay: '2s', zIndex: 2 }} />
                <div className="floating-particle" style={{ top: '28%', right: '32%', animationDelay: '4s', zIndex: 2 }} />
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
                    background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(70, 130, 200, 0.20) 0%, rgba(30, 50, 80, 0.08) 50%, transparent 70%)',
                    filter: 'blur(40px)'
                  }}
                />
                
                <div 
                  className="absolute inset-0 pointer-events-none opacity-70"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(70, 130, 200, 0.15) 0%, rgba(30, 60, 100, 0.08) 50%, transparent 80%)',
                    animation: 'blue-glow-pulse 10s ease-in-out infinite'
                  }}
                />
                
                <div className="diagonal-beam" />
                
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
                {/* Text Section - Left for Butterfly, Center for Love's Gone */}
                {(isLeftLayout || isCenteredLayout) && (
                  <div className={`space-y-6 ${isCenteredLayout ? 'text-center mx-auto max-w-2xl order-2' : ''}`}>
                    <div>
                      <h3 className={`text-4xl md:text-5xl font-light tracking-wider uppercase text-reveal transition-all duration-1000 ease-out delay-200 ${
                        visibleSections[productId] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                      } ${isLovesGone ? 'tracking-widest' : ''}`}>
                        {product.node.title}
                      </h3>
                      <p className={`text-sm tracking-widest mt-2 transition-all duration-1000 ease-out delay-300 ${
                        visibleSections[productId] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                      } ${isButterfly ? 'italic font-serif text-muted-foreground' : ''} ${isLovesGone ? 'nightclub-blue' : ''}`}>
                        {isButterfly && "Rebellion in Bloom"}
                        {isLovesGone && "Love fades. Style stays."}
                      </p>
                    </div>
                    
                    {isButterfly && (
                      <div className="flex gap-2 flex-wrap justify-center text-xs">
                        <span className="pill-badge">Heavyweight</span>
                        <span className="pill-badge">Structured Drape</span>
                        <span className="pill-badge">Pure Cotton</span>
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
                      
                      <div className="flex gap-2 flex-wrap justify-center">
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
                            ? 'bg-foreground text-background hover:bg-nightclub-blue hover:text-white hover:shadow-[0_0_30px_rgba(70,130,200,0.4)]'
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
                          ${isLovesGone ? 'fabric-panel-left bg-black/90 text-white border border-nightclub-blue/30 backdrop-blur-sm' : ''}
                          p-6 rounded space-y-3 text-sm
                        `}>
                          <h4 className="font-semibold tracking-wider uppercase">Material Details</h4>
                          <div className="space-y-2 text-xs">
                            <p><strong>Fabric:</strong> {material.fabric}</p>
                            <p><strong>Weight:</strong> {material.weight}</p>
                            <p><strong>Thickness:</strong> {material.thickness}</p>
                            {material.stretch && <p><strong>Stretch:</strong> {material.stretch}</p>}
                            <p><strong>Print Size:</strong> {material.printSize}</p>
                          </div>
                          
                          <div className="pt-3 mt-3 border-t border-current/20">
                            <h5 className="font-semibold tracking-wider uppercase mb-2">Care</h5>
                            <p className="text-xs leading-relaxed">{material.care}</p>
                          </div>
                          
                          <div className="pt-3 mt-3 border-t border-current/20">
                            <h5 className="font-semibold tracking-wider uppercase mb-2">Features</h5>
                            <p className="text-xs leading-relaxed">{material.features}</p>
                          </div>
                          
                          {material.notes && (
                            <div className="pt-3 mt-3 border-t border-current/20">
                              <p className="text-xs leading-relaxed italic">{material.notes}</p>
                            </div>
                          )}
                          
                          <div className="pt-3 mt-3 border-t border-current/20">
                            <h5 className="font-semibold tracking-wider uppercase mb-2">Size and Fit</h5>
                            <p className="text-xs leading-relaxed">The printed graphic contains a typographic size chart motif used across designs. For accurate sizing:</p>
                            <button
                              onClick={() => setSizeChartModalOpen(material.sizeChart)}
                              className="text-xs underline mt-2 hover:opacity-70 transition-opacity"
                            >
                              View Size Chart ({material.sizeChart})
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
                    // Preload back image on hover
                    if (!backImageLoaded[product.node.id] && product.node.images.edges[1]?.node.url) {
                      const img = new Image();
                      img.onload = () => setBackImageLoaded(prev => ({ ...prev, [product.node.id]: true }));
                      img.src = product.node.images.edges[1].node.url;
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

                  {isButterfly && currentView === "front" && (
                    <div className="vertical-spotlight" />
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
                  
                  {isButterfly && currentView === "back" && (
                    <div className="gallery-frame" />
                  )}
                  
                  {isHelmet && currentView === "back" && (
                    <div className="progress-bar" />
                  )}
                  
                  <Link to={`/product/${product.node.handle}`} className="block">
                    <img 
                      src={product.node.images.edges[imageIndex]?.node.url}
                      alt={`${product.node.title} ${currentView}`}
                      loading={imageIndex === 0 ? "eager" : "lazy"}
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
                          <div className="space-y-2 text-xs">
                            <p><strong>Fabric:</strong> {material.fabric}</p>
                            <p><strong>Weight:</strong> {material.weight}</p>
                            <p><strong>Thickness:</strong> {material.thickness}</p>
                            {material.stretch && <p><strong>Stretch:</strong> {material.stretch}</p>}
                            <p><strong>Print Size:</strong> {material.printSize}</p>
                          </div>
                          
                          <div className="pt-3 mt-3 border-t border-white/20">
                            <h5 className="font-semibold tracking-wider uppercase mb-2">Care</h5>
                            <p className="text-xs leading-relaxed">{material.care}</p>
                          </div>
                          
                          <div className="pt-3 mt-3 border-t border-white/20">
                            <h5 className="font-semibold tracking-wider uppercase mb-2">Features</h5>
                            <p className="text-xs leading-relaxed">{material.features}</p>
                          </div>
                          
                          <p className="text-xs tracking-wider text-muted-foreground">
                            Structure level: High
                          </p>
                          
                          {material.notes && (
                            <div className="pt-3 mt-3 border-t border-white/20">
                              <p className="text-xs leading-relaxed italic">{material.notes}</p>
                            </div>
                          )}
                          
                          <div className="pt-3 mt-3 border-t border-white/20">
                            <h5 className="font-semibold tracking-wider uppercase mb-2">Size and Fit</h5>
                            <p className="text-xs leading-relaxed">The printed graphic contains a typographic size chart motif used across designs. For accurate sizing:</p>
                            <button
                              onClick={() => setSizeChartModalOpen(material.sizeChart)}
                              className="text-xs underline mt-2 hover:opacity-70 transition-opacity"
                            >
                              View Size Chart ({material.sizeChart})
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

      {/* Outro Section */}
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
          onClick={() => setSizeChartModalOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="size-chart-title"
        >
          <div 
            className="bg-background border border-white/20 rounded-lg p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 id="size-chart-title" className="text-2xl font-light tracking-wider uppercase">
                Size Guide - {sizeChartModalOpen}
              </h3>
              <button
                onClick={() => setSizeChartModalOpen(null)}
                className="text-muted-foreground hover:text-foreground transition-colors text-2xl"
                aria-label="Close size chart"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground mb-4">All measurements provided in both inches and centimeters.</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-4">Size</th>
                      <th className="text-left py-3 px-4">Chest (in / cm)</th>
                      <th className="text-left py-3 px-4">Length (in / cm)</th>
                      <th className="text-left py-3 px-4">Shoulder (in / cm)</th>
                      <th className="text-left py-3 px-4">Sleeve (in / cm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeCharts[sizeChartModalOpen as keyof typeof sizeCharts]?.sizes.map((row, index) => (
                      <tr key={index} className="border-b border-white/10">
                        <td className="py-3 px-4 font-medium">{row.size}</td>
                        <td className="py-3 px-4">{row.chest_in} / {row.chest_cm}</td>
                        <td className="py-3 px-4">{row.length_in} / {row.length_cm}</td>
                        <td className="py-3 px-4">{row.shoulder_in} / {row.shoulder_cm}</td>
                        <td className="py-3 px-4">{row.sleeve_in} / {row.sleeve_cm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground pt-4 italic">
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
