import { useEffect, useState } from 'react';
import { Heart, Flower2 } from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  delay: number;
}

interface ParticleEffectProps {
  type: 'heart' | 'butterfly' | 'flower';
  color: string;
  trigger: number;
  originX?: number;
  originY?: number;
}

export const ParticleEffect = ({ type, color, trigger, originX = window.innerWidth / 2, originY = window.innerHeight / 2 }: ParticleEffectProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger === 0) return;

    const newParticles: Particle[] = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 200 - 100,
      y: Math.random() * 200 - 100,
      rotation: Math.random() * 360,
      delay: i * 50,
    }));

    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
    }, 2000);

    return () => clearTimeout(timer);
  }, [trigger]);

  const renderIcon = (particle: Particle) => {
    const iconProps = {
      className: "w-8 h-8",
      strokeWidth: 2,
      style: { color }
    };

    if (type === 'heart') {
      return <Heart {...iconProps} fill={color} />;
    } else if (type === 'flower') {
      return <Flower2 {...iconProps} />;
    } else {
      // Butterfly SVG
      return (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill={color}
          style={{ color }}
        >
          <path d="M12 4C10.5 1.5 7.5 0 4 0c0 0 0 9 8 9m0-5C13.5 1.5 16.5 0 20 0c0 0 0 9-8 9m0 0v6m0 0C10.5 17.5 7.5 19 4 19c0 0 0-9 8-9m0 0c1.5 2.5 4.5 4 8 4 0 0 0-9-8-9" />
        </svg>
      );
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[70]">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: `${originX}px`,
            top: `${originY}px`,
            animation: `particle-pop 1.5s ease-out forwards`,
            animationDelay: `${particle.delay}ms`,
            '--particle-x': `${particle.x}px`,
            '--particle-y': `${particle.y}px`,
            '--particle-rotation': `${particle.rotation}deg`,
          } as any}
        >
          {renderIcon(particle)}
        </div>
      ))}
    </div>
  );
};
