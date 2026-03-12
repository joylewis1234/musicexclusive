

## Clean Rebuild Plan

**Problem**: Both preview and published are showing black screens, suggesting a runtime boot failure before React mounts.

**Root cause hypothesis**: Duplicate React instances (missing `react/jsx-runtime` from Vite dedupe) causing hooks to see null dispatchers, crashing silently before any UI renders. The pure-black `bg-background` makes even a crash indistinguishable from "loading."

**Changes**:

1. **`vite.config.ts`** -- Add `react/jsx-runtime` to the dedupe array (known fix for duplicate React crashes):
   ```
   dedupe: ["react", "react-dom", "react/jsx-runtime"]
   ```

2. **`index.html`** -- Add an inline visible fallback inside `#root` so users see something even if React crashes. Bump cache-bust to v7:
   ```html
   <div id="root">
     <div id="boot-fallback" style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#000;color:#fff;font-family:sans-serif;">
       <p>Loading...</p>
     </div>
   </div>
   ```
   React's `createRoot().render()` will replace this automatically on successful boot.

3. **`src/main.tsx`** -- Wrap the render call in a try/catch that surfaces errors visibly instead of silently failing. Bump to v7:
   ```typescript
   try {
     createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
   } catch (e) {
     document.getElementById("root")!.innerHTML = `<div style="color:#fff;padding:2rem;">Boot error: ${e}</div>`;
   }
   ```

These three changes together ensure: (a) the most common cause of silent crashes is eliminated, (b) if React still fails to boot, the user sees an error message instead of black, and (c) the build pipeline is forced to produce fresh assets.

