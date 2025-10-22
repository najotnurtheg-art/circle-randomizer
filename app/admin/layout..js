// app/admin/layout.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AdminLayout({ children }) {
  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      {children}
    </div>
  );
}
