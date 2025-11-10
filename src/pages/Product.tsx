import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { storefrontApiRequest, STOREFRONT_PRODUCT_BY_HANDLE_QUERY, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CartDrawer } from "@/components/CartDrawer";

export default function Product() {
  const { handle } = useParams();
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<number>(0);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await storefrontApiRequest(STOREFRONT_PRODUCT_BY_HANDLE_QUERY, {
          handle,
        });
        
        if (data.data.productByHandle) {
          setProduct({ node: data.data.productByHandle });
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [handle]);

  const handleAddToCart = () => {
    if (!product) return;

    const variant = product.node.variants.edges[selectedVariant].node;
    
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-light tracking-wider uppercase text-foreground">Product not found</h1>
          <Link to="/mainpage">
            <Button 
              variant="outline"
              className="border-foreground text-foreground hover:bg-foreground hover:text-background"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Shop
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { node } = product;
  const price = parseFloat(node.variants.edges[selectedVariant].node.price.amount);

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Floating cart */}
      <div className="sticky top-4 z-40 px-4">
        <div className="flex justify-end">
          <CartDrawer />
        </div>
      </div>

      <main className="container mx-auto px-4 py-12">
        <Link 
          to="/mainpage" 
          className="inline-flex items-center mb-12 text-foreground hover:text-accent transition-all duration-300 tracking-wide"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          BACK
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 animate-fade-in">
          {/* Images */}
          <div className="space-y-6">
            {node.images.edges.map((image, idx) => (
              <div 
                key={idx} 
                className="aspect-square bg-secondary/10 overflow-hidden relative group"
              >
                <img
                  src={image.node.url}
                  alt={image.node.altText || node.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            ))}
          </div>

          {/* Product Details */}
          <div className="space-y-8">
            <h1 className="text-5xl font-light uppercase tracking-wider text-reveal">
              {node.title}
            </h1>
            
            <p className="text-3xl font-light tracking-wider">
              ${price.toFixed(2)} {node.variants.edges[selectedVariant].node.price.currencyCode}
            </p>

            {node.description && (
              <p className="text-lg text-muted-foreground leading-relaxed">
                {node.description}
              </p>
            )}

            {/* Size Selection */}
            {node.options.length > 0 && node.options[0].values.length > 1 && (
              <div className="space-y-4">
                <label className="text-sm uppercase tracking-widest text-muted-foreground">
                  {node.options[0].name}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {node.variants.edges.map((variant, idx) => (
                    <button
                      key={variant.node.id}
                      onClick={() => setSelectedVariant(idx)}
                      className={`size-button px-6 py-2 border transition-all duration-300 ${
                        selectedVariant === idx
                          ? 'bg-foreground text-background active'
                          : 'bg-transparent text-foreground hover:bg-foreground/10'
                      }`}
                    >
                      {variant.node.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleAddToCart}
              size="lg"
              className="w-full bg-foreground text-background hover:bg-foreground/90 transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
            >
              ADD TO CART
            </Button>

            <div className="border-t border-foreground/20 pt-8 space-y-3 text-sm text-muted-foreground tracking-wide">
              <p>• 100% Cotton</p>
              <p>• Baggy Fit</p>
              <p>• High Quality Premium Fabric</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
