import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ScootyGo Rentals - WhatsApp Chatbot Demo',
  description: 'Simple Scooty Rental WhatsApp Chatbot Demo for Pune, Maharashtra with fixed flow and webhook integration.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
