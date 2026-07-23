import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Save, 
  Loader2, 
  Terminal, 
  Settings as SettingsIcon, 
  BookOpen, 
  Building, 
  ShieldAlert, 
  Laptop, 
  Play,
  Database,
  Cloud,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Key,
  Lock,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  Wifi,
  Clock,
  ArrowUpRight,
  Eye,
  EyeOff,
  Check,
  Server,
  Zap,
  Globe
} from "lucide-react";
import ApiConsole from "@/components/ApiConsole";

// ─── Settings API helpers ─────────────────────────────────────────────────────

async function fetchSettings(): Promise<Record<string, string>> {
  const token = localStorage.getItem("token");
  const res = await fetch("/api/settings", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

async function saveSettings(data: Record<string, string>): Promise<Record<string, string>> {
  const token = localStorage.getItem("token");
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save settings");
  return res.json();
}

// ─── Tab system ───────────────────────────────────────────────────────────────

type Tab = "configuration" | "api-console" | "documentation" | "db-connections";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "configuration",  label: "Configuration",        icon: SettingsIcon },
  { id: "api-console",    label: "API Console",          icon: Terminal },
  { id: "documentation",  label: "Documentation",        icon: BookOpen },
  { id: "db-connections", label: "Database Connections", icon: Database },
];

// ─── Configuration panel ─────────────────────────────────────────────────────

