import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

interface ProductCardProps {
  product: ShopifyProduct;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const addItem = useCartStore(state => state.addItem);
  const { node } = product;

  const handleAddToCart = () => {
    const firstVariant = node.variants.edges[0].node;
    
    const cartItem = {
      product,
      variantId: firstVariant.id,
      variantTitle: firstVariant.title,
      price: firstVariant.price,
      quantity: 1,
      selectedOptions: firstVariant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success("Added to cart");
  };

  const price = parseFloat(node.priceRange.minVariantPrice.amount);
  const imageUrl = node.images.edges[0]?.node.url;

  return (
    <div className="group animate-fade-in">
      <Link to={`/product/${node.handle}`}>
        <div className="aspect-square bg-secondary overflow-hidden mb-4 relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={node.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
        </div>
      </Link>
      
      <div className="space-y-2">
        <Link to={`/product/${node.handle}`}>
          <h3 className="font-medium text-lg uppercase tracking-wide hover:text-accent transition-colors">
            {node.title}
          </h3>
        </Link>
        
        <p className="text-sm text-muted-foreground">
          ${price.toFixed(2)} {node.priceRange.minVariantPrice.currencyCode}
        </p>
        
        <Button 
          onClick={handleAddToCart}
          className="w-full"
          variant="outline"
        >
          Add to Cart
        </Button>
      </div>
    </div>
  );
};
