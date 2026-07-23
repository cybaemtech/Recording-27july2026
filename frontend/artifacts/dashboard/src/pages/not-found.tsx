export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="font-mono text-9xl font-bold text-muted-foreground/20">404</div>
      <h2 className="text-2xl font-semibold mt-4 tracking-tight">Endpoint Not Found</h2>
      <p className="text-muted-foreground mt-2">The requested resource could not be located on this server.</p>
      <a href="/" className="mt-8 px-4 py-2 bg-primary/10 text-primary rounded border border-primary/20 hover:bg-primary/20 transition-colors">
        Return to Dashboard
      </a>
    </div>
  );
}
