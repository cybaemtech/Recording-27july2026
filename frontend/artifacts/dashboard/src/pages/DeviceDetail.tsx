import { useGetDevice, useListSessions } from "@workspace/api-client-react";
import { Link, useParams } from "wouter";
import { ArrowLeft, MonitorSmartphone, Activity, Terminal, Cpu, HardDrive, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function DeviceDetail() {
  const { id: idStr } = useParams<{ id: string }>();
  const id = parseInt(idStr || "0");

  const { data: device, isLoading, error } = useGetDevice(id);
  const { data: sessionsRes } = useListSessions({ deviceId: id as any, limit: 5 } as any, {
    query: { enabled: !!id && !isNaN(id) }
  } as any);

  const recentSessions = sessionsRes?.data || [];

  if (isLoading) {
    return <div className="p-8 font-mono text-sm text-muted-foreground animate-pulse">QUERYING_DEVICE_TELEMETRY...</div>;
  }

  if (error || !device) {
    return (
      <div className="p-8">
        <div className="text-destructive mb-4">Device not found</div>
        <Link href="/devices">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Devices</Button>
        </Link>
      </div>
    );
  }

  const d = device as any;
  const totalStorageBytes = d.totalStorageBytes ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/devices">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-semibold font-mono tracking-tight">{device.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="font-mono text-xs">{device.operatingSystem}</Badge>
              {device.isOnline ? (
                <Badge variant="success" className="gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-muted-foreground">Offline</Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" className="gap-2">
          <Terminal className="w-4 h-4" /> Remote Shell
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-xs">Total Sessions</span>
            </div>
            <div className="text-2xl font-bold font-mono text-primary">{device.sessionCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <HardDrive className="w-4 h-4" />
              <span className="text-xs">Storage Used</span>
            </div>
            <div className="text-2xl font-bold font-mono text-primary">{formatBytes(totalStorageBytes)}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Last Seen</span>
            </div>
            <div className="text-sm font-mono">
              {device.lastSeenAt ? formatDistanceToNow(new Date(device.lastSeenAt), { addSuffix: true }) : "Never"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* System Info */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" /> System Info
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              <div className="p-4">
                <div className="text-xs text-muted-foreground mb-0.5">Hostname</div>
                <div className="font-mono text-sm font-medium">{device.name}</div>
              </div>
              <div className="p-4">
                <div className="text-xs text-muted-foreground mb-0.5">Operating System</div>
                <div className="font-mono text-sm">{device.operatingSystem}</div>
              </div>
              <div className="p-4">
                <div className="text-xs text-muted-foreground mb-0.5">Current Status</div>
                <div className="text-sm">{device.isOnline ? "🟢 Connected" : "⚫ Offline"}</div>
              </div>
              <div className="p-4">
                <div className="text-xs text-muted-foreground mb-0.5">Device ID</div>
                <div className="font-mono text-sm text-muted-foreground">{device.id}</div>
              </div>
              <div className="p-4">
                <div className="text-xs text-muted-foreground mb-0.5">Registered</div>
                <div className="font-mono text-sm">{format(new Date(device.createdAt), "MMM d, yyyy")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agent Telemetry */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Agent Telemetry
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              <div className="p-4">
                <div className="text-xs text-muted-foreground mb-0.5">Installed Agent Version</div>
                <div className="font-mono text-sm">v{device.agentVersion || "Unknown"}</div>
              </div>
              <div className="p-4">
                <div className="text-xs text-muted-foreground mb-0.5">Last Seen</div>
                <div className="font-mono text-sm">
                  {device.lastSeenAt ? formatDistanceToNow(new Date(device.lastSeenAt), { addSuffix: true }) : "Never"}
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs text-muted-foreground mb-0.5">Recording Statistics</div>
                <div className="text-sm">{device.sessionCount} sessions · {formatBytes(totalStorageBytes)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned User */}
        <Card className="md:col-span-2 bg-card/50 border-border/50">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MonitorSmartphone className="w-4 h-4 text-primary" /> Assigned User
            </CardTitle>
            <Link href={`/users/${device.user.id}`} className="text-xs text-primary hover:underline">
              View Profile →
            </Link>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                {device.user.name.charAt(0)}
              </div>
              <div>
                <div className="font-medium">{device.user.name}</div>
                <div className="text-sm text-muted-foreground">{device.user.email}</div>
                {d.user?.department && (
                  <div className="text-xs text-muted-foreground">{d.user.department}</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Recent Sessions
            </CardTitle>
            <span className="text-xs text-muted-foreground">Latest 5 sessions</span>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSessions.map((s: any) => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50"
                    onClick={() => window.location.href = `/sessions/${s.id}`}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{String(s.id).padStart(6, "0")}
                    </TableCell>
                    <TableCell className="text-sm">{s.user.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(s.loginTime), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {s.durationSeconds
                        ? `${Math.floor(s.durationSeconds / 3600)}h ${Math.floor((s.durationSeconds % 3600) / 60)}m`
                        : "Active"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {s.recordingSizeBytes
                        ? `${(s.recordingSizeBytes / 1024 / 1024).toFixed(0)} MB`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {s.recordingStatus === "active" ? (
                        <Badge variant="info" className="text-xs animate-pulse">Active</Badge>
                      ) : s.uploadStatus === "completed" ? (
                        <Badge variant="success" className="text-xs">Stored</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">{s.uploadStatus}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
