import { useGetDashboard, useListSessions, useGetActivityReport, useGetStorageReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Video, Clock, HardDrive, AlertTriangle, Shield, CheckCircle2, Eye, Monitor, Smartphone, Server } from "lucide-react";
import { Link } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";



function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

function getOsIcon(os: string) {
  if (!os) return <Monitor className="w-3.5 h-3.5" />;
  const lower = os.toLowerCase();
  if (lower.includes('mac') || lower.includes('ios')) return <Smartphone className="w-3.5 h-3.5" />;
  if (lower.includes('linux')) return <Server className="w-3.5 h-3.5" />;
  return <Monitor className="w-3.5 h-3.5" />;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboard();
  const { data: sessionsRes, isLoading: sessionsLoading } = useListSessions({ limit: 5 });
  const { data: activityData, isLoading: activityLoading } = useGetActivityReport();
  const { data: storageData, isLoading: storageLoading } = useGetStorageReport();

  if (statsLoading) {
    return <div className="text-slate-400 font-mono text-sm animate-pulse">LOADING_TELEMETRY...</div>;
  }

  const sessions = sessionsRes?.data || [];
  const sparklineData = activityData?.map((item: any) => ({ value: item.activeSessions })) || [];

  // Transform storage data for Donut Chart
  const pieColors = ["#4F46E5", "#A855F7", "#F59E0B", "#10B981"];
  const pieData = storageData?.map((item: any) => ({
    name: item.os,
    value: item.storageBytes
  })) || [{ name: "Total", value: stats?.cloudStorageUsedBytes || 0 }];
  
  const totalStorage = stats?.cloudStorageUsedBytes || 0;

  return (
    <div className="space-y-8 pb-8">
      
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time overview of your monitoring system</p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Active Recordings */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col h-[160px]">
          <CardContent className="p-5 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-slate-600">Active Recordings</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">{stats?.activeRecordingSessions || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Live streams active now</p>
            </div>
            <div className="h-10 mt-2 -mx-2 -mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Online Users */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col h-[160px]">
          <CardContent className="p-5 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-slate-600">Online Users</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">{stats?.onlineUsers || 0} <span className="text-slate-300 text-xl font-normal">/ {stats?.totalUsers || 1}</span></div>
              <p className="text-xs text-slate-500 mt-1">Currently connected agents</p>
            </div>
            <div className="h-10 mt-2 flex flex-col justify-end pb-2">
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.max(10, ((stats?.onlineUsers || 0) / (stats?.totalUsers || 1)) * 100)}%` }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Sessions */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col h-[160px]">
          <CardContent className="p-5 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-slate-600">Today's Sessions</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">{stats?.todaysSessions || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Total recorded today</p>
            </div>
            <div className="h-10 mt-2 flex items-end gap-1 px-1">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="flex-1 bg-emerald-400 rounded-t-sm" style={{ height: `${Math.max(20, Math.random() * 100)}%` }}></div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cloud Storage Used */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col h-[160px]">
          <CardContent className="p-5 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-slate-600">Cloud Storage Used</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">{stats ? formatBytes(stats.cloudStorageUsedBytes) : "0 B"}</div>
              <p className="text-xs text-blue-600 mt-1 font-medium hover:underline cursor-pointer">Total S3 bucket usage</p>
            </div>
            <div className="h-10 mt-2 flex flex-col justify-end pb-1">
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                <div className="bg-gradient-to-r from-orange-400 to-orange-300 h-2.5 rounded-full" style={{ width: '35%' }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-medium">
                <span>0 Bytes</span>
                <span>5 GB</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Failed Uploads */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col h-[160px]">
          <CardContent className="p-5 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-slate-600">Failed Uploads</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">{stats?.failedUploads || 0}</div>
              <p className="text-xs text-red-500 mt-1 font-medium">Nominal</p>
              <p className="text-xs text-slate-500 mt-0.5">Requires manual retry</p>
            </div>
            <div className="h-10 mt-2 flex flex-col justify-end pb-2">
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-red-500 h-2.5 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col h-[160px]">
          <CardContent className="p-5 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-slate-600">System Health</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">100%</div>
              <p className="text-xs text-emerald-500 mt-1 font-medium">Stable</p>
              <p className="text-xs text-slate-500 mt-0.5">All services operational</p>
            </div>
            <div className="h-10 mt-2 -mx-2 -mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity Over Time */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
              <LineChart className="w-4 h-4 text-indigo-500" />
              Activity Over Time (30d)
            </CardTitle>
            <select className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600 font-medium focus:outline-none">
              <option>30 Days</option>
              <option>7 Days</option>
              <option>24 Hours</option>
            </select>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[280px] w-full">
              {activityLoading ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400">Loading chart...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData || []} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return `${d.getMonth()+1}/${d.getDate()}`;
                      }}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false}
                      axisLine={false}
                      tickCount={6}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="sessionCount" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Storage by OS */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
              <PieChart className="w-4 h-4 text-blue-500" />
              Storage by OS
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col h-[320px]">
            <div className="flex-1 flex items-center justify-center relative">
              {storageLoading ? (
                <div className="text-slate-400">Loading chart...</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => formatBytes(val)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-slate-500">Total</span>
                    <span className="text-lg font-bold text-slate-900">{formatBytes(totalStorage)}</span>
                  </div>
                </>
              )}
            </div>
            
            {/* Legend / Breakdown */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-100">
              <div className="col-span-1 border border-slate-100 rounded-lg p-2 text-center bg-slate-50">
                <div className="text-[10px] text-slate-500 font-medium mb-1">0 Bytes</div>
                <div className="text-[9px] text-slate-400">macOS</div>
              </div>
              <div className="col-span-1 border border-slate-100 rounded-lg p-2 text-center">
                <div className="text-[10px] text-slate-800 font-bold mb-1">2.38 MB</div>
                <div className="text-[9px] text-slate-500">Documents</div>
              </div>
              <div className="col-span-1 border border-slate-100 rounded-lg p-2 text-center">
                <div className="text-[10px] text-slate-800 font-bold mb-1">4.77 MB</div>
                <div className="text-[9px] text-slate-500">Screenshots</div>
              </div>
              <div className="col-span-1 border border-indigo-100 bg-indigo-50/50 rounded-lg p-2 text-center">
                <div className="text-[10px] text-indigo-700 font-bold mb-1">{formatBytes(totalStorage)}</div>
                <div className="text-[9px] text-indigo-500">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions Table */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
            <Video className="w-4 h-4 text-indigo-500" />
            Recent Sessions
          </CardTitle>
          <Link href="/sessions" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
            View All Sessions <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100">
                <TableHead className="text-xs font-semibold text-slate-500 py-3 pl-6">User</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3">Device</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3">Started</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3">Duration</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3 text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-400 text-sm">Loading data...</TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-400 text-sm">No recent sessions found.</TableCell>
                </TableRow>
              ) : (
                sessions.map((session: any) => (
                  <TableRow key={session.id} className="border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-[11px] shadow-sm">
                          {session.user.name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900">{session.user.name}</span>
                          <span className="text-[11px] text-slate-500">{session.user.role || 'admin'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-700">
                        <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                          {getOsIcon(session.device.operatingSystem)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">{session.device.name}</span>
                          <span className="text-[10px] text-slate-500">{session.device.operatingSystem}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-500">{formatDistanceToNow(new Date(session.loginTime), { addSuffix: true })}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(session.loginTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{" "}
                          {new Date(session.loginTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-slate-800">
                        {session.durationSeconds ? formatDuration(session.durationSeconds) : "Active"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {session.recordingStatus === 'active' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                          Active
                        </div>
                      ) : session.uploadStatus === 'completed' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Stored
                        </div>
                      ) : session.uploadStatus === 'failed' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 border border-red-100 text-red-700 text-xs font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          Failed
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-slate-600 border-slate-200">{session.uploadStatus}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Link href={`/sessions/${session.id}`} className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
