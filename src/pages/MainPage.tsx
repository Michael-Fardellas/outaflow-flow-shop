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
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const addItem = useCartStore((s) => s.addItem);

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

  const handleAddToCart = (product: ShopifyProduct) => {
    const variantIndex = selectedSizes[product.node.id] || 0;
    const variant = product.node.variants.edges[variantIndex]?.node;
    if (!variant) return;

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
    <div className="bg-background text-foreground min-h-screen relative">
      {/* Floating cart icon - always visible */}
      <div className="fixed top-8 right-8 z-50" data-cart-trigger>
        <CartDrawer />
      </div>

      {/* Hero Intro Section */}
      <section className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
        {/* Ambient light pulse behind logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-white/5 rounded-full blur-[120px] animate-[ambient-pulse_6s_ease-in-out_infinite] pointer-events-none" />
        
        {/* Logo fade-in */}
        <div className="relative z-10 mb-12 animate-[hero-fade-in_1.5s_ease-out_forwards] opacity-0">
          <img src={logo} alt="OUTAFLOW" className="h-24 md:h-32 w-auto" />
        </div>

        {/* Letter-by-letter text animation */}
        <div className="relative z-10 mb-32">
          <h1 className="text-2xl md:text-3xl font-extralight tracking-[0.3em] uppercase">
            {"Made with purpose.".split("").map((char, i) => (
              <span
                key={i}
                className="inline-block opacity-0 animate-[letter-appear_0.05s_ease-out_forwards]"
                style={{ animationDelay: `${2 + i * 0.08}s` }}
              >
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </h1>
        </div>

        {/* Scroll to Discover cue */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-0 animate-[hero-fade-in_1s_ease-out_forwards] pointer-events-none" style={{ animationDelay: "3.5s" }}>
          <p className="text-[10px] tracking-[0.4em] uppercase font-light opacity-60">Scroll to Discover</p>
          <div className="w-[1px] h-16 bg-foreground/30 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground/50 rounded-full animate-[bounce-arrow_2.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </section>

      {/* Products - Gallery Exhibit Layout */}
      <main className="space-y-0">
        {products.map((product, index) => {
          const handle = product.node.handle;
          const material = materialByHandle(handle);
          const currentView = selectedImageView[product.node.id] || "front";
          const imageIndex = currentView === "front" ? 0 : 1;
          const isEven = index % 2 === 1;
          const sectionId = `product-${product.node.id}`;
          const isVisible = visibleSections.has(sectionId);

          // Scene personality with minimal tonal shifts
          let sceneClass = "";
          let sceneStyles: React.CSSProperties = {};
          
          if (handle.includes("butterfly")) {
            sceneClass = "butterfly-minimal-scene";
            sceneStyles = { background: "#000" };
          } else if (handle.includes("helmet")) {
            sceneClass = "helmet-minimal-scene";
            sceneStyles = { background: "#000" };
          } else if (handle.includes("fire") || handle.includes("love")) {
            sceneClass = "love-minimal-scene";
            sceneStyles = { background: "#000" };
          }

          return (
            <section
              key={product.node.id}
              id={sectionId}
              ref={(el) => (sectionRefs.current[sectionId] = el)}
              style={sceneStyles}
              className={`${sceneClass} min-h-screen flex items-center py-[25vh] px-8 relative overflow-hidden transition-opacity duration-1000 ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Micro-parallax background layer */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  transform: isVisible ? "translateY(0)" : "translateY(-20px)",
                  transition: "transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {/* Minimal scene-specific background effects */}
                {handle.includes("butterfly") && (
                  <>
                    {/* Vertical soft-light strip */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-[70%] bg-white/5 blur-[80px] pointer-events-none" />
                    {/* Multiple butterflies scattered across the scene */}
                    <div className="absolute left-[12%] top-[18%] opacity-[0.08] pointer-events-none animate-[butterfly-float_20s_ease-in-out_infinite]">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-400">
                        <path d="M12 5c-1.5-2.5-4-4-7-4 0 0 0 9 7 9m0-5c1.5-2.5 4-4 7-4 0 0 0 9-7 9m0 0v5m0 0c-1.5 2.5-4 4-7 4 0 0 0-9 7-9m0 0c1.5 2.5 4 4 7 4 0 0 0-9-7-9" />
                      </svg>
                    </div>
                    <div className="absolute left-[25%] top-[35%] opacity-[0.06] pointer-events-none animate-[butterfly-float_24s_ease-in-out_infinite_1s]">
                      <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-400">
                        <path d="M12 5c-1.5-2.5-4-4-7-4 0 0 0 9 7 9m0-5c1.5-2.5 4-4 7-4 0 0 0 9-7 9m0 0v5m0 0c-1.5 2.5-4 4-7 4 0 0 0-9 7-9m0 0c1.5 2.5 4 4 7 4 0 0 0-9-7-9" />
                      </svg>
                    </div>
                    <div className="absolute right-[15%] top-[28%] opacity-[0.07] pointer-events-none animate-[butterfly-float_28s_ease-in-out_infinite_2s]">
                      <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-400">
                        <path d="M12 5c-1.5-2.5-4-4-7-4 0 0 0 9 7 9m0-5c1.5-2.5 4-4 7-4 0 0 0 9-7 9m0 0v5m0 0c-1.5 2.5-4 4-7 4 0 0 0-9 7-9m0 0c1.5 2.5 4 4 7 4 0 0 0-9-7-9" />
                      </svg>
                    </div>
                    <div className="absolute left-[65%] top-[45%] opacity-[0.05] pointer-events-none animate-[butterfly-float_22s_ease-in-out_infinite_3s]">
                      <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-400">
                        <path d="M12 5c-1.5-2.5-4-4-7-4 0 0 0 9 7 9m0-5c1.5-2.5 4-4 7-4 0 0 0 9-7 9m0 0v5m0 0c-1.5 2.5-4 4-7 4 0 0 0-9 7-9m0 0c1.5 2.5 4 4 7 4 0 0 0-9-7-9" />
                      </svg>
                    </div>
                    <div className="absolute right-[30%] top-[60%] opacity-[0.06] pointer-events-none animate-[butterfly-float_26s_ease-in-out_infinite_4s]">
                      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-400">
                        <path d="M12 5c-1.5-2.5-4-4-7-4 0 0 0 9 7 9m0-5c1.5-2.5 4-4 7-4 0 0 0 9-7 9m0 0v5m0 0c-1.5 2.5-4 4-7 4 0 0 0-9 7-9m0 0c1.5 2.5 4 4 7 4 0 0 0-9-7-9" />
                      </svg>
                    </div>
                    {/* Long-duration light sweep */}
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[40%] h-32 bg-gradient-to-b from-white/8 to-transparent blur-[100px] animate-[sweep-slow_18s_ease-in-out_infinite] pointer-events-none" />
                  </>
                )}

                {handle.includes("helmet") && (
                  <>
                    {/* Horizontal diffused band */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-24 bg-gradient-to-r from-transparent via-white/4 to-transparent blur-[60px] pointer-events-none" />
                    {/* Big flashy flowers scattered */}
                    <div className="absolute left-[15%] top-[20%] opacity-[0.08] pointer-events-none animate-[float-minimal_18s_ease-in-out_infinite]">
                      <Flower2 className="w-20 h-20 text-gray-500" strokeWidth={0.8} />
                    </div>
                    <div className="absolute right-[20%] top-[30%] opacity-[0.09] pointer-events-none animate-[float-minimal_22s_ease-in-out_infinite_1s]">
                      <Flower2 className="w-24 h-24 text-gray-500" strokeWidth={0.8} />
                    </div>
                    <div className="absolute left-[60%] top-[55%] opacity-[0.07] pointer-events-none animate-[float-minimal_20s_ease-in-out_infinite_2s]">
                      <Flower2 className="w-16 h-16 text-gray-500" strokeWidth={0.8} />
                    </div>
                    {/* Helmet shapes */}
                    <div className="absolute left-[25%] top-[65%] opacity-[0.06] pointer-events-none animate-[float-minimal_24s_ease-in-out_infinite_3s]">
                      <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-500">
                        <path d="M4 12a8 8 0 0116 0v4a2 2 0 01-2 2h-2m-8 0H6a2 2 0 01-2-2v-4zm0 0h12M9 18v3m6-3v3" />
                      </svg>
                    </div>
                    <div className="absolute right-[15%] top-[50%] opacity-[0.07] pointer-events-none animate-[float-minimal_26s_ease-in-out_infinite_4s]">
                      <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-500">
                        <path d="M4 12a8 8 0 0116 0v4a2 2 0 01-2 2h-2m-8 0H6a2 2 0 01-2-2v-4zm0 0h12M9 18v3m6-3v3" />
                      </svg>
                    </div>
                    {/* Slow gradient shift */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent opacity-50 animate-[gradient-shift_16s_ease-in-out_infinite] pointer-events-none" />
                  </>
                )}

                {(handle.includes("fire") || handle.includes("love")) && (
                  <>
                    {/* Big bright blue but subtle hue */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-blue-500/15 rounded-full blur-[140px] animate-[glow-pulse-minimal_10s_ease-in-out_infinite] pointer-events-none" />
                    {/* Additional blue layer for brightness */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[100px] opacity-50 pointer-events-none" />
                    {/* Broken hearts scattered across the scene */}
                    <div className="absolute left-[18%] top-[22%] opacity-[0.12] pointer-events-none animate-[broken-heart-float_20s_ease-in-out_infinite]">
                      <Heart className="w-12 h-12 text-blue-400 fill-blue-400/30" strokeWidth={1.5} />
                      <div className="absolute top-2 left-3 w-6 h-[2px] bg-background rotate-45" />
                    </div>
                    <div className="absolute right-[22%] top-[35%] opacity-[0.11] pointer-events-none animate-[broken-heart-float_24s_ease-in-out_infinite_1s]">
                      <Heart className="w-14 h-14 text-blue-400 fill-blue-400/30" strokeWidth={1.5} />
                      <div className="absolute top-3 left-4 w-7 h-[2px] bg-background rotate-45" />
                    </div>
                    <div className="absolute left-[65%] top-[48%] opacity-[0.10] pointer-events-none animate-[broken-heart-float_22s_ease-in-out_infinite_2s]">
                      <Heart className="w-11 h-11 text-blue-400 fill-blue-400/30" strokeWidth={1.5} />
                      <div className="absolute top-2 left-2.5 w-5 h-[2px] bg-background rotate-45" />
                    </div>
                    <div className="absolute left-[30%] top-[60%] opacity-[0.13] pointer-events-none animate-[broken-heart-float_26s_ease-in-out_infinite_3s]">
                      <Heart className="w-13 h-13 text-blue-400 fill-blue-400/30" strokeWidth={1.5} />
                      <div className="absolute top-2.5 left-3 w-6 h-[2px] bg-background rotate-45" />
                    </div>
                    <div className="absolute right-[15%] top-[25%] opacity-[0.09] pointer-events-none animate-[broken-heart-float_28s_ease-in-out_infinite_4s]">
                      <Heart className="w-10 h-10 text-blue-400 fill-blue-400/30" strokeWidth={1.5} />
                      <div className="absolute top-2 left-2 w-5 h-[2px] bg-background rotate-45" />
                    </div>
                  </>
                )}
              </div>

              <div className={`max-w-6xl mx-auto w-full grid gap-16 md:grid-cols-2 items-center relative z-10 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0"
              } transition-all duration-1200 delay-200`}>
                {/* Text column - Staggered fade-in */}
                <div className={`relative z-10 space-y-6 ${isEven ? "md:order-2" : ""} ${
                  (handle.includes("fire") || handle.includes("love")) ? "tracking-wider" : ""
                }`}>
                  {/* Product title - larger but thinner */}
                  <h2 className={`text-4xl md:text-5xl font-extralight tracking-[0.08em] uppercase mb-3 transition-opacity duration-1000 ${
                    isVisible ? "opacity-100" : "opacity-0"
                  }`} style={{ transitionDelay: "400ms" }}>
                    {product.node.title}
                  </h2>
                  
                  {/* Subtitle - smaller with increased letter spacing */}
                  <p className={`text-sm font-light tracking-[0.25em] uppercase opacity-60 mb-6 transition-opacity duration-1000 ${
                    isVisible ? "opacity-60" : "opacity-0"
                  }`} style={{ transitionDelay: "600ms" }}>
                    {handle.includes("butterfly") && "Rebellion in Bloom"}
                    {handle.includes("helmet") && "Built for Momentum"}
                    {(handle.includes("fire") || handle.includes("love")) && "Love fades. Style stays."}
                  </p>

                  {/* Fabric info with max-width */}
                  <div className={`max-w-md space-y-2 transition-opacity duration-1000 ${
                    isVisible ? "opacity-100" : "opacity-0"
                  }`} style={{ transitionDelay: "800ms" }}>
                    <p className="text-sm font-light leading-relaxed">
                      <span className="opacity-70">Fabric:</span> {material.fabric}
                    </p>
                    <p className="text-xs font-light opacity-50 tracking-wide">{material.model}</p>
                  </div>

                  {/* Price */}
                  <p className={`text-3xl font-extralight tracking-wider mb-8 transition-opacity duration-1000 ${
                    isVisible ? "opacity-100" : "opacity-0"
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
                          onClick={() =>
                            setSelectedSizes((prev) => ({ ...prev, [product.node.id]: idx }))
                          }
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

                  {/* Add to cart button */}
                  <Button
                    onClick={() => handleAddToCart(product)}
                    className={`w-full mb-6 bg-transparent border border-foreground/30 text-foreground hover:bg-foreground/5 hover:border-foreground/50 transition-all duration-500 h-12 text-xs tracking-[0.25em] font-light ${
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
                        onClick={() =>
                          setSizeChartModalOpen(material.id as "R00227" | "RU0130")
                        }
                        className="text-[10px] tracking-[0.2em] uppercase underline decoration-foreground/20 hover:decoration-foreground/60 transition-all mt-2 opacity-60 hover:opacity-100"
                      >
                        View numeric size chart ({material.id})
                      </button>
                    </div>
                  </details>
                </div>

                {/* Image column with editorial baseline */}
                <div className={`relative z-10 ${isEven ? "md:order-1" : ""}`}>
                  {/* Minimal front/back toggle with refined underline */}
                  <div className="mb-6 flex gap-8 text-[10px] uppercase tracking-[0.35em] font-light">
                    <button
                      onClick={() =>
                        setSelectedImageView((prev) => ({ ...prev, [product.node.id]: "front" }))
                      }
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
                      onClick={() =>
                        setSelectedImageView((prev) => ({ ...prev, [product.node.id]: "back" }))
                      }
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

                  {/* Product image with precision glow and editorial baseline */}
                  <Link 
                    to={`/product/${product.node.handle}`} 
                    className="block relative group"
                  >
                    <div className="relative">
                      <img
                        key={currentView}
                        src={product.node.images.edges[imageIndex]?.node.url}
                        alt={`${product.node.title} ${currentView}`}
                        className="w-full h-auto transition-opacity duration-[160ms] ease-out"
                        style={{ willChange: "opacity" }}
                      />
                      {/* Precision glow on hover */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-radial from-foreground/[0.008] via-transparent to-transparent blur-sm" />
                      </div>
                      {/* Long-duration light sweep overlay */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-white/[0.015] to-transparent animate-[image-sweep_20s_ease-in-out_infinite]" />
                      </div>
                    </div>
                    {/* Editorial baseline rule */}
                    <div className="w-full h-[1px] bg-foreground/10 mt-6" />
                  </Link>
                </div>
              </div>
            </section>
          );
        })}

        {/* Email capture - refined minimal layout */}
        <section className="min-h-[60vh] flex items-center justify-center py-[20vh] px-8 border-t border-foreground/5">
          <div className="max-w-lg mx-auto text-center space-y-8">
            <h2 className="text-2xl font-extralight tracking-[0.35em] uppercase opacity-80">Stay in Flow</h2>
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
                className="w-full bg-transparent border border-foreground/30 text-foreground hover:bg-foreground/5 hover:border-foreground/50 transition-all duration-500 h-12 text-xs tracking-[0.25em] font-light"
              >
                Notify Me
              </Button>
            </form>
          </div>
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
    </div>
  );
};

export default MainPage;
