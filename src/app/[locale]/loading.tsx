export default function Loading() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-xl border border-border p-8 animate-pulse">
        <div className="h-5 bg-muted rounded w-1/2 mx-auto mb-2" />
        <div className="h-3 bg-muted rounded w-2/3 mx-auto mb-8" />
        <div className="space-y-4">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
        <div className="h-10 bg-muted rounded mt-6" />
      </div>
    </main>
  );
}
