import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ShoppingCart, Minus, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

export const CartDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [cartPulse, setCartPulse] = useState(false);
  const { 
    items, 
    isLoading, 
    updateQuantity, 
    removeItem, 
    createCheckout 
  } = useCartStore();
  
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (parseFloat(item.price.amount) * item.quantity), 0);

  // Pulse cart icon when items change
  useEffect(() => {
    if (totalItems > 0) {
      setCartPulse(true);
      const timer = setTimeout(() => setCartPulse(false), 400);
      return () => clearTimeout(timer);
    }
  }, [totalItems]);

  const handleCheckout = async () => {
    // Open window immediately to avoid popup blocker
    const checkoutWindow = window.open('about:blank', '_blank');
    
    try {
      await createCheckout();
      const checkoutUrl = useCartStore.getState().checkoutUrl;
      if (checkoutUrl && checkoutWindow) {
        checkoutWindow.location.href = checkoutUrl;
        setIsOpen(false);
      } else {
        checkoutWindow?.close();
        toast.error('Unable to create checkout', {
          description: 'Please try again or contact support if the issue persists.',
          position: 'top-center',
        });
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      checkoutWindow?.close();
      toast.error('Checkout failed', {
        description: 'Please try again or contact support.',
        position: 'top-center',
      });
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            aria-label="Open cart"
            variant="ghost" 
            size="icon" 
            className={`relative w-10 h-10 rounded-full border border-foreground/20 hover:border-foreground/40 bg-transparent hover:bg-foreground/5 transition-all duration-500 ${cartPulse ? 'cart-pulse' : ''} group`}
          >
            <ShoppingCart className="h-4 w-4 text-foreground/70 group-hover:text-foreground transition-colors" />
            {totalItems > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[8px] font-light bg-foreground text-background border-0">
                {totalItems}
              </Badge>
            )}
            {/* Micro glow on hover */}
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
              <div className="absolute inset-0 bg-foreground/5 rounded-full blur-sm" />
            </div>
          </Button>
        </SheetTrigger>
      
        <SheetContent hideOverlay className="w-full sm:max-w-md flex flex-col h-full bg-background border-l border-foreground/10">
          <SheetHeader className="flex-shrink-0 border-b border-foreground/5 pb-6">
            <SheetTitle className="text-lg font-extralight tracking-[0.3em] uppercase opacity-80">Cart</SheetTitle>
            <SheetDescription className="text-[10px] font-light tracking-wide opacity-50">
              {totalItems === 0 ? "Your cart is empty" : `${totalItems} item${totalItems !== 1 ? 's' : ''}`}
            </SheetDescription>
          </SheetHeader>
        
          <div className="flex flex-col flex-1 pt-8 min-h-0">
            {items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center opacity-40">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-4 opacity-30" />
                  <p className="text-xs font-light tracking-wide">Your cart is empty</p>
                </div>
              </div>
            ) : (
              <>
                {/* Single-column strict layout */}
                <div className="flex-1 overflow-y-auto pr-2 min-h-0 space-y-6">
                  {items.map((item, index) => (
                    <div key={item.variantId} className={`space-y-4 ${index !== items.length - 1 ? 'pb-6 border-b border-foreground/5' : ''}`}>
                      {/* Image */}
                      <div className="w-full aspect-square bg-foreground/[0.02] overflow-hidden">
                        {item.product.node.images?.edges?.[0]?.node && (
                          <img
                            src={item.product.node.images.edges[0].node.url}
                            alt={item.product.node.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      
                      {/* Product info */}
                      <div className="space-y-2">
                        <h4 className="font-light text-sm tracking-[0.15em] uppercase opacity-90">{item.product.node.title}</h4>
                        <p className="text-[10px] font-light tracking-wide opacity-40">
                          {item.selectedOptions.map(option => option.value).join(' • ')}
                        </p>
                        <p className="text-sm font-extralight opacity-70">
                          ${parseFloat(item.price.amount).toFixed(2)}
                        </p>
                      </div>
                      
                      {/* Quantity controls and remove */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center border border-foreground/10 hover:border-foreground/30 transition-all duration-300 text-foreground/50 hover:text-foreground"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-light">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center border border-foreground/10 hover:border-foreground/30 transition-all duration-300 text-foreground/50 hover:text-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.variantId)}
                          className="text-[10px] tracking-[0.2em] uppercase font-light opacity-30 hover:opacity-70 transition-opacity duration-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Checkout section */}
                <div className="flex-shrink-0 space-y-6 pt-8 border-t border-foreground/5 bg-background">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] uppercase tracking-[0.3em] font-light opacity-40">Total</span>
                    <span className="text-2xl font-extralight tracking-wider opacity-90">
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>
                  
                  <Button 
                    onClick={handleCheckout}
                    className="w-full bg-transparent border border-foreground/20 text-foreground hover:bg-foreground/5 hover:border-foreground/40 transition-all duration-500 h-12 text-xs tracking-[0.25em] font-light" 
                    disabled={items.length === 0 || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        <span className="tracking-[0.2em]">Creating...</span>
                      </>
                    ) : (
                      <>
                        Proceed to Checkout
                        <ExternalLink className="w-3 h-3 ml-3 opacity-40" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
