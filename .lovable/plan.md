

## Harden `user_roles` RLS + Move Role Assignment Server-Side

### Overview
This change closes a privilege escalation vulnerability where any authenticated user can self-assign any role (including `artist` or `admin`) by calling `supabase.from("user_roles").insert(...)` directly. We will:

1. Replace the permissive "System can insert roles" RLS policy with a service-role-only policy
2. Create a database trigger that auto-assigns the `fan` role on every new signup
3. Remove all client-side `user_roles` inserts from the frontend code

### Why this is safe

- **Fans**: The new trigger automatically grants `fan` on signup -- no client insert needed.
- **Artists**: The `finalize-artist-setup` edge function already uses the service role key to upsert the artist role, so it will continue working.
- **Admins**: The `ensure_admin_role` trigger already handles admin assignment based on an email allowlist.
- **Google OAuth fans**: The trigger fires on `auth.users` INSERT, so OAuth signups also get the `fan` role automatically.

### Changes

#### 1. Database migration (SQL)

```sql
-- Drop the unsafe self-assign policy
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;

-- Only service_role can manage roles (insert/update/delete/select)
CREATE POLICY "Service role can manage roles"
  ON public.user_roles
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- New trigger function: auto-assign fan role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'fan')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user_role();
```

#### 2. `src/contexts/AuthContext.tsx` -- Remove role insert from `signUp`

The `signUp` function currently inserts into `user_roles` after `supabase.auth.signUp`. This block will be removed entirely. The function signature keeps the `selectedRole` parameter (used to set `activeRole` in memory), but no longer writes to the database. The trigger handles `fan`, and `finalize-artist-setup` handles `artist`.

Before:
```typescript
if (data.user) {
  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({ user_id: data.user.id, role: selectedRole });
  if (roleError) { ... throw roleError; }
  setRole(selectedRole);
  setUserRoles(prev => ...);
}
```

After:
```typescript
if (data.user) {
  // Role is assigned by database trigger (fan) or edge function (artist).
  // Just set the local active role for immediate UI routing.
  setRole(selectedRole);
  setUserRoles(prev =>
    prev.includes(selectedRole) ? prev : [...prev, selectedRole]
  );
}
```

#### 3. `src/pages/auth/FanAuth.tsx` -- Remove `ensureFanRole` function

The `ensureFanRole` function checks for and inserts a fan role from the client. With the trigger in place, this is unnecessary and will fail under the new RLS. The function will be removed, and all calls to it (3 places in `handleSubmit`) will be deleted.

#### 4. `src/pages/auth/ArtistAuth.tsx` -- No changes needed

ArtistAuth calls `signUp(email, password, "artist", displayName)` which flows through AuthContext. Since we are removing the insert from AuthContext, ArtistAuth will still work. The artist role is assigned later via the application/approval flow, not at signup time. The signup note already says "After signing up, you can apply to become an exclusive artist."

### Files modified
| File | Change |
|------|--------|
| New migration SQL | Drop old policy, create service-role policy, create trigger |
| `src/contexts/AuthContext.tsx` | Remove `user_roles` insert from `signUp` |
| `src/pages/auth/FanAuth.tsx` | Remove `ensureFanRole` function and its 3 call sites |

