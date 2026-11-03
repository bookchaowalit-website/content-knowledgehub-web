import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Private shelf — Knowledge Hub',
  robots: { index: false, follow: false },
};

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
