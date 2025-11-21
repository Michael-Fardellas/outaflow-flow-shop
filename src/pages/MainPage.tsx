import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/cartStore";
import { storefrontApiRequest, STOREFRONT_PRODUCTS_QUERY, ShopifyProduct } from "@/lib/shopify";
import { Loader2, Heart, Flower2 } from "lucide-react";
import logo from "@/assets/outaflow-logo.png";
import { CartDrawer } from "@/components/CartDrawer";
import { useSoundEffect } from "@/hooks/use-sound-effect";
import { ParticleEffect } from "@/components/ParticleEffect";

// Helper function to determine product theme from tags
const getProductTheme = (tags: string[]): 'butterfly' | 'helmet' | 'fire' | 'default' => {
  if (tags.includes('theme-butterfly')) return 'butterfly';
  if (tags.includes('theme-helmet')) return 'helmet';
  if (tags.includes('theme-fire')) return 'fire';
  return 'default';
};

// Simple size chart data (R00227 + RU0130)
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

// Minimal material text per product
const materialByHandle = (handle: string) => {
  if (handle.includes("helmet")) {
    return {
      id: "R00227",
      title: "Helmet Flowers Tee — Black",
      fabric: "100% cotton, 9.0 oz/yd² (305 g/m²)",
      model: "Unisex regular fit",
      notes: "Printed graphic includes a typographic size-chart motif used as an art element across garments."
    };
  }
  if (handle.includes("butterfly")) {
    return {
      id: "R00227",
      title: "Butterfly Mask Tee",
      fabric: "100% cotton, 9.0 oz/yd² (305 g/m²)",
      model: "Unisex regular fit",
      notes: "Printed graphic includes a typographic size-chart motif used as an art element across garments."
    };
  }
  return {
    id: "RU0130",
    title: "Love's Gone but the Fit's Fire",
    fabric: "73.31% cotton, 26.69% Sorona, 7.1 oz/yd² (240 g/m²)",
    model: "Unisex loose fit",
    notes: "Sorona® hang tag included. Printed size-chart motif is part of the graphic, not a measurement guide."
  };
};

