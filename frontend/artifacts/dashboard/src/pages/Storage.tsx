import { HardDrive, Cloud, Shield, Database, Workflow, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Storage() {
  return (
    <div className="space-y-6 max-w-[1000px] mx-auto pt-12 pb-8">
      <div className="text-center space-y-5 mb-16">
        <div className="w-20 h-20 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <Cloud className="w-10 h-10 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Cloud Storage Integration</h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
          Direct S3, Azure Blob, and Google Cloud Storage integrations are coming in Phase 2. 
          Currently all recordings are stored securely in managed cloud storage.
        </p>
      </div>

      <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 z-0 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-50 z-0 pointer-events-none" />
        
        <CardContent className="p-10 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="flex-1 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Bring Your Own Storage</h3>
              <p className="text-slate-500 leading-relaxed">
                Connect your own AWS S3 bucket to retain full control over your data, comply with data residency requirements, and manage retention policies directly.
              </p>
            </div>
            
            <ul className="space-y-4 mt-8">
              <li className="flex items-center gap-3 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-100 px-4 py-3 rounded-lg shadow-sm">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-indigo-700" />
                </div>
                KMS Envelope Encryption
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-100 px-4 py-3 rounded-lg shadow-sm">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4 text-emerald-700" />
                </div>
                Zero-knowledge architecture
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-100 px-4 py-3 rounded-lg shadow-sm">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Workflow className="w-4 h-4 text-blue-700" />
                </div>
                Automated lifecycle rules
              </li>
            </ul>
            
            <div className="pt-6">
              <Button disabled className="gap-2 w-full sm:w-auto bg-slate-100 text-slate-400 font-semibold h-11 px-8 rounded-xl cursor-not-allowed">
                Configure Integration (Coming Soon)
              </Button>
            </div>
          </div>
          
          <div className="flex-1 w-full bg-slate-900 rounded-2xl p-8 relative shadow-lg overflow-hidden border border-slate-800">
            {/* Background grid */}
            <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            {/* Architectural diagram mockup */}
            <div className="flex items-center justify-between gap-6 relative z-10 py-12">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-700 -translate-y-1/2 z-0" />
              
              <div className="relative z-10 bg-slate-800 border border-slate-700 p-4 rounded-xl text-center shadow-xl w-28">
                <MonitorSmartphone className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <div className="text-xs font-bold tracking-wider text-slate-300 uppercase">Agent</div>
              </div>
              
              <div className="relative z-10 bg-indigo-500/20 border border-indigo-500/50 p-4 rounded-xl text-center shadow-xl shadow-indigo-500/10 w-32 backdrop-blur-sm">
                <Shield className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
                <div className="text-xs font-bold tracking-wider text-indigo-300 uppercase">Recorder API</div>
              </div>
              
              <div className="relative z-10 bg-slate-800 border border-slate-700 p-4 rounded-xl text-center shadow-xl border-dashed w-28">
                <HardDrive className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                <div className="text-xs font-bold tracking-wider text-slate-400 uppercase">Your S3</div>
              </div>
            </div>
            
            <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] font-bold tracking-[0.2em] text-slate-600">
              ARCHITECTURE_PREVIEW
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
