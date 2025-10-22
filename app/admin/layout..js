// app/admin/layout.js
export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function AdminLayout({ children }) {
  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      {children}
    </div>
  );
}
