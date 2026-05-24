import './globals.css';

export const metadata = {
  title: 'Expenditure Generator - KPK Schools',
  description: 'Monthly Reconciliation Statement Generator for KPK Government Schools',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
