import { useState, useEffect, useRef } from "react";

interface ScrambleTextProps {
  text: string;
  className?: string;
  scrambleOnLoad?: boolean;
  scrambleOnHover?: boolean;
  scrambleSpeed?: number;
}

const CHARACTERS = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`";

export const ScrambleText = ({
  text,
  className = "",
  scrambleOnLoad = true,
  scrambleOnHover = false,
  scrambleSpeed = 30,
}: ScrambleTextProps) => {
  const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);
  const hasScrambledRef = useRef(false);

  const scramble = () => {
    if (isScrambling) return;
    
    setIsScrambling(true);
    let iteration = 0;
    const maxIterations = text.length;

    const interval = setInterval(() => {
      setDisplayText((prev) =>
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < iteration) {
              return text[index];
            }
            return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
          })
          .join("")
      );

      iteration += 1 / 3;

      if (iteration >= maxIterations) {
        clearInterval(interval);
        setDisplayText(text);
        setIsScrambling(false);
      }
    }, scrambleSpeed);
  };

  useEffect(() => {
    if (scrambleOnLoad && !hasScrambledRef.current) {
      hasScrambledRef.current = true;
      const timeout = setTimeout(() => {
        scramble();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [scrambleOnLoad]);

  const handleMouseEnter = () => {
    if (scrambleOnHover) {
      scramble();
    }
  };

  return (
    <span
      className={className}
      onMouseEnter={handleMouseEnter}
      style={{ display: "inline-block", minHeight: "1em" }}
    >
      {displayText}
    </span>
  );
};
