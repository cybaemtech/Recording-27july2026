import { useGetActivityReport, useGetStorageReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from "recharts";
import { BarChart3, LineChart, FileText } from "lucide-react";

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function Reports() {
  const { data: activityData, isLoading: activityLoading } = useGetActivityReport();
  const { data: storageData, isLoading: storageLoading } = useGetStorageReport();

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Analytics & Reports</h2>
          <p className="text-slate-500 text-sm mt-1">System utilization and historical telemetry.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 shadow-sm">
          <FileText className="w-4 h-4 text-indigo-500" />
          <span className="font-semibold">Export PDF</span>
        </div>
      </div>

      <div className="grid gap-8">
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
              <LineChart className="w-4 h-4 text-indigo-500" />
              Session Activity (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[400px] w-full">
              {activityLoading ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium">Loading chart data...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorUploaded" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8" 
                      fontSize={12} 
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return `${d.getMonth()+1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={12} 
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontWeight: 500 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px', fontWeight: 500 }} />
                    <Area type="monotone" name="Total Sessions" dataKey="sessionCount" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 6, strokeWidth: 0, fill: '#6366F1' }} />
                    <Area type="monotone" name="Recordings Uploaded" dataKey="recordingCount" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorUploaded)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10B981' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Storage Utilization by OS
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[400px] w-full">
              {storageLoading ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium">Loading chart data...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={storageData || []} margin={{ top: 20, right: 30, left: 40, bottom: 5 }} barSize={60}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="os" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} tickFormatter={(val) => formatBytes(val)} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [formatBytes(val), 'Storage Used']}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="storageBytes" name="Storage Used" radius={[6, 6, 0, 0]}>
                      {storageData?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? "#4F46E5" : index === 1 ? "#0EA5E9" : "#F59E0B"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
