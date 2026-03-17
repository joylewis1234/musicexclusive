

## Plan: Isolate Admin Login from Public Login Hub

The `/admin/login` page already exists and is fully functional. The only change needed is removing the Admin Login card from the public `/login` page so it only shows Fan and Artist options.

### Changes

**`src/pages/Login.tsx`**
- Remove the `Shield` import (no longer needed)
- Remove the entire Admin Login button/card block (lines ~80-101)
- Keep Fan Login and Artist Login cards unchanged

No other files need changes. The `/admin/login` route remains accessible by direct URL only — unlisted but functional.

