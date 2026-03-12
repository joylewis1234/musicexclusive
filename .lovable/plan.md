

## Diagnosis

The published site shows "stuck on loading" -- meaning the HTML loads but React either never mounts or mounts but lazy chunks fail to load.

**Key finding from fetching the published URL:** The served HTML is severely stripped -- missing `<head>`, `<script>`, and boot-fallback content. Yet the user sees "Loading..." text, confirming the fallback IS present. This means JS begins to execute but React never completes its first render.

**Root cause:** The ErrorBoundary in `App.tsx` is nested INSIDE multiple providers (`AuthProvider`, `AudioPlayerProvider`, `PlayerProvider`). If any of these crash in the production build, no error boundary catches it. The `try/catch` in `main.tsx` only catches synchronous errors from `createRoot().render()` -- but React rendering is asynchronous, so provider crashes go uncaught, leaving the boot-fallback visible forever.

Additionally, there is no recovery mechanism for failed lazy chunk loads. If even one chunk 404s or returns wrong MIME type, `React.Suspense` hangs in its fallback state permanently.

## Plan

### 1. Add top-level ErrorBoundary in `main.tsx`
Wrap `<App />` with a simple inline error boundary class that catches crashes from ALL providers, not just the routes. Display the error visibly instead of showing "Loading..." forever.

### 2. Add lazy chunk error recovery in `App.tsx`  
Create a `lazyWithRetry` wrapper that retries failed dynamic imports once (with cache-bust), then shows an error message instead of hanging Suspense indefinitely.

### 3. Add diagnostic logging at boot milestones
Add `console.log` at: script entry, before render, App component mount, and AuthProvider initialization. This will surface in the next console snapshot if the issue persists.

### 4. Bump cache-bust to v8
Force a completely fresh production build.

### Technical details

**`main.tsx`** -- Add a `BootErrorBoundary` class component wrapping `<App />`:
```typescript
class BootErrorBoundary extends React.Component<{children: ReactNode}, {error: Error|null}> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  componentDidCatch(e: Error) { console.error("[BootErrorBoundary]", e); }
  render() {
    if (this.state.error) return <div style={...}>Boot error: {this.state.error.message}</div>;
    return this.props.children;
  }
}
```

**`App.tsx`** -- Replace direct `React.lazy()` calls with a retry wrapper:
```typescript
function lazyWithRetry(factory: () => Promise<any>) {
  return React.lazy(() => factory().catch(() => {
    // Retry once with cache-bust
    return new Promise(r => setTimeout(r, 1500))
      .then(() => factory())
      .catch(err => {
        console.error("[LazyLoad] Chunk failed:", err);
        return { default: () => <div>Failed to load page. <button onClick={() => location.reload()}>Reload</button></div> };
      });
  }));
}
```

Then replace all `React.lazy(() => import(...))` with `lazyWithRetry(() => import(...))`.

