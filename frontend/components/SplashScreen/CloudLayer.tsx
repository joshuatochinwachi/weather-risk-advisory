'use client';

import React from 'react';

export function CloudLayer() {
  return (
    <div className="cloud-layer" aria-hidden="true">
      {/* Cloud 1 - Volumetric left cloud */}
      <svg className="cloud-svg-1" viewBox="0 0 240 120" preserveAspectRatio="none">
        <ellipse cx="70" cy="70" rx="50" ry="30" opacity="0.5" />
        <ellipse cx="120" cy="55" rx="70" ry="45" opacity="0.85" />
        <ellipse cx="170" cy="70" rx="55" ry="35" opacity="0.65" />
        <ellipse cx="120" cy="75" rx="90" ry="30" opacity="0.95" />
      </svg>
      
      {/* Cloud 2 - Volumetric right cloud */}
      <svg className="cloud-svg-2" viewBox="0 0 260 130" preserveAspectRatio="none">
        <ellipse cx="80" cy="75" rx="60" ry="35" opacity="0.6" />
        <ellipse cx="135" cy="60" rx="80" ry="50" opacity="0.9" />
        <ellipse cx="190" cy="75" rx="65" ry="40" opacity="0.7" />
        <ellipse cx="135" cy="80" rx="100" ry="35" opacity="0.95" />
      </svg>

      {/* Cloud 3 - Volumetric top-center cloud */}
      <svg className="cloud-svg-3" viewBox="0 0 200 100" preserveAspectRatio="none">
        <ellipse cx="60" cy="60" rx="40" ry="25" opacity="0.5" />
        <ellipse cx="100" cy="45" rx="55" ry="35" opacity="0.8" />
        <ellipse cx="140" cy="60" rx="45" ry="28" opacity="0.6" />
        <ellipse cx="100" cy="65" rx="75" ry="25" opacity="0.9" />
      </svg>
    </div>
  );
}
