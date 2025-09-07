import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
}

interface HeartParticlesProps {
  trigger: boolean;
  onComplete?: () => void;
}

export const HeartParticles = ({ trigger, onComplete }: HeartParticlesProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 40 - 20,
        y: Math.random() * 40 - 20,
      }));

      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="heart-particle"
          style={{
            left: `50%`,
            top: `50%`,
            transform: `translate(${particle.x}px, ${particle.y}px)`,
          }}
        />
      ))}
    </div>
  );
};