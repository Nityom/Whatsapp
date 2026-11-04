import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cortex Hospital – AI WhatsApp Assistant',
  description:
    'Official AI-Powered WhatsApp Virtual Assistant for Cortex Hospital, Aarti Chowk, Wardha. 24/7 Appointments, Prescriptions, Billing, and Patient Care.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
