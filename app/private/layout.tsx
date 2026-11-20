import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Private shelf — Knowledge Hub',
  robots: { index: false, follow: false },
};

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  // kh-private (globals.css): light colour scheme and Markdown styles for this Tailwind layer only.
  return <div className="kh-private min-h-screen bg-gray-50">{children}</div>;
}
