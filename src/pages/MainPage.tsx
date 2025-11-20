import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/cartStore";
import { storefrontApiRequest, STOREFRONT_PRODUCTS_QUERY, ShopifyProduct } from "@/lib/shopify";
import { Loader2 } from "lucide-react";
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
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first: 10 });
        const edges: ShopifyProduct[] = data?.data?.products?.edges || [];
        const filtered = edges.filter((p) => {
          const h = p.node.handle;
          return h.includes("helmet") || h.includes("butterfly") || h.includes("fire") || h.includes("love");
        });
        setProducts(filtered);
        const sizes: { [key: string]: number } = {};
        const views: { [key: string]: "front" | "back" } = {};
        filtered.forEach((p) => {
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

    toast.success(`Added to Cart — ${product.node.title}`, {
      duration: 2000,
      position: "bottom-left",
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
      toast.success("You're on the list. Welcome to the future.");
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
    <div className="bg-background text-foreground min-h-screen">
      {/* Simple header with logo + cart */}
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <img src={logo} alt="OUTAFLOW" className="h-10 w-auto" />
          <span className="text-xs tracking-[0.3em] uppercase">OUTAFLOW STORE</span>
        </div>
        <div data-cart-trigger>
          <CartDrawer />
        </div>
      </header>

      {/* Products */}
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-20">
        {products.map((product, index) => {
          const handle = product.node.handle;
          const material = materialByHandle(handle);
          const currentView = selectedImageView[product.node.id] || "front";
          const imageIndex = currentView === "front" ? 0 : 1;

          const isEven = index % 2 === 1;

          return (
            <section
              key={product.node.id}
              className="grid gap-10 md:grid-cols-2 items-start border-b border-border/30 pb-10 last:border-b-0"
            >
              {/* Text column */}
              <div className={isEven ? "md:order-2" : ""}>
                <h2 className="text-3xl md:text-4xl font-light tracking-wide uppercase mb-2">
                  {product.node.title}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {handle.includes("butterfly") && "Rebellion in Bloom"}
                  {handle.includes("helmet") && "Built for Momentum"}
                  {(handle.includes("fire") || handle.includes("love")) && "Love fades. Style stays."}
                </p>

                <p className="text-base mb-2">
                  <span className="font-semibold">Fabric:</span> {material.fabric}
                </p>
                <p className="text-sm text-muted-foreground mb-4">{material.model}</p>

                <p className="text-3xl font-light mb-4">
                  ${parseFloat(product.node.priceRange.minVariantPrice.amount).toFixed(2)}
                  <span className="ml-2 text-xs align-middle">
                    {product.node.priceRange.minVariantPrice.currencyCode}
                  </span>
                </p>

                {/* Sizes */}
                <div className="space-y-3 mb-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Select Size</p>
                  <div className="flex flex-wrap gap-2">
                    {product.node.variants.edges.map((variant, idx) => (
                      <button
                        key={variant.node.id}
                        onClick={() =>
                          setSelectedSizes((prev) => ({ ...prev, [product.node.id]: idx }))
                        }
                        className={`px-5 py-2 text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background
                          ${selectedSizes[product.node.id] === idx
                            ? "bg-foreground text-background"
                            : "bg-transparent text-foreground hover:bg-foreground/10"}
                        `}
                      >
                        {variant.node.title}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => handleAddToCart(product)}
                  size="lg"
                  className="w-full mb-4 bg-foreground text-background hover:bg-foreground/90"
                >
                  Add to Cart
                </Button>

                {/* Fabric details + size chart */}
                <details className="mt-4 border border-border/50 rounded-md">
                  <summary className="cursor-pointer px-4 py-3 text-sm tracking-[0.15em] uppercase">
                    Fabric Details & Size
                  </summary>
                  <div className="px-4 py-3 space-y-3 text-sm">
                    <p>{material.notes}</p>
                    <p className="text-xs text-muted-foreground">
                      The printed size-chart graphic is an art element, not a measurement guide.
                    </p>
                    <button
                      onClick={() =>
                        setSizeChartModalOpen(material.id as "R00227" | "RU0130")
                      }
                      className="text-xs underline mt-1"
                    >
                      View numeric size chart ({material.id})
                    </button>
                  </div>
                </details>
              </div>

              {/* Image column */}
              <div className={isEven ? "md:order-1" : ""}>
                <div className="mb-3 flex gap-4 text-sm uppercase tracking-[0.2em]">
                  <button
                    onClick={() =>
                      setSelectedImageView((prev) => ({ ...prev, [product.node.id]: "front" }))
                    }
                    className={`pb-1 border-b transition-colors
                      ${currentView === "front"
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground"}
                    `}
                  >
                    Front
                  </button>
                  <button
                    onClick={() =>
                      setSelectedImageView((prev) => ({ ...prev, [product.node.id]: "back" }))
                    }
                    className={`pb-1 border-b transition-colors
                      ${currentView === "back"
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground"}
                    `}
                  >
                    Back
                  </button>
                </div>

                <Link to={`/product/${product.node.handle}`} className="block">
                  <img
                    src={product.node.images.edges[imageIndex]?.node.url}
                    alt={`${product.node.title} ${currentView}`}
                    className="w-full h-auto border border-border/40"
                  />
                </Link>
              </div>
            </section>
          );
        })}

        {/* Email capture */}
        <section className="pt-10 border-t border-border/40 mt-10">
          <div className="max-w-md mx-auto text-center space-y-6">
            <h2 className="text-2xl tracking-[0.3em] uppercase">Stay in Flow</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Get notified on next drops"
                className="h-12 bg-transparent border-2 border-foreground text-center"
              />
              <Button
                type="submit"
                size="lg"
                className="w-full bg-foreground text-background hover:bg-background hover:text-foreground border-2 border-foreground"
              >
                Notify Me
              </Button>
            </form>
          </div>
        </section>
      </main>

      {/* Size chart modal */}
      {sizeChartModalOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4"
          onClick={() => setSizeChartModalOpen(null)}
        >
          <div
            className="bg-background border border-border/60 rounded-md max-w-3xl w-full max-h-[80vh] overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl tracking-[0.2em] uppercase">
                Size Chart — {sizeCharts[sizeChartModalOpen].name}
              </h3>
              <button
                onClick={() => setSizeChartModalOpen(null)}
                className="text-2xl leading-none"
                aria-label="Close size chart"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Measurements in inches and centimeters. Use this table for accurate sizing.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left py-2 px-3">Size</th>
                    <th className="text-left py-2 px-3">Chest (in / cm)</th>
                    <th className="text-left py-2 px-3">Length (in / cm)</th>
                    <th className="text-left py-2 px-3">Shoulder (in / cm)</th>
                    <th className="text-left py-2 px-3">Sleeve (in / cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeCharts[sizeChartModalOpen].sizes.map((row, idx) => (
                    <tr key={idx} className="border-b border-border/40">
                      <td className="py-2 px-3 font-medium">{row.size}</td>
                      <td className="py-2 px-3">
                        {row.chest_in} / {row.chest_cm}
                      </td>
                      <td className="py-2 px-3">
                        {row.length_in} / {row.length_cm}
                      </td>
                      <td className="py-2 px-3">
                        {row.shoulder_in} / {row.shoulder_cm}
                      </td>
                      <td className="py-2 px-3">
                        {row.sleeve_in} / {row.sleeve_cm}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              The typographic size-chart motif printed on the garments is a design element only.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage;
