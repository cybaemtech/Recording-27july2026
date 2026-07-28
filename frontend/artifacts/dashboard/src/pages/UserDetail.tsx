import { useGetUser, useListDevices, useListSessions } from "@workspace/api-client-react";
import { Link, useParams } from "wouter";
import { ArrowLeft, User, Mail, Briefcase, MonitorSmartphone, Shield, HardDrive, Clock } from "lucide-react";
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

export default function UserDetail() {
  const { id: idStr } = useParams<{ id: string }>();
  const id = parseInt(idStr || "0");

  const { data: user, isLoading, error } = useGetUser(id);
  const { data: devicesRes } = useListDevices({ userId: id, limit: 50 }, {
    query: { enabled: !!id && !isNaN(id) }
  } as any);
  const { data: sessionsRes } = useListSessions({ userId: id, limit: 5 }, {
    query: { enabled: !!id && !isNaN(id) }
  } as any);

  const devices = devicesRes?.data || [];
  const recentSessions = sessionsRes?.data || [];

  if (isLoading) {
    return <div className="p-8 font-mono text-sm text-muted-foreground animate-pulse">LOADING_USER_PROFILE...</div>;
  }

  if (error || !user) {
    return (
      <div className="p-8">
        <div className="text-destructive mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" /> User not found
        </div>
        <Link href="/users">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Users</Button>
        </Link>
      </div>
    );
  }

  const u = user as any;
  const totalStorage = u.totalStorageBytes ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/users">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h2 className="text-2xl font-semibold tracking-tight">Personnel Profile</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Profile card */}
        <Card className="lg:col-span-1 bg-card/50 border-border/50 h-max">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span className="text-3xl font-semibold text-primary">{user.name.charAt(0)}</span>
              )}
            </div>
            <h3 className="text-lg font-semibold">{user.name}</h3>
            <p className="text-muted-foreground text-sm mb-1">{user.email}</p>
            <p className="text-xs text-muted-foreground mb-4">{user.department || "No department"}</p>

            {user.isOnline ? (
              <Badge variant="success" className="gap-1.5 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online Now
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground mb-4">Offline</Badge>
            )}

            <div className="w-full pt-4 border-t border-border/50 grid grid-cols-2 gap-2">
              <div className="text-center">
                <div className="text-xl font-bold font-mono text-primary">{user.deviceCount}</div>
                <div className="text-xs text-muted-foreground">Devices</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold font-mono text-primary">{user.sessionCount}</div>
                <div className="text-xs text-muted-foreground">Sessions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right side panels */}
        <div className="lg:col-span-3 space-y-6">
          {/* Identity Attributes */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm">Identity Attributes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                <div className="grid grid-cols-2 divide-x divide-border/50">
                  <div className="p-4 flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Full Name</div>
                      <div className="text-sm font-medium">{user.name}</div>
                    </div>
                  </div>
                  <div className="p-4 flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Email</div>
                      <div className="text-sm font-medium">{user.email}</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-border/50">
                  <div className="p-4 flex items-center gap-3">
                    <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Department</div>
                      <div className="text-sm font-medium">{user.department || "Unassigned"}</div>
                    </div>
                  </div>
                  <div className="p-4 flex items-center gap-3">
                    <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Role</div>
                      <div className="text-sm font-medium capitalize">{user.role}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <HardDrive className="w-4 h-4" />
                  <span className="text-xs">Total Storage</span>
                </div>
                <div className="text-xl font-bold font-mono text-primary">{formatBytes(totalStorage)}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Last Login</span>
                </div>
                <div className="text-sm font-mono">
                  {user.lastSeenAt ? formatDistanceToNow(new Date(user.lastSeenAt), { addSuffix: true }) : "Never"}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <User className="w-4 h-4" />
                  <span className="text-xs">Account Created</span>
                </div>
                <div className="text-sm font-mono">
                  {format(new Date(user.createdAt), "MMM d, yyyy")}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assigned Devices */}
          {devices.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MonitorSmartphone className="w-4 h-4 text-primary" /> Assigned Devices
                </CardTitle>
                <span className="text-xs text-muted-foreground">{devices.length} device{devices.length !== 1 ? "s" : ""}</span>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hostname</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((d: any) => (
                      <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50"
                        onClick={() => window.location.href = `/devices/${d.id}`}>
                        <TableCell className="font-mono text-sm">{d.name}</TableCell>
                        <TableCell className="text-sm">{d.operatingSystem}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">v{d.agentVersion ?? "?"}</TableCell>
                        <TableCell>
                          {d.isOnline ? (
                            <Badge variant="success" className="gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Online
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Offline</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {d.lastSeenAt ? formatDistanceToNow(new Date(d.lastSeenAt), { addSuffix: true }) : "Never"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Recent Sessions */}
          {recentSessions.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Recent Sessions
                </CardTitle>
                <Link href={`/sessions?userId=${id}`} className="text-xs text-primary hover:underline">
                  View all →
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
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
                        <TableCell className="font-mono text-xs">{s.device.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(s.loginTime), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {s.durationSeconds
                            ? `${Math.floor(s.durationSeconds / 3600)}h ${Math.floor((s.durationSeconds % 3600) / 60)}m`
                            : "Active"}
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
      </div>
    </div>
  );
}
