import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Weather Risk Advisory — Agronomic Risk Assessment',
  description:
    'Real-time weather risk advisory for farmers. Get AI-powered frost, drought, wind, and heavy rain alerts based on live weather data powered by the Weather-AI API.',
  keywords: ['weather', 'farming', 'risk advisory', 'agriculture', 'Kenya', 'frost', 'drought'],
  authors: [{ name: "Jo$h" }],
  openGraph: {
    title: 'Weather Risk Advisory',
    description: 'AI-powered agronomic risk assessment for farmers',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
