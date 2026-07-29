import { useState } from "react";
import { useListUsers, useInviteUser, useDeleteUser } from "@workspace/api-client-react";
import { Search, UserPlus, Shield, ChevronUp, ChevronDown, ChevronsUpDown, User, Download, Monitor, Apple, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type SortField = "name" | "role" | "department" | "lastSeenAt" | "isOnline";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 ml-1 text-slate-300" />;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3 ml-1 text-indigo-600" />
    : <ChevronDown className="w-3 h-3 ml-1 text-indigo-600" />;
}

export default function Users() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const limit = 20;

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePlatform, setInvitePlatform] = useState("windows");
  const [inviteLink, setInviteLink] = useState("");

  const { toast } = useToast();
  const { mutate: inviteUser, isPending: isInviting } = useInviteUser({
    mutation: {
      onSuccess: (data: any) => {
        toast({ title: "Success", description: "The invitation has been sent successfully." });
        if (data?.downloadUrl) {
          const publicUrl = window.location.origin + `/api/download/agent/${invitePlatform}`;
          setInviteLink(publicUrl);
        } else {
          setIsInviteOpen(false);
          setInviteEmail("");
        }
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.response?.data?.error || "Failed to send invitation.", variant: "destructive" });
      }
    }
  });

  const queryClient = useQueryClient();
  const { mutate: deleteUser } = useDeleteUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "User deleted successfully." });
        queryClient.invalidateQueries({ queryKey: ["users"] });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.response?.data?.error || "Failed to delete user.", variant: "destructive" });
      }
    }
  });

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUser({ id });
    }
  };

  const handleInvite = () => {
    if (!inviteEmail) return;
    inviteUser({ data: { email: inviteEmail, platform: invitePlatform as "windows" | "mac" } });
  };

  const { data: response, isLoading } = useListUsers({
    page,
    limit,
    search: search || undefined,
  });

  let users = response?.data || [];
  const total = response?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Client-side filter by role/status
  if (roleFilter !== "all") users = users.filter((u: any) => u.role === roleFilter);
  if (statusFilter === "online") users = users.filter((u: any) => u.isOnline);
  if (statusFilter === "offline") users = users.filter((u: any) => !u.isOnline);

  // Client-side sort
  users = [...users].sort((a: any, b: any) => {
    let va: any, vb: any;
    if (sortField === "name") { va = a.name; vb = b.name; }
    else if (sortField === "role") { va = a.role; vb = b.role; }
    else if (sortField === "department") { va = a.department ?? ""; vb = b.department ?? ""; }
    else if (sortField === "lastSeenAt") { va = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0; vb = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0; }
    else if (sortField === "isOnline") { va = a.isOnline ? 1 : 0; vb = b.isOnline ? 1 : 0; }
    if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === "asc" ? va - vb : vb - va;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Users</h2>
          <p className="text-slate-500 text-sm mt-1">Manage personnel and agent installations.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
            {total} users
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm font-medium gap-2">
                <Download className="w-4 h-4" /> Download Agent
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              <DropdownMenuItem 
                className="gap-2 cursor-pointer"
                onClick={() => window.open(window.location.origin + "/api/download/agent/windows", "_blank")}
              >
                <Monitor className="w-4 h-4 text-slate-500" />
                <span>Windows</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="gap-2 cursor-pointer"
                onClick={() => window.open(window.location.origin + "/api/download/agent/mac", "_blank")}
              >
                <Apple className="w-4 h-4 text-slate-500" />
                <span>macOS</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isInviteOpen} onOpenChange={(open) => {
            setIsInviteOpen(open);
            if (!open) {
              setTimeout(() => setInviteLink(""), 300);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm font-medium gap-2">
                <UserPlus className="w-4 h-4" /> Invite User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{inviteLink ? "Invitation Link" : "Invite User"}</DialogTitle>
                <DialogDescription>
                  {inviteLink ? "Share this link with the user to download the agent." : "Send an email invitation with the agent download link to a user."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {inviteLink ? (
                  <div className="space-y-2">
                    <Label>Download Link</Label>
                    <Input readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="user@example.com" 
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="platform">Platform</Label>
                      <Select value={invitePlatform} onValueChange={setInvitePlatform}>
                        <SelectTrigger id="platform">
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="windows">Windows</SelectItem>
                          <SelectItem value="mac">macOS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                {inviteLink ? (
                  <Button onClick={() => { setIsInviteOpen(false); setInviteLink(""); }}>Close</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                    <Button onClick={handleInvite} disabled={!inviteEmail || isInviting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      {isInviting ? "Sending..." : "Send Invite"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center gap-4 flex-wrap bg-white">
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              className="pl-10 h-10 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-lg text-sm"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36 h-10 bg-slate-50 border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36 h-10 bg-slate-50 border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
          {(search || roleFilter !== "all" || statusFilter !== "all") && (
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 h-10 px-4 rounded-lg font-medium"
              onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); setPage(1); }}>
              Clear
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 pl-6 cursor-pointer select-none group" onClick={() => handleSort("name")}>
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">User <SortIcon active={sortField === "name"} dir={sortDir} /></span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group" onClick={() => handleSort("role")}>
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">Role <SortIcon active={sortField === "role"} dir={sortDir} /></span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group" onClick={() => handleSort("department")}>
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">Department <SortIcon active={sortField === "department"} dir={sortDir} /></span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group" onClick={() => handleSort("isOnline")}>
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">Status <SortIcon active={sortField === "isOnline"} dir={sortDir} /></span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group" onClick={() => handleSort("lastSeenAt")}>
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">Last Seen <SortIcon active={sortField === "lastSeenAt"} dir={sortDir} /></span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 pr-6 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-400 text-sm font-medium">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-500 text-sm">
                    No users found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user: any) => (
                  <TableRow key={user.id} className="border-slate-100 hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    onClick={() => window.location.href = `/users/${user.id}`}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3 py-1">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-[11px] shadow-sm shrink-0">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span className="text-[11px] font-bold text-white uppercase">{user.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-slate-900">{user.name}</div>
                          <div className="text-[11px] text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.role === "admin" ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold uppercase tracking-wider">
                          <Shield className="w-3 h-3" /> Admin
                        </div>
                      ) : user.role === "manager" ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-bold uppercase tracking-wider">
                          <User className="w-3 h-3" /> Manager
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider shadow-sm">
                           User
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-600">{user.department || "—"}</TableCell>
                    <TableCell>
                      {user.isOnline ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 border-slate-200 bg-white uppercase text-[10px] tracking-wider font-bold shadow-sm">Offline</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-500">
                      {user.lastSeenAt ? formatDistanceToNow(new Date(user.lastSeenAt), { addSuffix: true }) : "Never"}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={(e) => handleDelete(e, user.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs font-medium text-slate-500">
            {total > 0 ? `Showing ${(page - 1) * limit + 1} to ${Math.min(page * limit, total)} of ${total} entries` : "0 entries"}
          </div>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
            <div className="flex items-center justify-center px-4 h-8 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm">
              Page {page} of {Math.max(1, totalPages)}
            </div>
            <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
