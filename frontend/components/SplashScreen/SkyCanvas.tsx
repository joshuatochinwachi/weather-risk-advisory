'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SplashPhase } from './useSplashPhase';

interface SkyCanvasProps {
  phase: SplashPhase;
  lat?: number;
  lon?: number;
}

interface Particle {
  x: number;
  y: number;
  length: number; // For rain drops
  radius: number; // For snow flakes
  speed: number;
  opacity: number;
  drift: number; // For snow horizontal movement
}

export function SkyCanvas({ phase, lat, lon }: SkyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we are within the Mt Kenya snow range (Easter Egg)
  // Mt Kenya coordinates roughly lat: -0.1521, lon: 37.3084
  const isSnow =
    lat !== undefined &&
    lon !== undefined &&
    Math.abs(lat - -0.1521) < 0.15 &&
    Math.abs(lon - 37.3084) < 0.15;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const count = isMobile ? (isSnow ? 30 : 50) : (isSnow ? 60 : 100);
    const width = canvas.width;
    const height = canvas.height;

    // Initialize particles (drops/flakes)
    const particles: Particle[] = Array.from({ length: count }, () => {
      const pWidth = canvas.width || window.innerWidth;
      const pHeight = canvas.height || window.innerHeight;
      return {
        x: Math.random() * pWidth,
        y: Math.random() * pHeight,
        length: 8 + Math.random() * 12,
        radius: 1.5 + Math.random() * 2.0,
        speed: isSnow ? 1.0 + Math.random() * 1.5 : 5.0 + Math.random() * 4.0,
        opacity: 0.15 + Math.random() * 0.45,
        drift: Math.random() * 2 - 1,
      };
    });

    let animationId: number;
    let currentIntensity = 0;

    const tick = () => {
      // Determine target intensity based on current phase
      let targetIntensity = 0;
      if (phase === 'rain') {
        targetIntensity = 1.0;
      } else if (phase === 'clearing') {
        targetIntensity = 0.0;
      } else if (phase === 'gathering') {
        targetIntensity = 0.05; // Faint drops starting to form
      }

      // Smooth intensity transition (lerp)
      currentIntensity += (targetIntensity - currentIntensity) * 0.08;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (currentIntensity > 0.005) {
        if (isSnow) {
          // Draw Snow
          ctx.fillStyle = 'rgba(255, 255, 255, 1)';
          for (const p of particles) {
            ctx.globalAlpha = p.opacity * currentIntensity;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();

            // Update position
            p.y += p.speed;
            p.x += Math.sin(p.y * 0.01 + p.drift) * 0.5;

            // Boundary checks
            if (p.y > canvas.height) {
              p.y = -p.radius * 2;
              p.x = Math.random() * canvas.width;
            }
            if (p.x > canvas.width) p.x = 0;
            if (p.x < 0) p.x = canvas.width;
          }
        } else {
          // Draw Rain
          ctx.strokeStyle = 'rgba(143, 184, 255, 0.7)';
          ctx.lineWidth = 1.5;
          for (const p of particles) {
            ctx.globalAlpha = p.opacity * currentIntensity;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x, p.y + p.length);
            ctx.stroke();

            // Update position
            p.y += p.speed;

            // Boundary checks
            if (p.y > canvas.height) {
              p.y = -p.length;
              p.x = Math.random() * canvas.width;
            }
          }
        }
      }

      animationId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [phase, isMobile, isSnow]);

  return <canvas ref={canvasRef} className="sky-canvas" />;
}
