'use client';

import React from 'react';

export function Landscape() {
  return (
    <div className="splash-landscape" aria-hidden="true">
      <svg 
        viewBox="0 0 1440 280" 
        preserveAspectRatio="none" 
        className="landscape-svg"
      >
        {/* Distant Mountains / Hills */}
        <path 
          d="M0,180 Q360,110 720,190 T1440,150 L1440,280 L0,280 Z" 
          fill="#131e36" 
          opacity="0.5" 
        />
        
        {/* Midground Hills */}
        <path 
          d="M0,210 Q240,160 550,220 T1100,180 T1440,220 L1440,280 L0,280 Z" 
          fill="#0a1224" 
        />

        {/* Foreground Soil & Agricultural Crops Silhouette */}
        <path 
          d="M0,240 Q400,210 800,250 T1440,230 L1440,280 L0,280 Z" 
          fill="#040712" 
        />

        {/* Acacia Tree 1 (Left - Large) */}
        <g transform="translate(180, 150) scale(0.65)" fill="#040712">
          {/* Main Trunk */}
          <path d="M40,90 L45,35 Q45,20 30,10 Q60,15 65,30 L67,90 Z" />
          {/* Branch Splits */}
          <path d="M45,35 Q20,20 5,15 Q30,22 45,35 Z" />
          <path d="M45,35 Q60,15 85,8 Q65,22 45,35 Z" />
          <path d="M41,45 Q15,35 0,38 Q25,40 41,45 Z" />
          <path d="M46,40 Q75,32 95,36 Q68,36 46,40 Z" />
          {/* Canopy Layers */}
          <ellipse cx="5" cy="15" rx="35" ry="8" />
          <ellipse cx="85" cy="8" rx="45" ry="10" />
          <ellipse cx="0" cy="38" rx="25" ry="6" />
          <ellipse cx="95" cy="36" rx="30" ry="7" />
          <ellipse cx="45" cy="10" rx="40" ry="9" />
        </g>

        {/* Acacia Tree 2 (Right - Small) */}
        <g transform="translate(1150, 170) scale(0.45)" fill="#040712">
          {/* Trunk */}
          <path d="M40,90 L45,35 Q45,20 30,10 Q60,15 65,30 L67,90 Z" />
          {/* Branches */}
          <path d="M45,35 Q20,20 5,15 Q30,22 45,35 Z" />
          <path d="M45,35 Q60,15 85,8 Q65,22 45,35 Z" />
          {/* Canopies */}
          <ellipse cx="5" cy="15" rx="35" ry="8" />
          <ellipse cx="85" cy="8" rx="45" ry="10" />
          <ellipse cx="45" cy="10" rx="40" ry="9" />
        </g>

        {/* Small Maize/Corn Crop Sprigs along the Foreground (Repetitive silhouettes) */}
        <g fill="#040712" transform="translate(50, 235)">
          <path d="M0,15 Q-5,5 -10,0 Q-3,8 0,15 Q5,5 10,0 Q3,8 0,15 Z" />
          <path d="M0,15 Q0,0 2, -5 Q0,5 0,15 Z" />
        </g>
        <g fill="#040712" transform="translate(120, 238) scale(0.8)">
          <path d="M0,15 Q-5,5 -10,0 Q-3,8 0,15 Q5,5 10,0 Q3,8 0,15 Z" />
        </g>
        <g fill="#040712" transform="translate(280, 240) scale(1.1)">
          <path d="M0,15 Q-5,5 -10,0 Q-3,8 0,15 Q5,5 10,0 Q3,8 0,15 Z" />
          <path d="M0,15 Q0,0 2, -5 Q0,5 0,15 Z" />
        </g>
        <g fill="#040712" transform="translate(340, 236) scale(0.9)">
          <path d="M0,15 Q-5,5 -10,0 Q-3,8 0,15 Q5,5 10,0 Q3,8 0,15 Z" />
        </g>
        <g fill="#040712" transform="translate(680, 242) scale(1.2)">
          <path d="M0,15 Q-5,5 -10,0 Q-3,8 0,15 Q5,5 10,0 Q3,8 0,15 Z" />
          <path d="M0,15 Q0,0 2, -5 Q0,5 0,15 Z" />
        </g>
        <g fill="#040712" transform="translate(740, 240) scale(0.7)">
          <path d="M0,15 Q-5,5 -10,0 Q-3,8 0,15 Q5,5 10,0 Q3,8 0,15 Z" />
        </g>
        <g fill="#040712" transform="translate(920, 238) scale(1.0)">
          <path d="M0,15 Q-5,5 -10,0 Q-3,8 0,15 Q5,5 10,0 Q3,8 0,15 Z" />
          <path d="M0,15 Q0,0 2, -5 Q0,5 0,15 Z" />
        </g>
        <g fill="#040712" transform="translate(1050, 240) scale(0.95)">
          <path d="M0,15 Q-5,5 -10,0 Q-3,8 0,15 Q5,5 10,0 Q3,8 0,15 Z" />
        </g>
        <g fill="#040712" transform="translate(1310, 235) scale(1.1)">
          <path d="M0,15 Q-5,5 -10,0 Q-3,8 0,15 Q5,5 10,0 Q3,8 0,15 Z" />
          <path d="M0,15 Q0,0 2, -5 Q0,5 0,15 Z" />
        </g>
      </svg>
    </div>
  );
}
