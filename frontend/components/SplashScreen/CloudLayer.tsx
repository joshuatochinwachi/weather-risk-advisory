'use client';

import React from 'react';

export function CloudLayer() {
  return (
    <div className="cloud-layer" aria-hidden="true">
      {/* Cloud 1 */}
      <svg className="cloud-svg-1" viewBox="0 0 200 100" preserveAspectRatio="none">
        <ellipse cx="100" cy="50" rx="90" ry="40" />
      </svg>
      
      {/* Cloud 2 */}
      <svg className="cloud-svg-2" viewBox="0 0 200 100" preserveAspectRatio="none">
        <ellipse cx="100" cy="50" rx="95" ry="45" />
      </svg>

      {/* Cloud 3 */}
      <svg className="cloud-svg-3" viewBox="0 0 200 100" preserveAspectRatio="none">
        <ellipse cx="100" cy="50" rx="80" ry="35" />
      </svg>
    </div>
  );
}
