'use client';

import React, { useEffect, useRef } from 'react';
import { SplashPhase } from './useSplashPhase';

interface SkyCanvasProps {
  phase: SplashPhase;
  lat?: number;
  lon?: number;
}

interface Particle {
  x: number;
  y: number;
  length: number;
  radius: number;
  speed: number;
  opacity: number;
  drift: number;
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

  const isSnow =
    lat !== undefined &&
    lon !== undefined &&
    Math.abs(lat - -0.1521) < 0.15 &&
    Math.abs(lon - 37.3084) < 0.15;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resizing directly in this effect to ensure canvas is always sized correctly
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const isMobile = window.innerWidth < 768;
    const count = isMobile ? (isSnow ? 40 : 80) : (isSnow ? 90 : 160);
    const pWidth = window.innerWidth;
    const pHeight = window.innerHeight;

    // Initialize particles
    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * pWidth,
      y: Math.random() * pHeight,
      length: 14 + Math.random() * 20,
      radius: 1.5 + Math.random() * 2.5,
      speed: isSnow ? 0.8 + Math.random() * 1.2 : 9.0 + Math.random() * 6.0,
      opacity: 0.3 + Math.random() * 0.5,
      drift: Math.random() * 2 - 1,
    }));

    let ripples: Ripple[] = [];
    let animationId: number;
    let currentIntensity = 0;
    const windAngle = -2.5;

    const tick = () => {
      let targetIntensity = 0;
      if (phase === 'rain') {
        targetIntensity = 1.0;
      } else if (phase === 'clearing') {
        targetIntensity = 0.0;
      } else if (phase === 'gathering') {
        targetIntensity = 0.45; // Increased gathering intensity for visibility
      } else if (phase === 'dawn') {
        targetIntensity = 0.05;
      }

      currentIntensity += (targetIntensity - currentIntensity) * 0.06;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (currentIntensity > 0.005) {
        if (isSnow) {
          ctx.fillStyle = '#ffffff';
          for (const p of particles) {
            ctx.globalAlpha = p.opacity * currentIntensity;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();

            p.y += p.speed;
            p.x += Math.sin(p.y * 0.008 + p.drift) * 0.8;

            if (p.y > canvas.height) {
              p.y = -p.radius * 2;
              p.x = Math.random() * canvas.width;
            }
            if (p.x > canvas.width) p.x = 0;
            if (p.x < 0) p.x = canvas.width;
          }
        } else {
          ctx.strokeStyle = 'rgba(180, 215, 255, 0.75)'; // Lighter, more visible rain color
          ctx.lineWidth = 1.8; // Slightly thicker lines for visibility on high-res monitors
          for (const p of particles) {
            ctx.globalAlpha = p.opacity * currentIntensity;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + windAngle, p.y + p.length);
            ctx.stroke();

            p.y += p.speed;
            p.x += windAngle * (p.speed / 10);

            if (p.y > canvas.height) {
              if (Math.random() < 0.3 && ripples.length < 30) {
                ripples.push({
                  x: p.x,
                  y: canvas.height - 2 - Math.random() * 8,
                  radius: 1,
                  maxRadius: 7 + Math.random() * 9,
                  opacity: p.opacity * currentIntensity * 0.6,
                });
              }
              p.y = -p.length;
              p.x = Math.random() * (canvas.width - windAngle * 2) + Math.abs(windAngle);
            }
          }

          ctx.lineWidth = 1.2;
          ripples = ripples.filter((r) => {
            ctx.strokeStyle = `rgba(205, 225, 255, ${r.opacity})`;
            ctx.beginPath();
            ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.25, 0, 0, Math.PI * 2);
            ctx.stroke();

            r.radius += 0.65;
            r.opacity -= 0.035;

            return r.opacity > 0;
          });
        }
      }

      animationId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [phase, isSnow]);

  return <canvas ref={canvasRef} className="sky-canvas" />;
}
