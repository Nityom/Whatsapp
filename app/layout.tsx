import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Svaasth Connect – Svaasth HMS Operations',
  description:
    'Official Svaasth Connect for Svaasth HMS Hospital Management System. 24/7 Appointments, Prescriptions, Live Two-Way Chat, Bulk Broadcasts, and Patient Care.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#f8faf8] text-[#173d37] antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
