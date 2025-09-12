import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext'; // ⭐️ 1. Import

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Shirt Shop',
  description: 'Your one-stop shop for cool shirts.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}