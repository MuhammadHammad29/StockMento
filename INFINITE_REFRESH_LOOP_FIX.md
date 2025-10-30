# Infinite Refresh Loop Fix

## Problem
When a user deleted their account and then tried to login again with the deleted account credentials, the application would enter an infinite page refresh loop instead of showing a simple "Invalid credentials" error.

## Root Cause
The bug was in `lib/api/index.ts` in the `apiCall` function:

1. User tries to login with deleted account credentials
2. Backend `/auth/login` endpoint returns **401 Unauthorized** (because the identity doesn't exist)
3. The `apiCall` function saw the 401 status and **assumed it was an expired access token**
4. It attempted to refresh the access token using the `/auth/refresh` endpoint
5. The refresh failed (because the user/session was deleted)
6. On refresh failure, the code executed `window.location.href = '/signin'` to redirect to login
7. This caused a hard page reload, which triggered the flow again → **infinite loop**

## The Core Issue
**The API client couldn't distinguish between two different types of 401 errors:**
- **Authentication failure** (wrong credentials, account doesn't exist) → Should show error, NOT refresh
- **Expired token** (valid user but token expired) → Should refresh token automatically

The login endpoint was incorrectly triggering token refresh logic.

## Solution
Updated `lib/api/index.ts` to exclude authentication endpoints from automatic token refresh:

```typescript
// Before (incorrect):
if (response.status === 401 && isBrowser && endpoint !== '/auth/refresh') {
  // Try to refresh token...
}

// After (correct - with helper function for maintainability):
function isAuthenticationEndpoint(endpoint: string): boolean {
  const authEndpoints = [
    '/auth/login',           // User login - 401 means invalid credentials
    '/auth/register',        // User registration - 401 means validation error
    '/auth/refresh',         // Token refresh - 401 means refresh token invalid (prevents infinite loop)
    '/admin/auth/login',     // Admin login - 401 means invalid credentials
  ]
  
  return authEndpoints.some(authEndpoint => endpoint === authEndpoint)
}

if (response.status === 401 && isBrowser && !isAuthenticationEndpoint(endpoint)) {
  // Try to refresh token...
}
```

### Why `/auth/refresh` Must Be Excluded
**Critical:** The `/auth/refresh` endpoint MUST be excluded to prevent infinite recursion:

1. If an access token expires → API call gets 401
2. `apiCall` tries to refresh → calls `/auth/refresh` endpoint
3. **If refresh token is also invalid** → `/auth/refresh` returns 401
4. **Without exclusion:** `apiCall` sees 401 from `/auth/refresh` → tries to refresh AGAIN → infinite loop 🔄
5. **With exclusion:** When `/auth/refresh` returns 401, it throws an error, caught in `catch (refreshError)` block, which clears tokens and redirects to signin ✅

### Why Use a Helper Function
Instead of hardcoding the check inline, we use `isAuthenticationEndpoint()` for:
- **Maintainability:** Easy to add new auth endpoints in one place
- **Readability:** Clear documentation of why each endpoint is excluded
- **Flexibility:** Can be extended to support pattern matching if needed

## Excluded Endpoints
The following endpoints are now excluded from automatic token refresh on 401:
- `/auth/login` - User login (401 = invalid credentials)
- `/auth/register` - User registration (401 = validation error)  
- `/auth/refresh` - **Token refresh (401 = refresh token invalid/expired) - MUST exclude to prevent infinite recursion**
- `/admin/auth/login` - Admin login (401 = invalid credentials)

**Important:** Each endpoint is documented in the `isAuthenticationEndpoint()` helper function for easy maintenance.

## Result
Now when a user tries to login with invalid or deleted account credentials:
1. Backend returns 401 with message "Invalid email or password"
2. Frontend receives the 401 and **does NOT** try to refresh tokens
3. Error is properly caught in the signin page
4. User sees a toast notification with the error message
5. **No infinite loop** ✅

## Testing
To verify the fix:
1. Create a test account and login
2. Delete the account from the profile page
3. Try to login again with the deleted credentials
4. Expected: Error toast shows "Invalid email or password" (no page refresh loop)
5. Expected: Try with completely wrong credentials → same behavior (error toast, no loop)

## Related Files
- `lib/api/index.ts` - Fixed automatic token refresh logic
- `backend/src/auth/auth.service.ts` - Login endpoint that returns 401 for invalid credentials
- `app/signin/page.tsx` - Login page that catches and displays the error
