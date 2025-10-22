// app/layout.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
