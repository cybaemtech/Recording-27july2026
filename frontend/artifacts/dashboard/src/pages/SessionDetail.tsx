import { useRef } from "react";
import { Link, useParams } from "wouter";
import { useGetSession } from "@workspace/api-client-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, PlayCircle, Download, Clock, HardDrive,
  MonitorSmartphone, User, Shield, AlertTriangle, CheckCircle2,
  Upload, XCircle, Radio, FileVideo, Calendar
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function TimelineEvent({ icon: Icon, label, time, variant = "default" }: {
  icon: React.ElementType;
  label: string;
  time: string;
  variant?: "default" | "success" | "destructive" | "active";
}) {
  const colorMap = {
    default: "text-slate-500 border-slate-200 bg-slate-50",
    success: "text-emerald-600 border-emerald-100 bg-emerald-50",
    destructive: "text-red-600 border-red-100 bg-red-50",
    active: "text-indigo-600 border-indigo-100 bg-indigo-50",
  };
  return (
    <div className="flex items-start gap-4">
      <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${colorMap[variant]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 pt-1.5 pb-4">
        <div className="text-sm font-semibold text-slate-800">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{time}</div>
      </div>
    </div>
  );
}

export default function SessionDetail() {
  const { id: idStr } = useParams<{ id: string }>();
  const id = parseInt(idStr || "0");
  const videoRef = useRef<HTMLVideoElement>(null);
 
  const { data: session, isLoading, error } = useGetSession(id, {
    query: { enabled: !!id && !isNaN(id) }
  } as any);

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 font-medium text-sm text-slate-500">
        Loading session data...
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <AlertTriangle className="w-6 h-6" />
          <h2 className="text-xl font-bold">Session not found</h2>
        </div>
        <Link href="/sessions">
          <Button variant="outline" className="bg-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sessions
          </Button>
        </Link>
      </div>
    );
  }

  const s = session as any;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/sessions">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">
                SESSION #{String(session.id).padStart(6, "0")}
              </h2>
              {session.recordingStatus === "active" ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  Active
                </div>
              ) : session.uploadStatus === "completed" ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Completed
                </div>
              ) : session.uploadStatus === "failed" ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  Failed
                </div>
              ) : (
                <Badge variant="outline" className="text-slate-600 border-slate-200 bg-white">{session.uploadStatus}</Badge>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Started {format(new Date(session.loginTime), "MMM d, yyyy 'at' HH:mm:ss")}
            </p>
          </div>
        </div>
        {session.recordingUrl ? (
          <a href={session.recordingUrl} download={session.recordingUrl.split('/').pop()} target="_blank" rel="noopener noreferrer">
            <Button className="gap-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm rounded-lg font-medium">
              <Download className="w-4 h-4" />
              Download Recording
            </Button>
          </a>
        ) : (
          <Button variant="outline" className="gap-2 bg-slate-50 text-slate-400 border-slate-200 rounded-lg font-medium" disabled>
            <Download className="w-4 h-4" />
            Download Recording
          </Button>
        )}
      </div>
 
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Video + Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <div className="aspect-video bg-slate-900 relative flex items-center justify-center border-b border-slate-200">
              {session.recordingUrl ? (
                <video
                  ref={videoRef}
                  src={session.recordingUrl}
                  controls
                  className="w-full h-full object-contain"
                  preload="metadata"
                />
              ) : session.recordingStatus === "active" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-indigo-900/30 border-t-indigo-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                    </div>
                  </div>
                  <p className="font-semibold text-sm text-indigo-400 tracking-wider">LIVE_RECORDING_ACTIVE</p>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-4">
                  <AlertTriangle className="w-12 h-12 text-slate-700" />
                  <p className="font-semibold text-sm tracking-wider">RECORDING_NOT_AVAILABLE</p>
                </div>
              )}
            </div>
            {session.recordingUrl && (
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-center gap-3">
                <Button variant="outline" size="sm" className="font-mono text-xs bg-white text-slate-600 border-slate-200 shadow-sm rounded-md hover:bg-slate-50" onClick={() => skip(-60)}>
                  « 60s
                </Button>
                <Button variant="outline" size="sm" className="font-mono text-xs bg-white text-slate-600 border-slate-200 shadow-sm rounded-md hover:bg-slate-50" onClick={() => skip(-30)}>
                  « 30s
                </Button>
                <span className="text-xs text-slate-400 font-bold tracking-widest uppercase px-4">Seek Controls</span>
                <Button variant="outline" size="sm" className="font-mono text-xs bg-white text-slate-600 border-slate-200 shadow-sm rounded-md hover:bg-slate-50" onClick={() => skip(30)}>
                  30s »
                </Button>
                <Button variant="outline" size="sm" className="font-mono text-xs bg-white text-slate-600 border-slate-200 shadow-sm rounded-md hover:bg-slate-50" onClick={() => skip(60)}>
                  60s »
                </Button>
              </div>
            )}
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-4 bg-white">
              <div className="flex items-center gap-6">
                <div className="px-2 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-[11px] font-bold text-indigo-700">
                  1080p
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 text-xs font-semibold">Offline Local Storage</span>
                </div>
              </div>
              <div className="font-mono text-[10px] text-slate-400 truncate max-w-full sm:max-w-xs">
                {session.recordingUrl}
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="pb-3 border-b border-slate-100 bg-white">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative border-l border-slate-200 ml-4">
                <div className="-ml-[17px] space-y-0">
                  <TimelineEvent
                    icon={Radio}
                    label="Session started — recording initiated"
                    time={format(new Date(session.loginTime), "MMM d, yyyy HH:mm:ss")}
                    variant="success"
                  />
                  {session.uploadStatus === "uploading" && (
                    <TimelineEvent
                      icon={Upload}
                      label="Recording upload in progress"
                      time="Ongoing"
                      variant="active"
                    />
                  )}
                  {session.uploadStatus === "completed" && session.logoutTime && (
                    <TimelineEvent
                      icon={Upload}
                      label="Upload to cloud storage completed"
                      time={format(new Date(session.logoutTime), "MMM d, yyyy HH:mm:ss")}
                      variant="success"
                    />
                  )}
                  {session.uploadStatus === "failed" && (
                    <TimelineEvent
                      icon={XCircle}
                      label="Upload failed — manual retry required"
                      time={session.logoutTime ? format(new Date(session.logoutTime), "MMM d, yyyy HH:mm:ss") : "Unknown"}
                      variant="destructive"
                    />
                  )}
                  {session.logoutTime && (
                    <TimelineEvent
                      icon={CheckCircle2}
                      label="Session ended — agent disconnected"
                      time={format(new Date(session.logoutTime), "MMM d, yyyy HH:mm:ss")}
                      variant="default"
                    />
                  )}
                  {session.recordingStatus === "active" && (
                    <TimelineEvent
                      icon={Radio}
                      label="Recording active"
                      time={`Started ${formatDistanceToNow(new Date(session.loginTime), { addSuffix: true })}`}
                      variant="active"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Metadata */}
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="pb-3 border-b border-slate-100 bg-white">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                <FileVideo className="w-4 h-4 text-indigo-500" />
                Session Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                <div className="grid grid-cols-2 divide-x divide-slate-100">
                  <div className="p-4 bg-slate-50/50">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Session ID</div>
                    <div className="font-mono text-sm font-bold text-slate-900">#{String(session.id).padStart(6, "0")}</div>
                  </div>
                  <div className="p-4 bg-white">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Recording Status</div>
                    <div className="font-semibold text-sm capitalize text-slate-800">{session.recordingStatus}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-100">
                  <div className="p-4 bg-white">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Login Time</div>
                    <div className="font-semibold text-sm text-slate-800">{format(new Date(session.loginTime), "HH:mm:ss")}</div>
                  </div>
                  <div className="p-4 bg-slate-50/50">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Logout Time</div>
                    <div className="font-semibold text-sm text-slate-800">
                      {session.logoutTime ? format(new Date(session.logoutTime), "HH:mm:ss") : "—"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-100">
                  <div className="p-4 bg-slate-50/50">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Duration</div>
                    <div className="font-bold text-sm text-indigo-600">
                      {session.durationSeconds ? formatDuration(session.durationSeconds) : "Live"}
                    </div>
                  </div>
                  <div className="p-4 bg-white">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Recording Size</div>
                    <div className="font-mono text-sm font-medium text-slate-800">
                      {session.recordingSizeBytes ? formatBytes(session.recordingSizeBytes) : "—"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-100">
                  <div className="p-4 bg-white">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Upload Status</div>
                    <div className="font-semibold text-sm capitalize text-slate-800">{session.uploadStatus}</div>
                  </div>
                  <div className="p-4 bg-slate-50/50">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Cloud URL</div>
                    <div className="font-mono text-[10px] truncate text-slate-400 font-medium">
                      {session.recordingUrl ?? "Not uploaded"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Context panels */}
        <div className="space-y-6">
          {/* User */}
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="pb-3 border-b border-slate-100 bg-white">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                <User className="w-4 h-4 text-indigo-500" /> User Context
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                <div className="p-4 bg-slate-50/30">
                  <div className="text-[11px] font-semibold text-slate-500 mb-0.5">Username</div>
                  <div className="text-sm font-bold text-slate-900">{session.user.name}</div>
                </div>
                <div className="p-4 bg-white">
                  <div className="text-[11px] font-semibold text-slate-500 mb-0.5">Email</div>
                  <div className="text-sm font-medium text-slate-700">{session.user.email}</div>
                </div>
                {s.user?.department && (
                  <div className="p-4 bg-slate-50/30">
                    <div className="text-[11px] font-semibold text-slate-500 mb-0.5">Department</div>
                    <div className="text-sm font-medium text-slate-700">{s.user.department}</div>
                  </div>
                )}
                {s.user?.role && (
                  <div className="p-4 bg-white">
                    <div className="text-[11px] font-semibold text-slate-500 mb-0.5">Role</div>
                    <div className="text-sm font-medium capitalize text-slate-700">{s.user.role}</div>
                  </div>
                )}
                <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                  <Link href={`/users/${session.user.id}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center">
                    View full profile <span className="ml-1">→</span>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device */}
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="pb-3 border-b border-slate-100 bg-white">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                <MonitorSmartphone className="w-4 h-4 text-indigo-500" /> Device Context
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                <div className="p-4 bg-slate-50/30">
                  <div className="text-[11px] font-semibold text-slate-500 mb-0.5">Hostname</div>
                  <div className="font-mono text-sm font-bold text-slate-900">{session.device.name}</div>
                </div>
                <div className="p-4 bg-white">
                  <div className="text-[11px] font-semibold text-slate-500 mb-0.5">Operating System</div>
                  <div className="text-sm font-medium text-slate-700">{session.device.operatingSystem}</div>
                </div>
                {s.device?.agentVersion && (
                  <div className="p-4 bg-slate-50/30">
                    <div className="text-[11px] font-semibold text-slate-500 mb-0.5">Agent Version</div>
                    <div className="font-mono text-sm font-medium text-slate-700">v{s.device.agentVersion}</div>
                  </div>
                )}
                <div className="p-4 bg-white">
                  <div className="text-[11px] font-semibold text-slate-500 mb-0.5">Device ID</div>
                  <div className="font-mono text-sm font-medium text-slate-700">{session.device.id}</div>
                </div>
                <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                  <Link href={`/devices/${session.device.id}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center">
                    View device details <span className="ml-1">→</span>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recording Telemetry */}
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="pb-3 border-b border-slate-100 bg-white">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                <HardDrive className="w-4 h-4 text-indigo-500" /> Recording Telemetry
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                <div className="flex justify-between items-center p-4 bg-slate-50/30">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Duration
                  </span>
                  <span className="text-sm font-bold text-indigo-600">
                    {session.durationSeconds ? formatDuration(session.durationSeconds) : "Live"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white">
                  <span className="text-xs font-semibold text-slate-500">File Size</span>
                  <span className="text-sm font-mono font-medium text-slate-800">
                    {session.recordingSizeBytes ? formatBytes(session.recordingSizeBytes) : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-50/30">
                  <span className="text-xs font-semibold text-slate-500">Upload</span>
                  <span className="text-sm font-medium capitalize text-slate-800">{session.uploadStatus}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white">
                  <span className="text-xs font-semibold text-slate-500">Video Quality</span>
                  <span className="text-sm font-mono font-medium text-slate-800">1080p 60fps</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
