import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { storefrontApiRequest, STOREFRONT_PRODUCTS_QUERY, ShopifyProduct } from "@/lib/shopify";
import { Loader2 } from "lucide-react";
import logo from "@/assets/outaflow-logo.png";

const Index = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, {
          first: 20,
        });
        
        if (data?.data?.products?.edges) {
          setProducts(data.data.products.edges);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <>
      <Header />
      
      <main className="min-h-screen pt-20">
        <section className="container mx-auto px-4 py-20 text-center animate-fade-in">
          <img src={logo} alt="Outaflow" className="h-32 w-auto mx-auto mb-8" />
          <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter mb-4">
            Outaflow
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Premium streetwear. High quality basics. Timeless designs.
          </p>
        </section>

        <section className="container mx-auto px-4 py-12">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 animate-fade-in">
              <h2 className="text-2xl font-bold mb-4">No products found</h2>
              <p className="text-muted-foreground mb-8">
                Products will appear here once they're added to your store.
              </p>
              <p className="text-sm text-muted-foreground">
                Tell me what product you'd like to create and I'll add it for you!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.map((product) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Outaflow. All rights reserved.</p>
          <a 
            href="https://instagram.com/outaflow0" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            @outaflow0
          </a>
        </div>
      </footer>
    </>
  );
};

export default Index;
