import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Video, 
  Users, 
  MonitorSmartphone, 
  HardDrive, 
  FileText,
  ClipboardList,
  Settings, 
  Hexagon,
  Menu,
  ChevronDown,
  Bell,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sessions", label: "Live Sessions", icon: Video },
  { href: "/users", label: "Users", icon: Users },
  { href: "/devices", label: "Devices", icon: MonitorSmartphone },
  { href: "/storage", label: "Storage", icon: HardDrive },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/audit-logs", label: "Audit Logs", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 z-20 shadow-sm transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-64" : "w-0 overflow-hidden border-r-0"
        )}
      >
        <div className="flex flex-col h-full min-w-[16rem]">
          {/* Logo */}
          <div className="h-20 flex items-center px-6">
            <Link href="/dashboard" className="flex items-center gap-3 text-slate-900 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Hexagon className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight tracking-tight">MonitorPro</span>
                <span className="text-[10px] text-slate-500 font-medium">Remote Monitoring</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="px-4 py-2 space-y-1 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location === item.href || location.startsWith(item.href + "/");
              const Icon = item.icon;
              
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive 
                      ? "bg-indigo-50 text-indigo-600" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="p-4 flex flex-col gap-4">
            <button 
              onClick={() => {
                localStorage.removeItem("token");
                setLocation("/login");
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
            <div className="px-2 pb-2 space-y-1">
              <p className="text-[10px] text-slate-400">© 2025 MonitorPro</p>
              <p className="text-[10px] text-slate-400">All rights reserved.</p>
              <p className="text-[10px] text-slate-400 pt-1">
                Design by <a href="https://www.cybaemtech.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 font-medium transition-colors">Cybaemtech</a>
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#F8FAFC]">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10 transition-all duration-300 ease-in-out">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-5">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-50">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="flex items-center gap-3 cursor-pointer group pl-1">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                AU
              </div>
              <div className="flex flex-col hidden sm:flex">
                <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">Admin User</span>
                <span className="text-[11px] text-slate-500">Administrator</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-[1400px] mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
