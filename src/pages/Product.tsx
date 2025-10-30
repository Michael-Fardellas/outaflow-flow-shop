import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { storefrontApiRequest, STOREFRONT_PRODUCT_BY_HANDLE_QUERY, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

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
    toast.success("Added to cart");
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center pt-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center pt-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Product not found</h1>
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Shop
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const { node } = product;
  const price = parseFloat(node.variants.edges[selectedVariant].node.price.amount);

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 pb-12">
        <div className="container mx-auto px-4">
          <Link to="/" className="inline-flex items-center mb-8 hover:text-accent transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fade-in">
            <div className="space-y-4">
              {node.images.edges.map((image, idx) => (
                <div key={idx} className="aspect-square bg-secondary overflow-hidden">
                  <img
                    src={image.node.url}
                    alt={image.node.altText || node.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <h1 className="text-4xl font-bold uppercase tracking-wide">{node.title}</h1>
              
              <p className="text-2xl font-semibold">
                ${price.toFixed(2)} {node.variants.edges[selectedVariant].node.price.currencyCode}
              </p>

              {node.description && (
                <div className="prose prose-sm">
                  <p className="text-muted-foreground">{node.description}</p>
                </div>
              )}

              {node.options.length > 0 && node.options[0].values.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {node.options[0].name}
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {node.variants.edges.map((variant, idx) => (
                      <Button
                        key={variant.node.id}
                        variant={selectedVariant === idx ? "default" : "outline"}
                        onClick={() => setSelectedVariant(idx)}
                      >
                        {variant.node.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleAddToCart}
                size="lg"
                className="w-full"
              >
                Add to Cart
              </Button>

              <div className="border-t pt-6 space-y-2 text-sm text-muted-foreground">
                <p>• 100% Cotton</p>
                <p>• Baggy Fit</p>
                <p>• High Quality Premium Fabric</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
