import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, LogIn, LogOut, Check } from "lucide-react";
import { useListSessions } from "@workspace/api-client-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);

  // Load read notifications from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("readNotifications");
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  // Fetch a small number of recent sessions to derive notifications
  const { data: response } = useListSessions({ page: 1, limit: 10 });

  const sessions = response?.data || [];

  // Derive notifications from sessions
  const notifications: { id: string; type: "login" | "logout"; time: string; text: string }[] = [];

  sessions.forEach((session) => {
    // Login event
    if (session.loginTime) {
      notifications.push({
        id: `login-${session.id}`,
        type: "login",
        time: session.loginTime,
        text: `${session.user?.name || "Agent"} started a session on ${session.device?.name || "Device"}`,
      });
    }
    // Logout event
    if (session.logoutTime && session.uploadStatus === "completed") {
      notifications.push({
        id: `logout-${session.id}`,
        type: "logout",
        time: session.logoutTime,
        text: `${session.user?.name || "Agent"} ended a session on ${session.device?.name || "Device"}`,
      });
    }
  });

  // Sort by time descending
  notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // Show top 5
  const recentNotifications = notifications.slice(0, 5);
  const unreadCount = recentNotifications.filter(n => !readIds.includes(n.id)).length;

  const markAllAsRead = () => {
    const allIds = recentNotifications.map(n => n.id);
    const newReadIds = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(newReadIds);
    localStorage.setItem("readNotifications", JSON.stringify(newReadIds));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white border-2 border-white">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-xl border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {unreadCount} New
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Mark read
            </button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              No recent notifications
            </div>
          ) : (
            recentNotifications.map((notif) => {
              const isRead = readIds.includes(notif.id);
              return (
                <div 
                  key={notif.id} 
                  className={cn(
                    "flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0",
                    !isRead ? "bg-indigo-50/30" : ""
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-full shrink-0",
                    notif.type === "login" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                  )}>
                    {notif.type === "login" ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 leading-tight">
                        {notif.type === "login" ? "User Logged In" : "User Logged Out"}
                      </p>
                      {!isRead && <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {notif.text}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      {formatDistanceToNow(new Date(notif.time), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
