import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Hexagon, Activity, Lock, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogin } from "@workspace/api-client-react";

const loginSchema = z.object({
  email: z.string().min(1, "Email or username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const [_, setLocation] = useLocation();
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {

      const response = await loginMutation.mutateAsync({ data: values });
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      setLocation("/dashboard");
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-white flex font-sans">
      {/* Left Pane - Brand/Visuals */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-indigo-600 relative overflow-hidden text-white">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-900 opacity-90 z-0"></div>
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white opacity-5 blur-3xl z-0 pointer-events-none"></div>
        <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full bg-indigo-400 opacity-20 blur-3xl z-0 pointer-events-none"></div>
        
        {/* Content */}
        <div className="z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white shadow-lg">
            <Hexagon className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl leading-tight tracking-tight">MonitorPro</span>
            <span className="text-[11px] text-indigo-200 font-medium tracking-wide uppercase">Remote Monitoring</span>
          </div>
        </div>

        <div className="z-10 max-w-lg pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-100 text-[11px] font-bold uppercase tracking-wider mb-8 backdrop-blur-md">
            <Activity className="w-3.5 h-3.5" />
            <span>SYSTEM_SECURE_MODE: ACTIVE</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            Enterprise-grade <br /> session monitoring.
          </h1>
          <p className="text-indigo-100/90 text-lg leading-relaxed font-medium">
            Monitor, record, and audit employee desktop sessions across your entire organization with real-time analytics and secure cloud storage.
          </p>
        </div>
        
        <div className="z-10 flex justify-between items-center border-t border-indigo-500/30 pt-6">
          <div className="font-mono text-xs text-indigo-300 font-medium tracking-wider">
            v2.4.1-stable • ENCRYPTED_CONNECTION
          </div>
          <div className="text-xs text-indigo-300 font-medium">
            © 2025 Cybaemtech
          </div>
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative bg-slate-50">
        <div className="absolute top-8 right-8 flex items-center gap-2 font-mono text-xs font-bold text-slate-400 tracking-wider">
          <Lock className="w-3.5 h-3.5" />
          <span>SOC2 Type II Certified</span>
        </div>

        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Welcome Back</h2>
            <p className="text-slate-500 text-sm font-medium">Enter your credentials to access the command center.</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Work Email</label>
              <Input
                {...form.register("email")}
                placeholder="admin@company.com"
                className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-xl px-4 text-sm"
                data-testid="input-email"
              />
              {form.formState.errors.email && (
                <p className="text-xs font-bold text-red-500 mt-1 pl-1">{form.formState.errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <a href="#" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors">Forgot password?</a>
              </div>
              <Input
                {...form.register("password")}
                type="password"
                placeholder="••••••••"
                className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-xl px-4 font-mono"
                data-testid="input-password"
              />
              {form.formState.errors.password && (
                <p className="text-xs font-bold text-red-500 mt-1 pl-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 group"
              disabled={loginMutation.isPending}
              data-testid="button-submit"
            >
              {loginMutation.isPending ? "Authenticating..." : (
                <>
                  Authorize Access
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
            
            {loginMutation.isError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 font-bold text-sm mt-6 text-center">
                Invalid credentials. Access denied.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
