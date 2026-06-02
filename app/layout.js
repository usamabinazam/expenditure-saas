import './globals.css';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const metadata = {
  title: 'Expenditure Generator - KPK Schools',
  description: 'Monthly Reconciliation Statement Generator for KPK Government Schools',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Floating WhatsApp button - shows on ALL pages */}
        <WhatsAppFloat />
      </body>
    </html>
  );
}
