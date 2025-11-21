interface MarqueeProps {
  text: string;
  speed?: number;
  className?: string;
}

export const Marquee = ({ 
  text, 
  speed = 40,
  className = "" 
}: MarqueeProps) => {
  // Duplicate text to create seamless loop
  const repeatedText = `${text} • `.repeat(20);

  return (
    <div className={`w-full overflow-hidden bg-foreground text-background ${className}`}>
      <div
        className="inline-block whitespace-nowrap py-3 animate-marquee"
        style={{
          animationDuration: `${speed}s`,
        }}
      >
        <span className="text-[10px] md:text-xs tracking-[0.3em] font-light uppercase">
          {repeatedText}
        </span>
      </div>
    </div>
  );
};
