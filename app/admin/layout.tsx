import Sidebar from "../../components/admin/Sidebar";

export const metadata = {
  title: "Svaasth Connect – Admin",
  description: "Admin dashboard for Svaasth Connect WhatsApp bot",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f8faf8]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
