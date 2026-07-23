import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  Calendar, 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown, 
  ShieldCheck, 
  Activity, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  Eye, 
  ClipboardList, 
  User, 
  Server, 
  Globe, 
  Laptop, 
  Clock, 
  Shield, 
  ArrowUpRight,
  Filter,
  Loader2
} from "lucide-react";


import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";

export interface AuditLog {
  id: string;
  timestamp: string;
  isoDate: string;
  userName: string;
  userEmail: string;
  userRole: "Admin" | "Manager" | "System" | "User";
  module: "Authentication" | "Users" | "Devices" | "Live Sessions" | "Recordings" | "Storage" | "Reports" | "Settings" | "User Management" | "Rules & Policies" | "System";
  action: string;
  details: string;
  deviceName: string;
  deviceBrowser: string;
  status: "success" | "warning" | "failed";
  metadata: Record<string, string>;
}

type SortField = "timestamp" | "userName" | "module" | "action" | "status";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3.5 h-3.5 ml-1 text-slate-300 inline" />;
  return dir === "asc"
    ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-indigo-600 inline" />
    : <ChevronDown className="w-3.5 h-3.5 ml-1 text-indigo-600 inline" />;
}

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const limit = 10;

  // React Query fetch from backend REST API
  const { data: apiData, isLoading } = useQuery({
    queryKey: ["audit-logs", page, limit, search, moduleFilter, actionFilter, statusFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        module: moduleFilter,
        action: actionFilter,
        status: statusFilter,
        dateRange,
      });
      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    }
  });

  const logsSource: AuditLog[] = useMemo(() => {
    if (!apiData?.logs || !Array.isArray(apiData.logs)) return [];
    return apiData.logs.map((item: any) => ({

      id: item.logId || `LOG-${item.id}`,
      timestamp: item.timestamp ? new Date(item.timestamp).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "Jul 21, 2026 09:00:00",
      isoDate: item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString(),
      userName: item.user ? item.user.split("(")[0].trim() : "Admin User",
      userEmail: item.user && item.user.includes("(") ? item.user.split("(")[1].replace(")", "").trim() : "admin@monitorpro.io",
      userRole: item.role === "Administrator" ? "Admin" : item.role || "Admin",
      module: item.module || "Settings",
      action: item.action || "System Action",
      details: item.details || "",
      deviceName: item.deviceName || "DELL-LATITUDE-5440",
      deviceBrowser: "Chrome 126.0 (Windows 11)",
      status: item.status || "success",
      metadata: item.metadata || { "Target Module": item.module, "Action Status": item.status || "success" }
    }));
  }, [apiData]);

  // Filter logs based on search & filters
  const filteredLogs = useMemo(() => {
    return logsSource.filter((log) => {

      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesId = log.id.toLowerCase().includes(query);
        const matchesUser = log.userName.toLowerCase().includes(query) || log.userEmail.toLowerCase().includes(query);
        const matchesDetails = log.details.toLowerCase().includes(query);
        const matchesDevice = log.deviceName.toLowerCase().includes(query);
        if (!matchesId && !matchesUser && !matchesDetails && !matchesDevice) {
          return false;
        }
      }

      // Date Range Filter
      if (dateRange !== "all") {
        const logDate = new Date(log.isoDate);
        const now = new Date("2026-07-21T23:59:59Z");
        if (dateRange === "today") {
          const todayStr = "2026-07-21";
          if (!log.isoDate.startsWith(todayStr)) return false;
        } else if (dateRange === "7days") {
          const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        } else if (dateRange === "30days") {
          const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) return false;
        }
      }

      // Module Filter
      if (moduleFilter !== "all" && log.module !== moduleFilter) {
        return false;
      }

      // Action Filter
      if (actionFilter !== "all" && log.action !== actionFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter !== "all" && log.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [logsSource, search, dateRange, moduleFilter, actionFilter, statusFilter]);

  // Sort logs
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      let va: any, vb: any;
      if (sortField === "timestamp") {
        va = new Date(a.isoDate).getTime();
        vb = new Date(b.isoDate).getTime();
      } else if (sortField === "userName") {
        va = a.userName;
        vb = b.userName;
      } else if (sortField === "module") {
        va = a.module;
        vb = b.module;
      } else if (sortField === "action") {
        va = a.action;
        vb = b.action;
      } else if (sortField === "status") {
        va = a.status;
        vb = b.status;
      }

      if (typeof va === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [filteredLogs, sortField, sortDir]);

  // Paginated logs
  const total = sortedLogs.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const currentLogs = useMemo(() => {
    const start = (page - 1) * limit;
    return sortedLogs.slice(start, start + limit);
  }, [sortedLogs, page, limit]);

  // Summary counts calculated from live API response
  const summary = useMemo(() => {
    if (apiData?.summary) {
      return {
        totalLogs: apiData.summary.totalLogs ?? 0,
        adminActions: apiData.summary.adminActions ?? 0,
        systemEvents: apiData.summary.systemEvents ?? 0,
        failedActions: apiData.summary.failedAttempts ?? 0,
      };
    }
    const totalLogs = logsSource.length;
    const adminActions = logsSource.filter(l => l.userRole === "Admin" || l.userRole === "System").length;
    const systemEvents = logsSource.filter(l => l.userRole === "System").length;
    const failedActions = logsSource.filter(l => l.status === "failed").length;
    return { totalLogs, adminActions, systemEvents, failedActions };
  }, [apiData, logsSource]);


  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const hasActiveFilters = Boolean(
    search || dateRange !== "all" || moduleFilter !== "all" || actionFilter !== "all" || statusFilter !== "all"
  );

  const clearFilters = () => {
    setSearch("");
    setDateRange("all");
    setModuleFilter("all");
    setActionFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track system events, administrative actions, security compliance, and user operations.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3.5 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-600" />
            {total} Log Entries
          </div>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Logs Card */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Logs</span>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-slate-900">{summary.totalLogs}</div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                <span className="text-emerald-600 font-semibold flex items-center">
                  +12% <ArrowUpRight className="w-3 h-3" />
                </span> 
                vs last week
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Admin Actions Card */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Admin Actions</span>
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-slate-900">{summary.adminActions}</div>
              <p className="text-xs text-slate-500 mt-1 font-medium">Privileged user changes</p>
            </div>
          </CardContent>
        </Card>

        {/* System Events Card */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">System Events</span>
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-slate-900">{summary.systemEvents}</div>
              <p className="text-xs text-slate-500 mt-1 font-medium">Automated agent & background tasks</p>
            </div>
          </CardContent>
        </Card>

        {/* Failed Actions Card */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Failed Actions</span>
              <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-slate-900">{summary.failedActions}</div>
              <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                Requires investigation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table & Filters Card */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
        {/* Filters Bar */}
        <div className="p-5 border-b border-slate-100 bg-white space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by log ID, user, device name, or details..."
                className="pl-9 h-10 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-lg text-sm"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            {/* Date Range Picker */}
            <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setPage(1); }}>
              <SelectTrigger className="w-40 h-10 bg-slate-50 border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
                <div className="flex items-center gap-2 truncate">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <SelectValue placeholder="Date Range" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Module Filter */}
            <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44 h-10 bg-slate-50 border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="Authentication">Authentication</SelectItem>
                <SelectItem value="Users">Users</SelectItem>
                <SelectItem value="Devices">Devices</SelectItem>
                <SelectItem value="Live Sessions">Live Sessions</SelectItem>
                <SelectItem value="Recordings">Recordings</SelectItem>
                <SelectItem value="Storage">Storage</SelectItem>
                <SelectItem value="Reports">Reports</SelectItem>
                <SelectItem value="Settings">Settings</SelectItem>
              </SelectContent>
            </Select>

            {/* Action Filter */}
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-48 h-10 bg-slate-50 border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="Admin Login">Admin Login</SelectItem>
                <SelectItem value="Admin Logout">Admin Logout</SelectItem>
                <SelectItem value="User Created">User Created</SelectItem>
                <SelectItem value="User Updated">User Updated</SelectItem>
                <SelectItem value="User Disabled">User Disabled</SelectItem>
                <SelectItem value="Agent Installed">Agent Installed</SelectItem>
                <SelectItem value="Live Session Started">Live Session Started</SelectItem>
                <SelectItem value="Live Session Ended">Live Session Ended</SelectItem>
                <SelectItem value="Recording Started">Recording Started</SelectItem>
                <SelectItem value="Recording Downloaded">Recording Downloaded</SelectItem>
                <SelectItem value="Recording Deleted">Recording Deleted</SelectItem>
                <SelectItem value="Upload Started">Upload Started</SelectItem>
                <SelectItem value="Upload Completed">Upload Completed</SelectItem>
                <SelectItem value="Upload Failed">Upload Failed</SelectItem>
                <SelectItem value="Report Exported">Report Exported</SelectItem>
                <SelectItem value="Recording Quality Updated">Recording Quality Updated</SelectItem>
                <SelectItem value="Data Retention Updated">Data Retention Updated</SelectItem>
                <SelectItem value="Audio Recording Enabled">Audio Recording Enabled</SelectItem>
                <SelectItem value="Audio Recording Disabled">Audio Recording Disabled</SelectItem>
                <SelectItem value="Stealth Mode Enabled">Stealth Mode Enabled</SelectItem>
                <SelectItem value="Stealth Mode Disabled">Stealth Mode Disabled</SelectItem>
                <SelectItem value="Purge All Recordings">Purge All Recordings</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36 h-10 bg-slate-50 border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-slate-900 h-10 px-4 rounded-lg font-medium"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead
                  className="text-xs font-semibold text-slate-500 py-3.5 pl-6 cursor-pointer select-none group"
                  onClick={() => handleSort("timestamp")}
                >
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">
                    Timestamp <SortIcon active={sortField === "timestamp"} dir={sortDir} />
                  </span>
                </TableHead>
                <TableHead
                  className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group"
                  onClick={() => handleSort("userName")}
                >
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">
                    User / Admin <SortIcon active={sortField === "userName"} dir={sortDir} />
                  </span>
                </TableHead>
                <TableHead
                  className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group"
                  onClick={() => handleSort("module")}
                >
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">
                    Module <SortIcon active={sortField === "module"} dir={sortDir} />
                  </span>
                </TableHead>
                <TableHead
                  className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group"
                  onClick={() => handleSort("action")}
                >
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">
                    Action <SortIcon active={sortField === "action"} dir={sortDir} />
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 min-w-[220px]">
                  Details
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5">
                  Device Name
                </TableHead>
                <TableHead
                  className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group"
                  onClick={() => handleSort("status")}
                >
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">
                    Status <SortIcon active={sortField === "status"} dir={sortDir} />
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-slate-500 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      <span className="font-semibold text-slate-700">Loading audit records from PostgreSQL database...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-slate-500 text-sm">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <ClipboardList className="w-8 h-8 text-slate-300 mb-1" />
                      <span className="font-semibold text-slate-700">No audit logs found</span>
                      <span className="text-xs text-slate-400">No event records found in PostgreSQL database matching your filter criteria.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (

                currentLogs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="border-slate-100 hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Timestamp */}
                    <TableCell className="pl-6 whitespace-nowrap text-xs font-medium text-slate-600">
                      {log.timestamp}
                    </TableCell>

                    {/* User / Admin */}
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-[10px] shrink-0">
                          {log.userRole === "System" ? (
                            <Server className="w-3.5 h-3.5 text-purple-600" />
                          ) : (
                            <span>{log.userName.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                            {log.userName}
                            {log.userRole === "Admin" && (
                              <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{log.userEmail}</div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Module */}
                    <TableCell className="whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className="bg-slate-50 text-slate-700 border-slate-200 text-[11px] font-medium px-2.5 py-0.5 rounded-md"
                      >
                        {log.module}
                      </Badge>
                    </TableCell>

                    {/* Action */}
                    <TableCell className="whitespace-nowrap">
                      <span className="text-xs font-semibold text-slate-800">{log.action}</span>
                    </TableCell>

                    {/* Details */}
                    <TableCell className="max-w-[280px]">
                      <p className="text-xs text-slate-600 truncate" title={log.details}>
                        {log.details}
                      </p>
                    </TableCell>

                    {/* Device Name */}
                    <TableCell className="whitespace-nowrap text-xs font-medium text-slate-700">
                      {log.deviceName}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="whitespace-nowrap">
                      {log.status === "success" && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Success
                        </div>
                      )}
                      {log.status === "warning" && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold uppercase tracking-wider">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Warning
                        </div>
                      )}
                      {log.status === "failed" && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold uppercase tracking-wider">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" /> Failed
                        </div>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-6 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium text-xs rounded-lg gap-1.5"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="w-3.5 h-3.5" /> View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <div className="text-xs font-medium text-slate-500">
            {total > 0
              ? `Showing ${(page - 1) * limit + 1} to ${Math.min(page * limit, total)} of ${total} entries`
              : "0 entries"}
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </Button>
            <div className="flex items-center justify-center px-4 h-8 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm">
              Page {page} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* View Details Right-Side Drawer (Sheet) */}
      <Sheet open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-white p-0 overflow-y-auto flex flex-col">
          {selectedLog && (
            <>
              {/* Sheet Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-200/70 px-2.5 py-1 rounded">
                    {selectedLog.id}
                  </span>
                  {selectedLog.status === "success" && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Success
                    </div>
                  )}
                  {selectedLog.status === "warning" && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Warning
                    </div>
                  )}
                  {selectedLog.status === "failed" && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold uppercase tracking-wider">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" /> Failed
                    </div>
                  )}
                </div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  {selectedLog.action}
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-1">
                  Audit log record details and telemetry snapshot
                </SheetDescription>
              </div>

              {/* Sheet Body */}
              <div className="p-6 space-y-6 flex-1">
                {/* Information Grid */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                      Timestamp
                    </span>
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {selectedLog.timestamp}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                      Module
                    </span>
                    <Badge variant="outline" className="bg-white text-indigo-700 border-indigo-200 text-xs font-semibold">
                      {selectedLog.module}
                    </Badge>
                  </div>
                </div>

                {/* Performed By Section */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Performed By
                  </h4>
                  <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {selectedLog.userRole === "System" ? (
                        <Server className="w-5 h-5 text-purple-600" />
                      ) : (
                        selectedLog.userName.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                        {selectedLog.userName}
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold px-1.5 py-0">
                          {selectedLog.userRole}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500">{selectedLog.userEmail}</div>
                    </div>
                  </div>
                </div>

                {/* Action Details */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Description & Context
                  </h4>
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 leading-relaxed font-normal">
                    {selectedLog.details}
                  </div>
                </div>

                {/* Network & Client telemetry */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Network & Client Info
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg">
                      <span className="text-slate-500 font-medium flex items-center gap-2">
                        <Laptop className="w-4 h-4 text-slate-400" /> Device Name
                      </span>
                      <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                        {selectedLog.deviceName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg">
                      <span className="text-slate-500 font-medium flex items-center gap-2">
                        <Laptop className="w-4 h-4 text-slate-400" /> Device / Browser
                      </span>
                      <span className="font-medium text-slate-800 text-right truncate max-w-[240px]">
                        {selectedLog.deviceBrowser}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Metadata */}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                      Event Metadata
                    </h4>
                    <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] space-y-1.5 overflow-x-auto shadow-inner">
                      {Object.entries(selectedLog.metadata).map(([key, val]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-indigo-400 font-semibold">{key}:</span>
                          <span className="text-slate-300">"{val}"</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sheet Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <Button
                  variant="outline"
                  className="rounded-lg text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-100"
                  onClick={() => setSelectedLog(null)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