const MainPage = () => {
  const [email, setEmail] = useState("");
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSizes, setSelectedSizes] = useState<{ [key: string]: number }>({});
  const [selectedImageView, setSelectedImageView] = useState<{ [key: string]: "front" | "back" }>({});
  const [sizeChartModalOpen, setSizeChartModalOpen] = useState<"R00227" | "RU0130" | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState<string>("");
  const [particleTriggers, setParticleTriggers] = useState<{ [key: string]: number }>({});
  const [buttonPositions, setButtonPositions] = useState<{ [key: string]: { x: number; y: number } }>({});
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const addItem = useCartStore((s) => s.addItem);
  const { playClick } = useSoundEffect();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first: 10 });
        const edges: ShopifyProduct[] = data?.data?.products?.edges || [];
        // Use all returned products; current store only has the three live tees
        setProducts(edges);
        const sizes: { [key: string]: number } = {};
        const views: { [key: string]: "front" | "back" } = {};
        edges.forEach((p) => {
          sizes[p.node.id] = 0;
          views[p.node.id] = "front";
        });
        setSelectedSizes(sizes);
        setSelectedImageView(views);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
            // Track current section for progress bar color
            const productInView = products.find(p => `product-${p.node.id}` === entry.target.id);
            if (productInView) {
              const theme = getProductTheme(productInView.node.tags);
              setCurrentSection(theme);
            }
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -100px 0px" }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [products]);

  // Scroll progress tracking - GPU-accelerated with requestAnimationFrame
  useEffect(() => {
    let rafId: number | null = null;
    let ticking = false;

    const updateProgress = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(Math.min(progress, 100));
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(updateProgress);
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const handleAddToCart = (product: ShopifyProduct, event: React.MouseEvent<HTMLButtonElement>) => {
    const variantIndex = selectedSizes[product.node.id] || 0;
    const variant = product.node.variants.edges[variantIndex]?.node;
    if (!variant) return;

    // Capture button position
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    playClick();
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    // Trigger particle effect and store position
    setButtonPositions(prev => ({ ...prev, [product.node.id]: { x, y } }));
    setParticleTriggers(prev => ({
      ...prev,
      [product.node.id]: (prev[product.node.id] || 0) + 1
    }));
    
    addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    });

    toast.success(`Added — ${product.node.title}`, {
      duration: 1800,
      position: "top-center",
      style: {
        background: 'hsl(0 0% 0%)',
        border: '1px solid hsl(0 0% 100% / 0.1)',
        color: 'hsl(0 0% 100%)',
        fontSize: '10px',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        fontWeight: '300',
        padding: '12px 24px',
        opacity: 0.9,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      toast.error("Please enter a valid email");
      return;
    }
    try {
      const { error } = await supabase.from("email_signups").insert([{ email: normalized }]);
      if (error) {
        toast.error("Something went wrong. Please try again.");
        return;
      }
      toast.success("Subscribed. Welcome to the future.", {
        duration: 1800,
        position: "top-center",
        style: {
          background: 'hsl(0 0% 0%)',
          border: '1px solid hsl(0 0% 100% / 0.1)',
          color: 'hsl(0 0% 100%)',
          fontSize: '10px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontWeight: '300',
          padding: '12px 24px',
          opacity: 0.9,
        },
      });
      setEmail("");
    } catch {
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
    <div className="bg-background text-foreground min-h-screen relative overflow-x-hidden">

      {/* Scroll Progress Bar - GPU-accelerated, buttery smooth */}
      <div className="fixed top-0 left-0 w-full h-1 z-[60] pointer-events-none bg-black/20">
        <div 
          className="h-full origin-left"
          style={{ 
            transform: `scaleX(${scrollProgress / 100})`,
            willChange: 'transform',
            background: currentSection === "butterfly"
              ? "hsla(185, 95%, 65%, 1)"
              : currentSection === "helmet"
              ? "hsla(239, 95%, 75%, 1)"
              : currentSection === "fire"
              ? "hsla(217, 98%, 68%, 1)"
              : "hsl(0, 0%, 100%)",
            boxShadow: currentSection === "butterfly"
              ? "0 0 30px hsla(185, 95%, 65%, 0.8), 0 0 60px hsla(185, 95%, 65%, 0.4)"
              : currentSection === "helmet"
              ? "0 0 30px hsla(239, 95%, 75%, 0.8), 0 0 60px hsla(239, 95%, 75%, 0.4)"
              : currentSection === "fire"
              ? "0 0 30px hsla(217, 98%, 68%, 0.8), 0 0 60px hsla(217, 98%, 68%, 0.4)"
              : "0 0 10px hsla(0, 0%, 100%, 0.3)",
            transition: 'background 1.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </div>

      {/* Floating cart icon - always visible */}
      <div className="fixed top-8 right-8 z-50" data-cart-trigger>
        <CartDrawer />
      </div>

      {/* Hero Intro Section - Mobile Optimized */}
      <section className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
        {/* Multi-layer ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white/8 rounded-full blur-[150px] animate-[ambient-pulse_5s_ease-in-out_infinite] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-white/10 rounded-full blur-[100px] animate-[ambient-pulse_5s_ease-in-out_infinite_1s] pointer-events-none" />
        
        {/* Logo with 3D fade effect */}
        <div className="relative z-10 mb-8 md:mb-12 animate-[logo-3d-enter_1.2s_ease-out_forwards] opacity-0 perspective-1000">
          <div className="relative">
            {/* Shadow layers for 3D depth */}
            <img src={logo} alt="" className="absolute inset-0 h-20 md:h-28 w-auto blur-md opacity-20 transform translate-y-2" aria-hidden="true" />
            <img src={logo} alt="" className="absolute inset-0 h-20 md:h-28 w-auto blur-sm opacity-30 transform translate-y-1" aria-hidden="true" />
            {/* Main logo */}
            <img src={logo} alt="OUTAFLOW" className="relative h-20 md:h-28 w-auto drop-shadow-2xl" />
          </div>
        </div>

        {/* Faster typewriter text animation */}
        <div className="relative z-10 mb-24 md:mb-32 text-center">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-extralight tracking-[0.25em] md:tracking-[0.3em] uppercase px-4">
            {"Made with ".split("").map((char, i) => (
              <span
                key={i}
                className="inline-block opacity-0 animate-[letter-appear_0.03s_ease-out_forwards]"
                style={{ animationDelay: `${1.3 + i * 0.04}s` }}
              >
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-white via-white/90 to-white bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite]">
                purpose
              </span>
              <span
                className="absolute inset-0 blur-sm bg-gradient-to-r from-white/50 via-white/30 to-white/50 bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite]"
                aria-hidden="true"
              >
                purpose
              </span>
            </span>
            {".".split("").map((char, i) => (
              <span
                key={`period-${i}`}
                className="inline-block opacity-0 animate-[letter-appear_0.03s_ease-out_forwards]"
                style={{ animationDelay: `${1.3 + 17 * 0.04 + i * 0.04}s` }}
              >
                {char}
              </span>
            ))}
          </h1>
        </div>

        {/* Scroll to Discover cue */}
        <div className="absolute bottom-12 md:bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 md:gap-4 opacity-0 animate-[hero-fade-in_0.8s_ease-out_forwards] pointer-events-none" style={{ animationDelay: "2.2s" }}>
          <p className="text-[9px] md:text-[10px] tracking-[0.35em] md:tracking-[0.4em] uppercase font-light opacity-50">Scroll to Discover</p>
          <div className="w-[1px] h-12 md:h-16 bg-foreground/30 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 md:w-2 md:h-2 bg-foreground/50 rounded-full animate-[bounce-arrow_2.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </section>

      {/* Products - Gallery Exhibit Layout */}
      <main className="space-y-0" style={{ scrollBehavior: 'auto' }}>
        {products.map((product, index) => {
          const handle = product.node.handle;
          const theme = getProductTheme(product.node.tags);
          const material = materialByHandle(handle);
          const currentView = selectedImageView[product.node.id] || "front";
          const imageIndex = currentView === "front" ? 0 : 1;
          const isEven = index % 2 === 1;
          const sectionId = `product-${product.node.id}`;
          const isVisible = visibleSections.has(sectionId);

          // Scene personality - let CSS handle atmosphere
          let sceneClass = "";
          
          if (theme === 'butterfly') {
            sceneClass = "butterfly-minimal-scene";
          } else if (theme === 'helmet') {
            sceneClass = "helmet-minimal-scene";
          } else if (theme === 'fire') {
            sceneClass = "love-minimal-scene";
          }

          return (
            <section
              key={product.node.id}
              id={sectionId}
              ref={(el) => (sectionRefs.current[sectionId] = el)}
              className={`${sceneClass} min-h-screen flex items-center py-16 md:py-20 px-8 relative overflow-visible transition-opacity duration-700 ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* SCATTERED DECORATIONS WITH RADIAL HUES */}
              <div 
                className="absolute inset-0 pointer-events-none flex items-center justify-center z-0"
                style={{
                  transform: "scale(1)",
                  opacity: 0.95,
                  transition: "all 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {/* BUTTERFLY: Small scattered butterflies + radial cyan hue with ultra-smooth gradual transitions */}
                {theme === 'butterfly' && (
                  <>
                    {/* Extended radial hue - much stronger on mobile to match fire theme */}
                    <div className="absolute -top-[60vh] -bottom-[60vh] left-0 right-0 overflow-visible pointer-events-none">
                      <div
                        className="absolute inset-0 blur-[200px]"
                        style={{
                          background: "radial-gradient(ellipse 130% 100% at 50% 50%, hsla(185, 95%, 65%, 0.45) 0%, hsla(185, 95%, 65%, 0.32) 18%, hsla(185, 95%, 65%, 0.22) 32%, hsla(185, 95%, 65%, 0.14) 48%, hsla(185, 95%, 65%, 0.08) 65%, hsla(185, 95%, 65%, 0.03) 82%, transparent 100%)",
                        }}
                      />
                    </div>
                    
                    {/* Scattered small butterflies all over the place */}
                    <div className="absolute inset-0 overflow-visible">
                      {[
                        { top: '15%', left: '10%', size: 32, delay: 0, duration: 18 },
                        { top: '25%', right: '15%', size: 28, delay: 2, duration: 20 },
                        { top: '40%', left: '20%', size: 36, delay: 1, duration: 22 },
                        { top: '55%', right: '25%', size: 30, delay: 3, duration: 19 },
                        { top: '70%', left: '15%', size: 34, delay: 1.5, duration: 21 },
                        { top: '80%', right: '20%', size: 32, delay: 2.5, duration: 23 },
                        { top: '35%', left: '50%', size: 38, delay: 0.5, duration: 17 },
                      ].map((pos, i) => (
                        <svg
                          key={i}
                          className="absolute animate-[float_ease-in-out_infinite]"
                          style={{
                            top: pos.top,
                            left: pos.left,
                            right: pos.right,
                            width: `${pos.size}px`,
                            height: `${pos.size}px`,
                            animationDelay: `${pos.delay}s`,
                            animationDuration: `${pos.duration}s`,
                            color: 'hsla(185, 95%, 65%, 0.5)',
                            filter: 'drop-shadow(0 0 15px hsla(185, 95%, 65%, 0.6))',
                          }}
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 4C10.5 1.5 7.5 0 4 0c0 0 0 9 8 9m0-5C13.5 1.5 16.5 0 20 0c0 0 0 9-8 9m0 0v6m0 0C10.5 17.5 7.5 19 4 19c0 0 0-9 8-9m0 0c1.5 2.5 4.5 4 8 4 0 0 0-9-8-9" />
                        </svg>
                      ))}
                    </div>
                  </>
                )}

                {/* HELMET: Small scattered flowers + radial indigo hue with ultra-smooth gradual transitions (no helmets) */}
                {theme === 'helmet' && (
                  <>
                    {/* Extended radial hue - much stronger on mobile to match fire theme */}
                    <div className="absolute -top-[60vh] -bottom-[60vh] left-0 right-0 overflow-visible pointer-events-none">
                      <div
                        className="absolute inset-0 blur-[200px]"
                        style={{
                          background: "radial-gradient(ellipse 130% 100% at 50% 50%, hsla(239, 95%, 75%, 0.45) 0%, hsla(239, 95%, 75%, 0.32) 18%, hsla(239, 95%, 75%, 0.22) 32%, hsla(239, 95%, 75%, 0.14) 48%, hsla(239, 95%, 75%, 0.08) 65%, hsla(239, 95%, 75%, 0.03) 82%, transparent 100%)",
                        }}
                      />
                    </div>
                    
                    {/* Scattered small flowers all over */}
                    <div className="absolute inset-0 overflow-visible">
                      {[
                        { top: '12%', left: '8%', size: 28, delay: 0, duration: 19 },
                        { top: '28%', right: '12%', size: 32, delay: 1.5, duration: 21 },
                        { top: '45%', left: '18%', size: 30, delay: 0.8, duration: 20 },
                        { top: '60%', right: '22%', size: 34, delay: 2, duration: 18 },
                        { top: '75%', left: '12%', size: 28, delay: 1.2, duration: 22 },
                        { top: '85%', right: '18%', size: 30, delay: 2.5, duration: 19 },
                        { top: '38%', left: '50%', size: 36, delay: 0.5, duration: 17 },
                      ].map((pos, i) => (
                        <Flower2
                          key={i}
                          className="absolute animate-[float_ease-in-out_infinite]"
                          style={{
                            top: pos.top,
                            left: pos.left,
                            right: pos.right,
                            width: `${pos.size}px`,
                            height: `${pos.size}px`,
                            animationDelay: `${pos.delay}s`,
                            animationDuration: `${pos.duration}s`,
                            color: 'hsla(239, 95%, 75%, 0.5)',
                            filter: 'drop-shadow(0 0 15px hsla(239, 95%, 75%, 0.6))',
                          }}
                          strokeWidth={2}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* LOVE'S GONE: Small scattered hearts + radial blue hue with ultra-smooth gradual transitions (no butterflies) */}
                {theme === 'fire' && (
                  <>
                    {/* Extended radial blue hue - strong and visible on mobile */}
                    <div className="absolute -top-[60vh] -bottom-[60vh] left-0 right-0 overflow-visible pointer-events-none">
                      <div
                        className="absolute inset-0 blur-[200px]"
                        style={{
                          background: "radial-gradient(ellipse 130% 100% at 50% 50%, hsla(217, 95%, 68%, 0.45) 0%, hsla(217, 95%, 68%, 0.32) 18%, hsla(217, 95%, 68%, 0.22) 32%, hsla(217, 95%, 68%, 0.14) 48%, hsla(217, 95%, 68%, 0.08) 65%, hsla(217, 95%, 68%, 0.03) 82%, transparent 100%)",
                        }}
                      />
                    </div>
                    
                    {/* Scattered small hearts all over */}
                    <div className="absolute inset-0 overflow-visible">
                      {[
                        { top: '18%', left: '12%', size: 32, delay: 0, duration: 20 },
                        { top: '32%', right: '18%', size: 28, delay: 1.8, duration: 22 },
                        { top: '48%', left: '22%', size: 34, delay: 1, duration: 19 },
                        { top: '62%', right: '20%', size: 30, delay: 2.2, duration: 21 },
                        { top: '78%', left: '16%', size: 32, delay: 1.5, duration: 18 },
                        { top: '25%', left: '50%', size: 36, delay: 0.8, duration: 23 },
                        { top: '68%', right: '12%', size: 30, delay: 2.5, duration: 19 },
                      ].map((pos, i) => (
                        <Heart
                          key={`heart-${i}`}
                          className="absolute animate-[float_ease-in-out_infinite]"
                          style={{
                            top: pos.top,
                            left: pos.left,
                            right: pos.right,
                            width: `${pos.size}px`,
                            height: `${pos.size}px`,
                            animationDelay: `${pos.delay}s`,
                            animationDuration: `${pos.duration}s`,
                            color: 'hsla(217, 98%, 68%, 0.5)',
                            filter: 'drop-shadow(0 0 15px hsla(217, 98%, 68%, 0.6))',
                          }}
                          fill="hsla(217, 98%, 68%, 0.5)"
                          strokeWidth={2}
                        />
                      ))}
                    </div>
                  </>
                )}
 
                {/* Fallback: neutral subtle halo with smooth transitions if theme doesn't match */}
                {theme === 'default' && (
                  <div className="absolute inset-0 overflow-visible" style={{ margin: '-30vh 0' }}>
                    <div
                      className="absolute inset-0 blur-[200px]"
                      style={{
                        background: "radial-gradient(ellipse at 50% 50%, hsl(var(--foreground) / 0.18) 0%, hsl(var(--foreground) / 0.1) 30%, hsl(var(--foreground) / 0.04) 60%, transparent 100%)",
                      }}
                    />
                  </div>
                )}
              </div>

              <div className={`max-w-6xl mx-auto w-full grid gap-12 md:gap-16 md:grid-cols-2 items-center relative z-10 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
              } transition-all duration-900 delay-150`}>
                {/* Text column - Staggered fade-in - Always second on mobile */}
                <div className={`relative z-10 space-y-6 order-2 ${isEven ? "md:order-2" : "md:order-1"} ${
                  (handle.includes("fire") || handle.includes("love")) ? "tracking-wider" : ""
                }`}>
                  {/* Product title - larger but thinner */}
                  <h2 className={`text-4xl md:text-5xl font-bold tracking-[0.08em] uppercase mb-3 transition-opacity duration-1000 ${
                    isVisible ? "opacity-100" : "opacity-0"
                  } ${
                    (handle.includes("fire") || handle.includes("love")) ? "text-[hsl(217,98%,68%)]" : ""
                  }`} style={{ transitionDelay: "400ms" }}>
                    {product.node.title}
                  </h2>
                  
                  {/* Subtitle - smaller with increased letter spacing */}
                  <p className={`text-sm font-light tracking-[0.25em] uppercase opacity-60 mb-6 transition-opacity duration-1000 ${
                    isVisible ? "opacity-60" : "opacity-0"
                  } ${
                    (handle.includes("fire") || handle.includes("love")) ? "text-[hsl(217,98%,68%)]" : ""
                  }`} style={{ transitionDelay: "600ms" }}>
                    {handle.includes("butterfly") && "Rebellion in Bloom"}
                    {handle.includes("helmet") && "Built for Momentum"}
                    {(handle.includes("fire") || handle.includes("love")) && "Love fades. Style stays."}
                  </p>

                  {/* Fabric info with max-width */}
                  <div className={`max-w-md space-y-2 transition-opacity duration-1000 ${
                    isVisible ? "opacity-100" : "opacity-0"
                  } ${
                    (handle.includes("fire") || handle.includes("love")) ? "text-[hsl(217,98%,68%)]" : ""
                  }`} style={{ transitionDelay: "800ms" }}>
                    <p className="text-sm font-light leading-relaxed">
                      <span className="opacity-70">Fabric:</span> {material.fabric}
                    </p>
                    <p className="text-xs font-light opacity-50 tracking-wide">{material.model}</p>
                  </div>

                  {/* Price */}
                  <p className={`text-3xl font-extralight tracking-wider mb-8 transition-opacity duration-1000 ${
                    isVisible ? "opacity-100" : "opacity-0"
                  } ${
                    (handle.includes("fire") || handle.includes("love")) ? "text-[hsl(217,98%,68%)]" : ""
                  }`} style={{ transitionDelay: "1000ms" }}>
                    ${parseFloat(product.node.priceRange.minVariantPrice.amount).toFixed(2)}
                    <span className="ml-3 text-[10px] align-middle opacity-50 tracking-[0.3em]">
                      {product.node.priceRange.minVariantPrice.currencyCode}
                    </span>
                  </p>

                  {/* Size selector */}
                  <div className={`space-y-4 mb-8 transition-opacity duration-1000 ${
                    isVisible ? "opacity-100" : "opacity-0"
                  }`} style={{ transitionDelay: "1200ms" }}>
                    <p className="text-[10px] uppercase tracking-[0.3em] font-light opacity-50">Select Size</p>
                    <div className="flex flex-wrap gap-3">
                      {product.node.variants.edges.map((variant, idx) => (
                        <button
                          key={variant.node.id}
                          onClick={() => {
                            playClick();
                            if ('vibrate' in navigator) navigator.vibrate(30);
                            setSelectedSizes((prev) => ({ ...prev, [product.node.id]: idx }));
                          }}
                          className={`px-6 py-2.5 text-xs font-light tracking-[0.2em] border transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-offset-background focus:ring-foreground/20
                            ${selectedSizes[product.node.id] === idx
                              ? "bg-foreground/5 text-foreground border-foreground/40"
                              : "bg-transparent text-foreground/60 border-foreground/20 hover:border-foreground/40 hover:text-foreground/80"}
                          `}
                        >
                          {variant.node.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Add to cart button - minimal design */}
                  <Button
                    onClick={(e) => handleAddToCart(product, e)}
                    className={`w-full mb-6 transition-all duration-500 h-12 text-xs tracking-[0.25em] font-light bg-transparent border border-foreground/30 text-foreground hover:bg-foreground/5 hover:border-foreground/50 ${
                      isVisible ? "opacity-100" : "opacity-0"
                    }`}
                    style={{ transitionDelay: "1400ms" }}
                  >
                    Add to Cart
                  </Button>

                  {/* Fabric details - thin sliding sheet aesthetic */}
                  <details className={`mt-6 border-t border-foreground/10 transition-opacity duration-1000 ${
                    isVisible ? "opacity-100" : "opacity-0"
                  }`} style={{ transitionDelay: "1600ms" }}>
                    <summary className="cursor-pointer py-4 text-[10px] tracking-[0.3em] uppercase font-light opacity-50 hover:opacity-80 transition-opacity">
                      Fabric Details & Size
                    </summary>
                    <div className="pb-4 space-y-4 text-xs font-light leading-relaxed max-w-md opacity-70">
                      <p>{material.notes}</p>
                      <p className="text-[10px] opacity-50">
                        The printed size-chart graphic is an art element, not a measurement guide.
                      </p>
                      <button
                        onClick={() => {
                          playClick();
                          if ('vibrate' in navigator) navigator.vibrate(30);
                          setSizeChartModalOpen(material.id as "R00227" | "RU0130");
                        }}
                        className="text-[10px] tracking-[0.2em] uppercase underline decoration-foreground/20 hover:decoration-foreground/60 transition-all mt-2 opacity-60 hover:opacity-100"
                      >
                        View numeric size chart ({material.id})
                      </button>
                    </div>
                  </details>
                </div>

                {/* Image column with editorial baseline - Always first on mobile */}
                <div className={`relative z-10 order-1 ${isEven ? "md:order-1" : "md:order-2"}`}>
                  {/* Minimal front/back toggle with refined underline */}
                  <div className="mb-6 flex gap-8 text-[10px] uppercase tracking-[0.35em] font-light">
                    <button
                      onClick={() => {
                        playClick();
                        if ('vibrate' in navigator) navigator.vibrate(30);
                        setSelectedImageView((prev) => ({ ...prev, [product.node.id]: "front" }));
                      }}
                      className={`pb-2 relative transition-all duration-300
                        ${currentView === "front"
                          ? "text-foreground opacity-100"
                          : "text-foreground/40 hover:text-foreground/70"}
                      `}
                    >
                      Front
                      <div className={`absolute bottom-0 left-0 right-0 h-[1px] bg-foreground transition-all duration-300 ${
                        currentView === "front" ? "opacity-100" : "opacity-0"
                      }`} />
                    </button>
                    <button
                      onClick={() => {
                        playClick();
                        if ('vibrate' in navigator) navigator.vibrate(30);
                        setSelectedImageView((prev) => ({ ...prev, [product.node.id]: "back" }));
                      }}
                      className={`pb-2 relative transition-all duration-300
                        ${currentView === "back"
                          ? "text-foreground opacity-100"
                          : "text-foreground/40 hover:text-foreground/70"}
                      `}
                    >
                      Back
                      <div className={`absolute bottom-0 left-0 right-0 h-[1px] bg-foreground transition-all duration-300 ${
                        currentView === "back" ? "opacity-100" : "opacity-0"
                      }`} />
                    </button>
                  </div>

                  {/* Product image container */}
                  <div className="relative">
                    <Link 
                      to={`/product/${product.node.handle}`} 
                      className="block relative group"
                    >
                      <div className="relative">
                        <img
                          key={currentView}
                          src={product.node.images.edges[imageIndex]?.node.url}
                          alt={`${product.node.title} ${currentView}`}
                          className="w-full h-auto transition-opacity duration-[160ms] ease-out relative z-10"
                          style={{ willChange: "opacity" }}
                        />
                        {/* Precision glow on hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-20">
                          <div className="absolute inset-0 bg-gradient-radial from-foreground/[0.012] via-transparent to-transparent blur-sm" />
                        </div>
                        {/* Long-duration light sweep overlay */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none z-20">
                          <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-white/[0.02] to-transparent animate-[image-sweep_20s_ease-in-out_infinite]" />
                        </div>
                      </div>
                      {/* Editorial baseline rule */}
                      <div className="w-full h-[1px] bg-foreground/10 mt-6" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        {/* Email capture - refined minimal layout with flow effect */}
        <section className="min-h-[60vh] flex items-center justify-center py-[20vh] px-8 border-t border-foreground/5 relative">
          <div className="max-w-lg mx-auto text-center space-y-8 relative z-10">
            <h2 className="text-2xl font-extralight tracking-[0.35em] uppercase opacity-80">
              Stay in{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-white via-white/90 to-white bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite]">
                  Flow
                </span>
                <span className="absolute inset-0 blur-sm bg-gradient-to-r from-white/50 via-white/30 to-white/50 bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite]" aria-hidden="true">
                  Flow
                </span>
              </span>
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Get notified on next drops"
                className="h-12 bg-transparent border border-foreground/20 text-center text-xs tracking-[0.2em] font-light focus:border-foreground/40 transition-all duration-500"
              />
              <Button
                type="submit"
                onClick={() => {
                  playClick();
                  if ('vibrate' in navigator) navigator.vibrate(50);
                }}
                className="w-full bg-transparent border border-foreground/30 text-foreground hover:bg-foreground/5 hover:border-foreground/50 transition-all duration-500 h-12 text-xs tracking-[0.25em] font-light"
              >
                Notify Me
              </Button>
            </form>
          </div>
          
          {/* Instagram credit - bottom right, always visible */}
          <a
            href="https://instagram.com/mixalis_fardellas"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              playClick();
              if ("vibrate" in navigator) navigator.vibrate(30);
            }}
            className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[9999] group flex items-center gap-2 text-[9px] tracking-[0.25em] uppercase font-light opacity-30 hover:opacity-80 transition-all duration-500"
          >
            <span className="relative">
              Made by @mixalis_fardellas
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-foreground transition-all duration-500 group-hover:w-full" />
            </span>
          </a>
        </section>
      </main>

      {/* Refined size chart modal */}
      {sizeChartModalOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center px-8 backdrop-blur-sm"
          onClick={() => setSizeChartModalOpen(null)}
        >
          <div
            className="bg-background border border-foreground/10 max-w-4xl w-full max-h-[85vh] overflow-auto p-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8 pb-6 border-b border-foreground/10">
              <h3 className="text-xl font-extralight tracking-[0.3em] uppercase opacity-80">
                Size Chart — {sizeCharts[sizeChartModalOpen].name}
              </h3>
              <button
                onClick={() => setSizeChartModalOpen(null)}
                className="text-2xl leading-none opacity-50 hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center"
                aria-label="Close size chart"
              >
                ×
              </button>
            </div>
            <p className="text-[10px] font-light opacity-50 mb-6 tracking-wide">
              Measurements in inches and centimeters. Use this table for accurate sizing.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-light border-collapse">
                <thead>
                  <tr className="border-b border-foreground/10">
                    <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] font-light opacity-50">Size</th>
                    <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] font-light opacity-50">Chest (in / cm)</th>
                    <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] font-light opacity-50">Length (in / cm)</th>
                    <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] font-light opacity-50">Shoulder (in / cm)</th>
                    <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.2em] font-light opacity-50">Sleeve (in / cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeCharts[sizeChartModalOpen].sizes.map((row, idx) => (
                    <tr key={idx} className="border-b border-foreground/5">
                      <td className="py-3 px-4 font-normal opacity-80">{row.size}</td>
                      <td className="py-3 px-4 opacity-60">
                        {row.chest_in} / {row.chest_cm}
                      </td>
                      <td className="py-3 px-4 opacity-60">
                        {row.length_in} / {row.length_cm}
                      </td>
                      <td className="py-3 px-4 opacity-60">
                        {row.shoulder_in} / {row.shoulder_cm}
                      </td>
                      <td className="py-3 px-4 opacity-60">
                        {row.sleeve_in} / {row.sleeve_cm}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] font-light opacity-40 mt-6 tracking-wide">
              The typographic size-chart motif printed on the garments is a design element only.
            </p>
          </div>
        </div>
      )}

      {/* Particle Effects for each product */}
      {products.map((product) => {
        const theme = getProductTheme(product.node.tags);
        let particleType: 'heart' | 'butterfly' | 'flower' = 'heart';
        let particleColor = 'hsl(217, 98%, 68%)';

        if (theme === 'butterfly') {
          particleType = 'butterfly';
          particleColor = 'hsla(185, 95%, 65%, 1)';
        } else if (theme === 'helmet') {
          particleType = 'flower';
          particleColor = 'hsla(239, 95%, 75%, 1)';
        } else if (theme === 'fire') {
          particleType = 'heart';
          particleColor = 'hsla(217, 98%, 68%, 1)';
        }

        const position = buttonPositions[product.node.id];

        return (
          <ParticleEffect
            key={product.node.id}
            type={particleType}
            color={particleColor}
            trigger={particleTriggers[product.node.id] || 0}
            originX={position?.x}
            originY={position?.y}
          />
        );
      })}
    </div>
  );
};

export default MainPage;
