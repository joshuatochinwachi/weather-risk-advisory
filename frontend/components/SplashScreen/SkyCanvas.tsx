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

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
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

    // Slightly higher counts for better visual impact
    const count = isMobile ? (isSnow ? 40 : 80) : (isSnow ? 90 : 150);
    
    // Initialize particles (drops/flakes)
    const particles: Particle[] = Array.from({ length: count }, () => {
      const pWidth = canvas.width || window.innerWidth;
      const pHeight = canvas.height || window.innerHeight;
      return {
        x: Math.random() * pWidth,
        y: Math.random() * pHeight,
        length: 12 + Math.random() * 18, // Longer, more dramatic rain streaks
        radius: 1.5 + Math.random() * 2.5,
        speed: isSnow ? 0.8 + Math.random() * 1.2 : 8.0 + Math.random() * 6.0, // Faster rain for dramatic action
        opacity: 0.25 + Math.random() * 0.5, // More opaque
        drift: Math.random() * 2 - 1,
      };
    });

    let ripples: Ripple[] = [];
    let animationId: number;
    let currentIntensity = 0;

    // Diagonal angle for wind-driven rain
    const windAngle = -2.5; 

    const tick = () => {
      // Determine target intensity based on current phase
      let targetIntensity = 0;
      if (phase === 'rain') {
        targetIntensity = 1.0;
      } else if (phase === 'clearing') {
        targetIntensity = 0.0;
      } else if (phase === 'gathering') {
        targetIntensity = 0.35; // Faint drops are clearly visible and active
      } else if (phase === 'dawn') {
        targetIntensity = 0.05; // Extremely faint starting hints
      }

      // Smooth intensity transition (lerp)
      currentIntensity += (targetIntensity - currentIntensity) * 0.06;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (currentIntensity > 0.005) {
        if (isSnow) {
          // Draw Snow
          ctx.fillStyle = '#ffffff';
          for (const p of particles) {
            ctx.globalAlpha = p.opacity * currentIntensity;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();

            // Update position
            p.y += p.speed;
            p.x += Math.sin(p.y * 0.008 + p.drift) * 0.8;

            // Boundary checks
            if (p.y > canvas.height) {
              p.y = -p.radius * 2;
              p.x = Math.random() * canvas.width;
            }
            if (p.x > canvas.width) p.x = 0;
            if (p.x < 0) p.x = canvas.width;
          }
        } else {
          // Draw Rain with Wind Angle
          ctx.strokeStyle = 'rgba(178, 209, 255, 0.65)';
          ctx.lineWidth = 1.5;
          for (const p of particles) {
            ctx.globalAlpha = p.opacity * currentIntensity;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            // Draw diagonal drop using windAngle
            ctx.lineTo(p.x + windAngle, p.y + p.length);
            ctx.stroke();

            // Update position
            p.y += p.speed;
            p.x += windAngle * (p.speed / 10); // Match horizontal movement to speed

            // Boundary checks
            if (p.y > canvas.height) {
              // Trigger a splash ripple with small probability or when hitting bottom
              if (Math.random() < 0.25 && ripples.length < 30) {
                ripples.push({
                  x: p.x,
                  y: canvas.height - 2 - Math.random() * 8, // slight variation in hit height
                  radius: 1,
                  maxRadius: 6 + Math.random() * 8,
                  opacity: p.opacity * currentIntensity * 0.5
                });
              }
              p.y = -p.length;
              p.x = Math.random() * (canvas.width - windAngle * 2) + Math.abs(windAngle);
            }
          }

          // Draw & Update Ripples
          ctx.lineWidth = 1.0;
          ripples = ripples.filter((r) => {
            ctx.strokeStyle = `rgba(199, 219, 255, ${r.opacity})`;
            ctx.beginPath();
            ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.25, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Update ripple parameters
            r.radius += 0.6;
            r.opacity -= 0.035;

            return r.opacity > 0;
          });
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
