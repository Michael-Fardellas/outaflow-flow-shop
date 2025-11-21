import type React from "react";
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
      setScrollProgress(progress);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        rafId = window.requestAnimationFrame(updateProgress);
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  // Magnetic effect for buttons
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    target.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const target = e.currentTarget;
    target.style.transform = "translate(0, 0)";
  };

  const handleAddToCart = (product: ShopifyProduct) => {
    const variant = product.node.variants.edges[selectedSizes[product.node.id]]?.node;
    if (!variant) {
      toast.error("Select a size first.");
      return;
    }

    addItem({
      id: variant.id,
      title: product.node.title,
      price: parseFloat(variant.price.amount),
      image: product.node.images.edges[0]?.node.transformedSrc || "",
      size: variant.title,
      quantity: 1,
    });

    playClick();
    if ('vibrate' in navigator) navigator.vibrate(50);

    // Trigger particle effects based on theme
    const theme = getProductTheme(product.node.tags);
    setParticleTriggers(prev => ({
      ...prev,
      [product.node.id]: (prev[product.node.id] || 0) + 1,
    }));
  };

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Add your email first.");
      return;
    }

    const { error } = await supabase.from("email_signups").insert({ email });

    if (error) {
      toast.error("Something went wrong. Try again.");
    } else {
      toast.success("You are in the flow now.");
      setEmail("");
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const sections = document.querySelectorAll<HTMLElement>('[data-product-section="true"]');
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const button = section.querySelector<HTMLButtonElement>('[data-add-to-cart="true"]');
        if (button) {
          setButtonPositions(prev => ({
            ...prev,
            [section.id]: {
              x: rect.left + rect.width / 2,
              y: rect.bottom - 50,
            }
          }));
        }
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased overflow-x-hidden">
      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 w-full h-px z-40 pointer-events-none">
        <div
          className="h-full origin-left will-change-transform transition-[background] duration-700 ease-out"
          style={{
            transform: `scaleX(${Math.max(0.01, scrollProgress / 100)})`,
            background:
              currentSection === 'butterfly'
                ? 'linear-gradient(90deg, rgba(255,255,255,0.7), rgba(125,211,252,0.9))'
                : currentSection === 'helmet'
                  ? 'linear-gradient(90deg, rgba(209,213,219,0.8), rgba(129,140,248,0.9))'
                  : 'linear-gradient(90deg, rgba(255,255,255,0.6), rgba(59,130,246,0.95))',
            boxShadow:
              currentSection === 'butterfly'
                ? '0 0 25px rgba(125,211,252,0.7)'
                : currentSection === 'helmet'
                  ? '0 0 25px rgba(129,140,248,0.7)'
                  : '0 0 25px rgba(59,130,246,0.8)',
          }}
        />
      </div>

      <header className="fixed top-0 left-0 w-full z-30 pointer-events-none">
        <div className="container relative flex items-center justify-between py-4 md:py-5 px-6 md:px-10">
          <Link to="/" className="absolute inset-0 flex items-center justify-center z-10">
            <img src={logo} alt="OutaFlow Logo" className="h-6 md:h-7 lg:h-8" />
          </Link>

          <Button variant="ghost" size="icon" className="pointer-events-auto z-10">
            <CartDrawer />
          </Button>
        </div>
      </header>

      <main className="relative">
        {/* Hero Section */}
        <section className="min-h-[90vh] flex flex-col items-center justify-center px-6 md:px-10 pt-24 pb-32 relative overflow-hidden">
          {/* Hero background glows */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-0 w-full h-full bg-gradient-to-r from-background to-transparent" style={{ opacity: 0.3, filter: 'blur(90px)' }} />
            <div className="absolute bottom-1/4 right-0 w-full h-full bg-gradient-to-l from-background to-transparent" style={{ opacity: 0.3, filter: 'blur(90px)' }} />
          </div>

          {/* Logo as hero element */}
          <img
            src={logo}
            alt="OutaFlow Logo"
            className="h-12 md:h-14 lg:h-16 mb-8 md:mb-10 opacity-0 animate-[hero-fade-in_0.8s_ease-out_forwards]"
            style={{ animationDelay: "1s" }}
          />

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
              <span className="relative inline-block pl-1">
                <span
                  className="relative z-10 inline-block opacity-0 animate-[letter-appear_0.03s_ease-out_forwards] bg-gradient-to-r from-white via-white/90 to-white bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite]"
                  style={{ animationDelay: `${1.3 + 10 * 0.04}s` }}
                >
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
            <div className="w-px h-10 md:h-12 bg-gradient-to-b from-transparent via-foreground/40 to-transparent relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-foreground/70 animate-[scroll-cue_1.6s_ease-in-out_infinite]" />
            </div>
          </div>
        </section>

        {/* Product Sections */}
        {loading ? (
          <section className="min-h-[70vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" />
          </section>
        ) : (
          products.map((product) => {
            const handle = product.node.handle;
            const material = materialByHandle(handle);
            const theme = getProductTheme(product.node.tags);
            const sizes = product.node.variants.edges.map((e) => e.node.title);

            return (
              <section
                key={product.node.id}
                id={`product-${product.node.id}`}
                ref={(el) => (sectionRefs.current[product.node.id] = el)}
                data-product-section="true"
                className="min-h-[90vh] flex flex-col md:flex-row items-center justify-center gap-12 md:gap-16 py-[15vh] px-6 md:px-10 border-t border-foreground/5 relative"
              >
                {/* Particle effects */}
                <div className="absolute inset-0 -z-10">
                  <ParticleEffect
                    key={product.node.id}
                    active={!!particleTriggers[product.node.id]}
                    theme={theme}
                    count={12}
                    origin={buttonPositions[product.node.id]}
                  />
                </div>

                {/* Product Image & Size Select */}
                <div className="flex flex-col items-center gap-6 md:gap-8 w-full md:w-1/2 max-w-md">
                  <button
                    className="relative w-full aspect-square transition-all duration-300"
                    onClick={() => setSelectedImageView(prev => ({
                      ...prev,
                      [product.node.id]: prev[product.node.id] === "front" ? "back" : "front",
                    }))}
                  >
                    <img
                      src={product.node.images.edges[0]?.node.transformedSrc}
                      alt={product.node.title}
                      className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${selectedImageView[product.node.id] === "back" ? "opacity-0" : "opacity-100"}`}
                    />
                    <img
                      src={product.node.images.edges[1]?.node.transformedSrc}
                      alt={`${product.node.title} Back`}
                      className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${selectedImageView[product.node.id] === "front" ? "opacity-0" : "opacity-100"}`}
                    />
                  </button>

                  <div className="w-full">
                    <h4 className="mb-3 text-sm tracking-[0.3em] uppercase opacity-60">Select Size:</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {sizes.map((size, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          className={`w-full h-11 flex items-center justify-center tracking-[0.2em] uppercase text-[10px] ${selectedSizes[product.node.id] === i ? "bg-foreground text-background shadow-md" : "bg-background/70 text-foreground hover:bg-foreground/10"}`}
                          onClick={() => setSelectedSizes(prev => ({
                            ...prev,
                            [product.node.id]: i,
                          }))}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Product Details & Add to Cart */}
                <div className="flex flex-col items-start gap-6 md:gap-8 w-full md:w-1/2 max-w-md">
                  <h2 className="text-2xl md:text-3xl font-extralight tracking-[0.15em]">{product.node.title}</h2>
                  <p className="text-sm tracking-[0.15em] opacity-70">{material.notes}</p>

                  <div className="w-full flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <h4 className="text-sm tracking-[0.3em] uppercase opacity-60">Material:</h4>
                      <p className="text-sm tracking-[0.15em] opacity-90">{material.fabric}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <h4 className="text-sm tracking-[0.3em] uppercase opacity-60">Fit:</h4>
                      <p className="text-sm tracking-[0.15em] opacity-90">{material.model}</p>
                    </div>
                  </div>

                  <div className="w-full flex items-center justify-between">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="tracking-[0.2em] uppercase text-[9px] bg-background/70 text-foreground hover:bg-foreground/10 transition-all duration-300"
                      onClick={() => setSizeChartModalOpen(material.id as "R00227" | "RU0130")}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                    >
                      Size Chart
                    </Button>
                    <Button
                      data-add-to-cart="true"
                      className="tracking-[0.25em] text-[10px] uppercase py-6 px-8 bg-foreground text-background hover:bg-foreground/90 transition-all duration-300"
                      onClick={() => handleAddToCart(product)}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </section>
            );
          })
        )}

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
            <form onSubmit={handleNotifySubmit} className="space-y-6">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email to stay in flow"
                className="bg-background/60 border-foreground/10 focus-visible:ring-foreground/40 text-foreground placeholder:text-foreground/30 tracking-[0.18em] text-[10px] uppercase"
              />
              <Button
                type="submit"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="w-full tracking-[0.25em] text-[10px] uppercase py-6 bg-foreground text-background hover:bg-foreground/90 transition-all duration-300"
              >
                Notify Me
              </Button>
            </form>
          </div>

          <a
            href="https://www.instagram.com/mixalis_fardellas"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              playClick();
              if ('vibrate' in navigator) navigator.vibrate(30);
            }}
            className="fixed inset-x-0 bottom-4 md:bottom-6 z-[100] flex justify-end px-4 md:px-6 group text-[9px] tracking-[0.25em] uppercase font-light opacity-40 hover:opacity-80 transition-all duration-500"
            style={{ position: 'fixed', bottom: '0' }}
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
            <h3 className="text-lg font-semibold tracking-[0.2em] uppercase mb-6">Size Chart for {sizeChartModalOpen}</h3>
            {sizeCharts[sizeChartModalOpen] && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-foreground/80">
                  <thead className="text-xs text-foreground uppercase bg-background/80">
                    <tr>
                      <th className="py-3 px-6">Size</th>
                      <th className="py-3 px-6">Chest (in)</th>
                      <th className="py-3 px-6">Chest (cm)</th>
                      <th className="py-3 px-6">Length (in)</th>
                      <th className="py-3 px-6">Length (cm)</th>
                      <th className="py-3 px-6">Shoulder (in)</th>
                      <th className="py-3 px-6">Shoulder (cm)</th>
                      <th className="py-3 px-6">Sleeve (in)</th>
                      <th className="py-3 px-6">Sleeve (cm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeCharts[sizeChartModalOpen].sizes.map((s) => (
                      <tr key={s.size} className="border-b border-foreground/10">
                        <td className="py-4 px-6">{s.size}</td>
                        <td className="py-4 px-6">{s.chest_in}</td>
                        <td className="py-4 px-6">{s.chest_cm}</td>
                        <td className="py-4 px-6">{s.length_in}</td>
                        <td className="py-4 px-6">{s.length_cm}</td>
                        <td className="py-4 px-6">{s.shoulder_in}</td>
                        <td className="py-4 px-6">{s.shoulder_cm}</td>
                        <td className="py-4 px-6">{s.sleeve_in}</td>
                        <td className="py-4 px-6">{s.sleeve_cm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage;
