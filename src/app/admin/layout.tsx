import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-100 print:block print:bg-white">
      <div className="print:hidden">
        <AdminSidebar />
      </div>
      <main className="flex-1 overflow-auto print:overflow-visible">{children}</main>
    </div>
  );
}