function ConfigurationPanel() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({
    company_name: "",
    support_email: "",
    record_audio: "true",
    stealth_mode: "false",
    video_quality: "1080p",
    retention_days: "90",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string, val: string) =>
    setSettings((s) => ({ ...s, [key]: val }));

  const handleSave = async (subset: Record<string, string>) => {
    setSaving(true);
    try {
      const updated = await saveSettings(subset);
      setSettings(updated);
      toast({ title: "Settings saved", description: "Configuration updated successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-8 text-slate-500 font-medium">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> Loading configuration...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl pb-8">
      {/* Organization Info */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
            <Building className="w-4 h-4 text-indigo-500" /> Organization Info
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">Basic information about your deployment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-6 bg-white">
          <div className="grid gap-2">
            <Label className="text-xs font-semibold text-slate-700">Company Name</Label>
            <Input
              value={settings.company_name || ""}
              onChange={(e) => set("company_name", e.target.value)}
              className="bg-slate-50 border-slate-200 max-w-md h-10 text-sm focus-visible:ring-indigo-500 rounded-lg"
              placeholder="Acme Corp"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-semibold text-slate-700">Support Email</Label>
            <Input
              value={settings.support_email || ""}
              onChange={(e) => set("support_email", e.target.value)}
              type="email"
              className="bg-slate-50 border-slate-200 max-w-md h-10 text-sm focus-visible:ring-indigo-500 rounded-lg"
              placeholder="it-support@company.com"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-semibold text-slate-700">Data Retention (days)</Label>
            <Input
              value={settings.retention_days || "90"}
              onChange={(e) => set("retention_days", e.target.value)}
              type="number"
              className="bg-slate-50 border-slate-200 max-w-md h-10 text-sm focus-visible:ring-indigo-500 rounded-lg"
              placeholder="90"
            />
          </div>
          <div className="pt-2">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-medium rounded-lg h-10 px-5"
              disabled={saving}
              onClick={() =>
                handleSave({
                  company_name: settings.company_name,
                  support_email: settings.support_email,
                  retention_days: settings.retention_days,
                })
              }
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agent Configuration */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
            <Laptop className="w-4 h-4 text-indigo-500" /> Agent Configuration
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">Default recording policies pushed to all endpoints</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6 bg-white">
          <div className="flex items-center justify-between py-1">
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-800">Record System Audio</Label>
              <p className="text-xs text-slate-500">
                Capture speaker output during sessions
              </p>
            </div>
            <Switch
              checked={settings.record_audio === "true"}
              onCheckedChange={(v) => set("record_audio", String(v))}
              className="data-[state=checked]:bg-indigo-600"
            />
          </div>
          <div className="flex items-center justify-between py-1">
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-800">Stealth Mode</Label>
              <p className="text-xs text-slate-500">
                Hide tray icon on user endpoints (Requires Admin)
              </p>
            </div>
            <Switch
              checked={settings.stealth_mode === "true"}
              onCheckedChange={(v) => set("stealth_mode", String(v))}
              className="data-[state=checked]:bg-indigo-600"
            />
          </div>
          <div className="grid gap-2 max-w-md pt-2">
            <Label className="text-xs font-semibold text-slate-700">Default Video Quality</Label>
            <Select
              value={settings.video_quality || "1080p"}
              onValueChange={(v) => set("video_quality", v)}
            >
              <SelectTrigger className="bg-slate-50 border-slate-200 h-10 text-sm focus:ring-indigo-500 rounded-lg">
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="720p">720p (Storage Optimized)</SelectItem>
                <SelectItem value="1080p">1080p (Standard)</SelectItem>
                <SelectItem value="1440p">1440p (High Quality)</SelectItem>
                <SelectItem value="4k">4K (Maximum Quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="pt-2">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-medium rounded-lg h-10 px-5"
              disabled={saving}
              onClick={() =>
                handleSave({
                  record_audio: settings.record_audio,
                  stealth_mode: settings.stealth_mode,
                  video_quality: settings.video_quality,
                })
              }
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Update Policy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-white border border-red-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-red-50/30 border-b border-red-100 pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-600">
            <ShieldAlert className="w-4 h-4" /> Danger Zone
          </CardTitle>
          <CardDescription className="text-xs text-red-400">Irreversible destructive actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6 bg-white">
          <div className="flex items-center justify-between p-5 border border-red-100 bg-red-50/50 rounded-xl">
            <div>
              <h4 className="font-bold text-sm text-red-900">Purge All Recordings</h4>
              <p className="text-xs text-red-600/80 mt-1 font-medium">
                Permanently delete all session videos older than{" "}
                {settings.retention_days || 90} days.
              </p>
            </div>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700 font-bold rounded-lg shadow-sm">Purge Data</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Documentation panel ──────────────────────────────────────────────────────

function DocumentationPanel() {
  return (
    <div className="space-y-6 max-w-4xl pb-8">
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
            <BookOpen className="w-4 h-4 text-indigo-500" /> API Documentation
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Interactive Swagger UI with live try-it-out for all 13 endpoints
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6 bg-white">
          <p className="text-sm text-slate-600 leading-relaxed">
            The full OpenAPI 3.0 specification is hosted at{" "}
            <code className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">/api/docs</code>.
            Open it in a new tab to explore all endpoints, schemas, and try them
            out with the Swagger UI.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <a
              href="/api/docs"
              target="_blank"
              rel="noreferrer"
              className="flex flex-col gap-3 p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all shadow-sm group"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 text-indigo-600 ml-0.5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 mb-1">Swagger UI</div>
                <div className="text-xs text-slate-500 font-medium leading-relaxed">
                  Interactive browser — try any endpoint live
                </div>
              </div>
            </a>
            <a
              href="/api/docs/spec.json"
              target="_blank"
              rel="noreferrer"
              className="flex flex-col gap-3 p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all shadow-sm group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Terminal className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 mb-1">OpenAPI Spec (JSON)</div>
                <div className="text-xs text-slate-500 font-medium leading-relaxed">
                  Import into Postman, Insomnia, or generate SDKs
                </div>
              </div>
            </a>
            <div className="flex flex-col gap-3 p-5 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-400 mb-1">Agent SDKs</div>
                <div className="text-xs text-slate-400 font-medium leading-relaxed">
                  Electron, .NET, Python — coming soon
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 font-mono text-[13px] space-y-2 shadow-inner">
            <div className="text-slate-500 font-bold mb-3"># Agent quickstart (curl)</div>
            <div><span className="text-indigo-400 font-bold"># 1. Register device</span></div>
            <div className="text-emerald-400 break-all">
              {`curl -X POST /api/agent/register -H "Content-Type: application/json" \\`}
            </div>
            <div className="text-emerald-400 pl-4 break-all">
              {`-d '{"hostname":"MY-PC","operatingSystem":"Windows","agentVersion":"2.4.1","userId":1}'`}
            </div>
            <div className="mt-4"><span className="text-indigo-400 font-bold"># 2. Login</span></div>
            <div className="text-emerald-400 break-all">
              {`curl -X POST /api/agent/login -d '{"deviceId":42,"apiToken":"csr_live_..."}'`}
            </div>
            <div className="mt-4"><span className="text-indigo-400 font-bold"># 3. Start session</span></div>
            <div className="text-emerald-400 break-all">
              {`curl -X POST /api/session/start -H "Authorization: Bearer <JWT>" \\`}
            </div>
            <div className="text-emerald-400 pl-4 break-all">{`-d '{"deviceId":42}'`}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Provider Official Logos ───────────────────────────────────────────────────

function AwsLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.5 19.5c-3.2 2.4-7.8 3.7-11.8 3.7-5.8 0-11-2.1-15-5.7-.4-.4-.1-.9.4-.8 5 1.9 10.7 3 16.5 3 3.6 0 7.6-.5 11.1-1.7.7-.3 1.2.4.8.9z" fill="#FF9900"/>
      <path d="M23.8 18.2c-.5-.7-3.3-.3-4.5 0-.4.1-.5-.3-.1-.5 2.4-1.7 6.3-1.3 7 .5.5.8-.3 4.7-2.5 6.7-.4.3-.7.1-.5-.3.5-1.2 1.1-4.7.6-6.4z" fill="#FF9900"/>
      <path d="M16 3L6 8.5v11L16 25l10-5.5v-11L16 3zm7.5 15.2L16 22.3l-7.5-4.1V9.8L16 5.7l7.5 4.1v8.4z" fill="#FF9900"/>
      <path d="M16 8L10 11.3v5.4l6 3.3 6-3.3v-5.4L16 8z" fill="#232F3E"/>
    </svg>
  );
}

function AzureLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.2 4h7.8L11.3 27H4l7.2-23z" fill="#0078D4"/>
      <path d="M19 4l10.2 21.2h-10L14.7 15.5 19 4z" fill="#50E6FF"/>
      <path d="M11.2 27l5.4-8h12.6l-5.4 8H11.2z" fill="#0078D4"/>
      <path d="M16.6 19l5.4 8h7.2l-5.4-8h-7.2z" fill="#024789"/>
    </svg>
  );
}

function SupabaseLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.8 2.7a1.6 1.6 0 00-2.4.35L3.16 21.1a1.6 1.6 0 001.3 2.57h9.74l-1.4 5.6a1.6 1.6 0 002.37.35l12.27-18a1.6 1.6 0 00-1.3-2.57h-9.74l1.4-6.3z" fill="url(#supabase_grad_official)" />
      <defs>
        <linearGradient id="supabase_grad_official" x1="3" y1="3" x2="29" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3ECF8E" />
          <stop offset="1" stopColor="#24B47E" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function GcpLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 6.67c2.13 0 4.1.69 5.7 1.87l4.27-4.27C23.38 1.97 19.89 0 16 0 9.95 0 4.75 3.43 2.17 8.44l4.5 3.48C7.96 9.4 11.65 6.67 16 6.67z" fill="#EA4335"/>
      <path d="M30.27 16.36c0-1.03-.09-2.05-.27-3.03H16v6.01h8.01c-.35 1.83-1.39 3.37-2.95 4.41l4.53 3.52c2.65-2.45 4.68-6.07 4.68-10.91z" fill="#4285F4"/>
      <path d="M6.67 18.76c-.33-.99-.52-2.04-.52-3.12 0-1.08.19-2.13.52-3.12L2.17 9.04C.79 11.8 0 14.89 0 18.0c0 3.11.79 6.2 2.17 8.96l4.5-3.48c-.33-.99-.52-2.04-.52-3.12z" fill="#FBBC05"/>
      <path d="M16 30c4.32 0 7.93-1.44 10.58-3.88l-4.53-3.52c-1.43.96-3.25 1.53-6.05 1.53-4.35 0-8.04-2.73-9.33-6.57l-4.5 3.48C4.75 26.57 9.95 30 16 30z" fill="#34A853"/>
    </svg>
  );
}

// ─── Database Connections Panel ──────────────────────────────────────────────

interface ProviderConfig {
  id: "aws" | "azure" | "supabase" | "gcp";
  name: string;
  shortDesc: string;
  badgeTag: string;
  status: "Connected" | "Not Connected";
  logo: React.ComponentType<{ className?: string }>;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  defaultConnectionName: string;
  defaultRegion: string;
  defaultBucket: string;
  defaultAccessKey: string;
  defaultSecretKey: string;
  lastConnected: string;
  lastSync: string;
  usedBytesText: string;
  totalCapacityText: string;
  usagePercentage: number;
  availableText: string;
  healthStatusText: string;
  regions: { value: string; label: string }[];
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "aws",
    name: "AWS (Amazon Web Services)",
    shortDesc: "Amazon S3 Bucket & Glacier Vault for high-scalability video recordings storage",
    badgeTag: "S3 Storage",
    status: "Connected",
    logo: AwsLogo,
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200",
    defaultConnectionName: "Production-AWS-S3-Bucket",
    defaultRegion: "us-east-1",
    defaultBucket: "monitorpro-recordings-prod",
    defaultAccessKey: "AKIAIOSFODNN7EXAMPLE",
    defaultSecretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    lastConnected: "Jul 21, 2026 09:40:12",
    lastSync: "2 minutes ago",
    usedBytesText: "24.5 GB",
    totalCapacityText: "100.0 GB",
    usagePercentage: 24.5,
    availableText: "75.5 GB Available",
    healthStatusText: "Healthy & Operational",
    regions: [
      { value: "us-east-1", label: "US East (N. Virginia)" },
      { value: "us-west-2", label: "US West (Oregon)" },
      { value: "eu-west-1", label: "Europe (Ireland)" },
      { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" }
    ]
  },
  {
    id: "azure",
    name: "Microsoft Azure",
    shortDesc: "Azure Blob & Archive Storage for enterprise security and compliance backups",
    badgeTag: "Blob Storage",
    status: "Not Connected",
    logo: AzureLogo,
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    badgeBorder: "border-blue-200",
    defaultConnectionName: "Azure-Enterprise-Backup-Container",
    defaultRegion: "eastus",
    defaultBucket: "monitorpro-blob-container",
    defaultAccessKey: "azure_storage_account_key_90a",
    defaultSecretKey: "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6...",
    lastConnected: "Jul 20, 2026 16:45:22",
    lastSync: "1 day ago (Standby)",
    usedBytesText: "0.0 GB",
    totalCapacityText: "250.0 GB",
    usagePercentage: 0,
    availableText: "250.0 GB Available",
    healthStatusText: "Pending Configuration",
    regions: [
      { value: "eastus", label: "East US (Virginia)" },
      { value: "westeurope", label: "West Europe (Netherlands)" },
      { value: "southeastasia", label: "Southeast Asia (Singapore)" }
    ]
  },
  {
    id: "supabase",
    name: "Supabase",
    shortDesc: "Supabase PostgreSQL Database & Real-time Cloud Storage Bucket sync",
    badgeTag: "Postgres & Storage",
    status: "Connected",
    logo: SupabaseLogo,
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-200",
    defaultConnectionName: "Supabase-Production-Sync",
    defaultRegion: "global",
    defaultBucket: "recordings",
    defaultAccessKey: "sb_anon_eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    defaultSecretKey: "sb_service_role_secret_key_890a...",
    lastConnected: "Jul 21, 2026 09:50:00",
    lastSync: "Just now",
    usedBytesText: "14.2 GB",
    totalCapacityText: "50.0 GB",
    usagePercentage: 28.4,
    availableText: "35.8 GB Available",
    healthStatusText: "Healthy & Active Syncing",
    regions: [
      { value: "global", label: "Global Supabase Cloud" },
      { value: "us-east-1", label: "US East (AWS Virginia)" },
      { value: "eu-central-1", label: "EU Central (Frankfurt)" }
    ]
  },
  {
    id: "gcp",
    name: "Google Cloud Platform",
    shortDesc: "Google Cloud Storage Bucket for multi-region redundant video backups",
    badgeTag: "GCS Bucket",
    status: "Not Connected",
    logo: GcpLogo,
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-700",
    badgeBorder: "border-rose-200",
    defaultConnectionName: "GCP-MultiRegion-Archive",
    defaultRegion: "us-central1",
    defaultBucket: "gcp-monitorpro-bucket",
    defaultAccessKey: "gcp_service_account_client_id_01",
    defaultSecretKey: "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkq...",
    lastConnected: "Jul 19, 2026 14:00:00",
    lastSync: "2 days ago (Idle)",
    usedBytesText: "0.0 GB",
    totalCapacityText: "200.0 GB",
    usagePercentage: 0,
    availableText: "200.0 GB Available",
    healthStatusText: "Disconnected (Not Configured)",
    regions: [
      { value: "us-central1", label: "us-central1 (Iowa)" },
      { value: "europe-west1", label: "europe-west1 (Belgium)" },
      { value: "asia-east1", label: "asia-east1 (Taiwan)" }
    ]
  }
];

interface HistoryEntry {
  id: string;
  timestamp: string;
  provider: string;
  action: string;
  status: "success" | "failed" | "warning";
  details: string;
}



function DatabaseConnectionsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProviderId, setSelectedProviderId] = useState<"aws" | "azure" | "supabase" | "gcp">("aws");
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [savingConnection, setSavingConnection] = useState(false);

  // Fetch db connections data from PostgreSQL REST API
  const { data: dbData } = useQuery({
    queryKey: ["db-connections"],
    queryFn: async () => {
      const res = await fetch("/api/db-connections");
      if (!res.ok) throw new Error("Failed to fetch db connections");
      return res.json();
    }
  });

  const connectedProviderId = dbData?.activeProviderId || selectedProviderId;

  // React Query Mutations
  const connectMutation = useMutation({
    mutationFn: async (provId: string) => {
      const res = await fetch(`/api/db-connections/${provId}/connect`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to connect provider");
      return res.json();
    },
    onSuccess: (data, provId) => {
      queryClient.invalidateQueries({ queryKey: ["db-connections"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      const prov = PROVIDERS.find(p => p.id === provId);
      toast({
        title: `${prov?.name || provId} Connected`,
        description: `${prov?.name || provId} is now connected as your active primary cloud storage provider.`,
      });
    }
  });

  const saveConfigMutation = useMutation({
    mutationFn: async ({ provId, formData }: { provId: string; formData: any }) => {
      const res = await fetch(`/api/db-connections/${provId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Failed to save config");
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["db-connections"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast({
        title: "Configuration Saved",
        description: `Updated configuration saved to database for ${variables.provId.toUpperCase()}.`,
      });
    }
  });

  const activeProvider = PROVIDERS.find(p => p.id === selectedProviderId) || PROVIDERS[0];

  // Isolated per-provider form state so inputs update dynamically when switching cards
  const [providerForms, setProviderForms] = useState<Record<string, {
    connectionName: string;
    region: string;
    accessKey: string;
    secretKey: string;
    bucketName: string;
  }>>({
    aws: {
      connectionName: PROVIDERS[0].defaultConnectionName,
      region: PROVIDERS[0].defaultRegion,
      accessKey: PROVIDERS[0].defaultAccessKey,
      secretKey: PROVIDERS[0].defaultSecretKey,
      bucketName: PROVIDERS[0].defaultBucket,
    },
    azure: {
      connectionName: PROVIDERS[1].defaultConnectionName,
      region: PROVIDERS[1].defaultRegion,
      accessKey: PROVIDERS[1].defaultAccessKey,
      secretKey: PROVIDERS[1].defaultSecretKey,
      bucketName: PROVIDERS[1].defaultBucket,
    },
    supabase: {
      connectionName: PROVIDERS[2].defaultConnectionName,
      region: PROVIDERS[2].defaultRegion,
      accessKey: PROVIDERS[2].defaultAccessKey,
      secretKey: PROVIDERS[2].defaultSecretKey,
      bucketName: PROVIDERS[2].defaultBucket,
    },
    gcp: {
      connectionName: PROVIDERS[3].defaultConnectionName,
      region: PROVIDERS[3].defaultRegion,
      accessKey: PROVIDERS[3].defaultAccessKey,
      secretKey: PROVIDERS[3].defaultSecretKey,
      bucketName: PROVIDERS[3].defaultBucket,
    },
  });

  // Sync DB values when dbData loads
  useEffect(() => {
    if (dbData?.providers && Array.isArray(dbData.providers)) {
      setProviderForms(prev => {
        const next = { ...prev };
        dbData.providers.forEach((p: any) => {
          if (p.providerId && next[p.providerId]) {
            next[p.providerId] = {
              connectionName: p.connectionName || next[p.providerId].connectionName,
              region: p.region || next[p.providerId].region,
              accessKey: p.accessKey || next[p.providerId].accessKey,
              secretKey: p.secretKey || next[p.providerId].secretKey,
              bucketName: p.bucketName || next[p.providerId].bucketName,
            };
          }
        });
        return next;
      });
    }
  }, [dbData]);

  const activeForm = providerForms[selectedProviderId];

  const updateForm = (field: string, value: string) => {
    setProviderForms(prev => ({
      ...prev,
      [selectedProviderId]: {
        ...prev[selectedProviderId],
        [field]: value
      }
    }));
  };

  // Backup & Retention State
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState("Daily");
  const [dataRetentionDays, setDataRetentionDays] = useState("90 Days");
  const [archiveBeforeDelete, setArchiveBeforeDelete] = useState(true);

  // Security Settings State
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [secureConnection, setSecureConnection] = useState(true);
  const [rotatingCredentials, setRotatingCredentials] = useState(false);

  const handleSelectProvider = (provId: "aws" | "azure" | "supabase" | "gcp") => {
    setSelectedProviderId(provId);
    connectMutation.mutate(provId);
  };

  const handleTestConnection = () => {
    setTestingConnection(true);
    fetch(`/api/db-connections/${selectedProviderId}/test`, { method: "POST" })
      .then(res => res.json())
      .then(data => {
        setTestingConnection(false);
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
        toast({
          title: `Test Connection — ${activeProvider.name}`,
          description: data.message || `Ping: 38ms to ${activeForm.region}. Handshake verified.`,
        });
      })
      .catch(() => {
        setTestingConnection(false);
        toast({ title: "Test Failed", description: "Could not reach endpoint.", variant: "destructive" });
      });
  };

  const handleConnectSave = () => {
    setSavingConnection(true);
    saveConfigMutation.mutate(
      { provId: selectedProviderId, formData: activeForm },
      {
        onSettled: () => setSavingConnection(false)
      }
    );
  };

  const handleRotateCredentials = () => {
    setRotatingCredentials(true);
    fetch(`/api/db-connections/${selectedProviderId}/rotate`, { method: "POST" })
      .then(res => res.json())
      .then(data => {
        setRotatingCredentials(false);
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
        toast({
          title: `Credentials Rotated — ${activeProvider.name}`,
          description: data.message || `New security tokens generated for ${activeForm.connectionName}.`,
        });
      })
      .catch(() => {
        setRotatingCredentials(false);
      });
  };


  return (
    <div className="space-y-8 max-w-5xl pb-12">
      {/* Compact Info Banner */}
      <div className="bg-indigo-900 text-white px-5 py-3.5 rounded-xl shadow-sm border border-indigo-800 flex items-center justify-between gap-4 min-h-[72px]">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <Database className="w-4.5 h-4.5 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-tight">Database & Cloud Storage Connections</h3>
            <p className="text-xs text-indigo-200/90 mt-0.5 leading-normal">
              Manage primary cloud endpoints, object storage buckets (AWS S3, Azure Blob, Supabase, GCP), sync frequency, and security encryption.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Cloud Provider Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Cloud className="w-4 h-4 text-indigo-600" /> 1. Cloud Storage & Database Providers
          </h3>
          <span className="text-xs text-slate-500 font-medium">Select a provider to connect. Only one provider is active at a time.</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROVIDERS.map((prov) => {
            const isSelected = selectedProviderId === prov.id;
            const isConnected = isSelected; // Single active connected provider rule
            const LogoComponent = prov.logo;

            return (
              <Card
                key={prov.id}
                onClick={() => handleSelectProvider(prov.id)}
                className={`cursor-pointer transition-all duration-200 rounded-xl overflow-hidden border ${
                  isSelected
                    ? "border-indigo-600 ring-2 ring-indigo-500/30 shadow-md bg-white"
                    : "border-slate-200 hover:border-indigo-300 hover:shadow-sm bg-white opacity-90 hover:opacity-100"
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0 p-1.5">
                      <LogoComponent className="w-7 h-7" />
                    </div>
                    {isConnected ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5">
                        Not Connected
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 flex items-center justify-between">
                      {prov.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {prov.shortDesc}
                    </p>
                  </div>

                  <div className="pt-1">
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={`w-full h-8 text-xs font-semibold rounded-lg ${
                        isSelected
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectProvider(prov.id);
                      }}
                    >
                      {isSelected ? "Active Selected" : "Connect Provider"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 2. Connection Configuration Form */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden transition-all">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                <Key className="w-4 h-4 text-indigo-600" /> 2. Connection Configuration — {activeProvider.name}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Configure API endpoints, region routing, bucket details, and authentication secrets for {activeProvider.name}
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-semibold px-2.5 py-1 rounded-md">
              {activeProvider.badgeTag}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Connection Name */}
            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-slate-700">Connection Name</Label>
              <Input
                value={activeForm.connectionName}
                onChange={(e) => updateForm("connectionName", e.target.value)}
                className="bg-slate-50 border-slate-200 h-10 text-sm focus-visible:ring-indigo-500 rounded-lg"
                placeholder="e.g. Production-Cloud-Storage"
              />
            </div>

            {/* Region Dropdown */}
            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-slate-700">Region</Label>
              <Select
                value={activeForm.region}
                onValueChange={(val) => updateForm("region", val)}
              >
                <SelectTrigger className="bg-slate-50 border-slate-200 h-10 text-sm focus:ring-indigo-500 rounded-lg">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {activeProvider.regions.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Access Key */}
            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-slate-700">Access Key / API Identifier</Label>
              <Input
                value={activeForm.accessKey}
                onChange={(e) => updateForm("accessKey", e.target.value)}
                className="bg-slate-50 border-slate-200 h-10 text-sm font-mono focus-visible:ring-indigo-500 rounded-lg"
                placeholder="AKIA..."
              />
            </div>

            {/* Secret Key Masked */}
            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-slate-700">Secret Key / Token</Label>
              <div className="relative">
                <Input
                  type={showSecretKey ? "text" : "password"}
                  value={activeForm.secretKey}
                  onChange={(e) => updateForm("secretKey", e.target.value)}
                  className="bg-slate-50 border-slate-200 h-10 text-sm font-mono pr-10 focus-visible:ring-indigo-500 rounded-lg"
                  placeholder="••••••••••••••••••••••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Bucket / Storage Name */}
            <div className="grid gap-2 md:col-span-2">
              <Label className="text-xs font-semibold text-slate-700">Bucket / Container Name</Label>
              <Input
                value={activeForm.bucketName}
                onChange={(e) => updateForm("bucketName", e.target.value)}
                className="bg-slate-50 border-slate-200 h-10 text-sm font-mono max-w-md focus-visible:ring-indigo-500 rounded-lg"
                placeholder="monitorpro-recordings-bucket"
              />
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              className="border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs h-10 rounded-lg gap-2"
              disabled={testingConnection}
              onClick={handleTestConnection}
            >
              {testingConnection ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <Wifi className="w-4 h-4 text-indigo-600" />}
              Test Connection
            </Button>

            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-5 rounded-lg shadow-sm gap-2"
              disabled={savingConnection}
              onClick={handleConnectSave}
            >
              {savingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save & Connect {activeProvider.name.split("(")[0]}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Connection Status Card */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden transition-all">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
              <Zap className="w-4 h-4 text-emerald-600" /> 3. Live Connection & Health Telemetry — {activeProvider.name.split("(")[0]}
            </CardTitle>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Operational
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 bg-white space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Current Provider */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Current Provider</span>
              <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600" />
                {activeProvider.name.split("(")[0]}
              </div>
            </div>

            {/* Connection Status */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Connection Status</span>
              <div className="font-bold text-sm text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Connected (Healthy)
              </div>
            </div>

            {/* Last Connected Time */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Last Connected</span>
              <div className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> {activeProvider.lastConnected}
              </div>
            </div>

            {/* Last Sync Time */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Last Sync Time</span>
              <div className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" /> {activeProvider.lastSync}
              </div>
            </div>
          </div>

          {/* Storage Usage Progress Bar */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-600" /> Storage Capacity Usage
              </span>
              <span className="text-slate-900 font-bold">
                {activeProvider.usedBytesText} / {activeProvider.totalCapacityText} ({activeProvider.usagePercentage}% Used)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${activeProvider.usagePercentage}%` }}></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>{activeProvider.availableText}</span>
              <span>Target: {activeForm.bucketName}</span>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* 4. Backup & Retention + 5. Security Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. Backup & Retention */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
              <RefreshCw className="w-4 h-4 text-indigo-600" /> 4. Backup & Retention Policies
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">Automated archival schedules and retention thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6 bg-white">
            <div className="flex items-center justify-between py-1 border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-slate-800">Auto Backup</Label>
                <p className="text-xs text-slate-500">Automatically sync recordings to cloud storage</p>
              </div>
              <Switch
                checked={autoBackup}
                onCheckedChange={setAutoBackup}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-slate-700">Backup Frequency</Label>
              <Select value={backupFrequency} onValueChange={setBackupFrequency}>
                <SelectTrigger className="bg-slate-50 border-slate-200 h-10 text-sm focus:ring-indigo-500 rounded-lg">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="Daily">Daily (Every 24 Hours)</SelectItem>
                  <SelectItem value="Weekly">Weekly (Sunday Night)</SelectItem>
                  <SelectItem value="Monthly">Monthly (1st of Month)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-slate-700">Data Retention Threshold</Label>
              <Select value={dataRetentionDays} onValueChange={setDataRetentionDays}>
                <SelectTrigger className="bg-slate-50 border-slate-200 h-10 text-sm focus:ring-indigo-500 rounded-lg">
                  <SelectValue placeholder="Select retention" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="30 Days">30 Days</SelectItem>
                  <SelectItem value="60 Days">60 Days</SelectItem>
                  <SelectItem value="90 Days">90 Days (Standard Compliance)</SelectItem>
                  <SelectItem value="180 Days">180 Days (Extended Vault)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-slate-100 pt-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-slate-800">Archive Before Delete</Label>
                <p className="text-xs text-slate-500">Compress & cold-store recordings before permanent purge</p>
              </div>
              <Switch
                checked={archiveBeforeDelete}
                onCheckedChange={setArchiveBeforeDelete}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* 5. Security Settings */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> 5. Database & Transport Security
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">Encryption standards and credential rotation controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 bg-white">
            <div className="flex items-center justify-between py-1 border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-slate-800">Encryption Enabled</Label>
                <p className="text-xs text-slate-500">Server-Side AES-256 encryption at rest</p>
              </div>
              <Switch
                checked={encryptionEnabled}
                onCheckedChange={setEncryptionEnabled}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-slate-800">Secure Connection (SSL/TLS)</Label>
                <p className="text-xs text-slate-500">Enforce TLS 1.3 encrypted socket transport</p>
              </div>
              <Switch
                checked={secureConnection}
                onCheckedChange={setSecureConnection}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>

            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
                <Lock className="w-4 h-4 text-indigo-600" /> Security Credential Lifecycle
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Rotate active IAM security keys, SAS tokens, or service credentials immediately to invalidate compromised connections.
              </p>
              <Button
                variant="outline"
                className="bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold text-xs h-9 rounded-lg gap-2"
                disabled={rotatingCredentials}
                onClick={handleRotateCredentials}
              >
                {rotatingCredentials ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Rotate Credentials Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 6. Connection History */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
            <Clock className="w-4 h-4 text-indigo-600" /> 6. Connection & Sync History Log
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">Recent integration events, credential changes, and automated backup logs</CardDescription>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-slate-100">
                  <TableHead className="text-xs font-semibold text-slate-500 py-3 pl-6">Timestamp</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 py-3">Provider</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 py-3">Action</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 py-3">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 py-3 pr-6">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!dbData?.history || !Array.isArray(dbData.history) || dbData.history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500 text-xs">
                      No connection history recorded in database yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  dbData.history.map((entry: any) => (
                    <TableRow key={entry.id || entry.historyId} className="border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <TableCell className="pl-6 text-xs font-medium text-slate-600 whitespace-nowrap">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : entry.timestamp}
                      </TableCell>

                      <TableCell className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                        {entry.providerName || entry.provider}
                      </TableCell>

                      <TableCell className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                        {entry.action}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {entry.status === "success" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[11px] font-bold uppercase tracking-wider border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" /> Failed
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-slate-600 pr-6 max-w-sm truncate" title={entry.details}>
                        {entry.details}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>

            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Settings page ───────────────────────────────────────────────────────

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>("configuration");

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h2>
        <p className="text-slate-500 text-sm mt-1">
          System configuration, API console, documentation, and database connections.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px whitespace-nowrap ${
              activeTab === id
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-2">
        {activeTab === "configuration"  && <ConfigurationPanel />}
        {activeTab === "api-console"    && <ApiConsole />}
        {activeTab === "documentation"  && <DocumentationPanel />}
        {activeTab === "db-connections" && <DatabaseConnectionsPanel />}
      </div>
    </div>
  );
}

