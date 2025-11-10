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
        const isEven = index % 2 === 0;
        const productId = `product${index + 1}`;
        
        return (
          <section 
            key={product.node.id}
            id={productId}
            ref={(el) => {
              if (el) productRefs.current[index] = el as HTMLDivElement;
            }}
            className="min-h-screen flex items-center justify-center relative overflow-hidden py-20"
          >
            <div 
              className="absolute inset-0 pointer-events-none parallax-bg"
              style={{
                background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12) 0%, transparent 70%)`,
                transform: `translateY(${scrollY * -(0.12 - index * 0.01)}px)`
              }}
            />
            
            <div className="container mx-auto px-4 max-w-4xl relative z-10">
              {/* Image Section */}
              <div 
                className="relative overflow-hidden product-hover-container ambient-shadow mb-8"
                id={`product-${index + 1}`}
                onMouseEnter={() => setImageHover(productId)}
                onMouseLeave={() => setImageHover(null)}
              >
                <div className="spotlight-sweep" style={{ animationDelay: `${index * 2}s` }} />
                <div className="spotlight-diagonal" style={{ animationDelay: `${6 + index * 2}s` }} />
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
                <h3 className={`text-4xl md:text-5xl font-light tracking-wider uppercase text-reveal transition-all duration-1000 ease-out delay-200 ${
                  visibleSections[productId] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}>
                  {product.node.title}
                </h3>
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
                            ? 'bg-foreground text-background active'
                            : 'bg-transparent text-foreground hover:bg-foreground/10'
                        }`}
                      >
                        {variant.node.title}
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={() => handleAddToCart(product, `product-${index + 1}`)}
                    size="lg"
                    className="w-full bg-foreground text-background hover:bg-foreground/90 transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                  >
                    ADD TO CART
                  </Button>
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
