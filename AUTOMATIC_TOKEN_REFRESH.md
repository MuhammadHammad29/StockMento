# 🔄 Automatic Token Refresh Implementation

## Problem Solved

Previously, when a user's access token expired (after 15 minutes), API calls would fail with **401 Unauthorized** errors, showing error toasts and breaking functionality. Users would have to manually log in again.

---

## Solution Implemented

Added **automatic token refresh** to the API client (`lib/api/index.ts`) that:

1. ✅ Detects when access token has expired (401 response)
2. ✅ Automatically uses refresh token to get new access token
3. ✅ Retries the failed request with new token
4. ✅ Handles multiple simultaneous requests during refresh
5. ✅ Redirects to login only if refresh token is also expired

---

## How It Works

### 1. **Token Storage**
```typescript
// After login/verification:
localStorage.setItem('access_token', accessToken)      // 15 min expiry
localStorage.setItem('refresh_token', refreshToken)    // 30 day expiry
```

### 2. **Normal API Call Flow**
```
User makes API request
    ↓
Add Authorization: Bearer <access_token>
    ↓
If 200 OK → Return data ✅
```

### 3. **Expired Token Flow** (NEW)
```
User makes API request
    ↓
Add Authorization: Bearer <expired_token>
    ↓
Server returns 401 Unauthorized
    ↓
Detect 401 in apiCall() function
    ↓
Call POST /auth/refresh with refresh_token
    ↓
If refresh succeeds:
    ├─ Store new access_token
    ├─ Store new refresh_token
    ├─ Retry original request with new token
    └─ Return data ✅
    ↓
If refresh fails (refresh token expired):
    ├─ Clear all tokens
    ├─ Redirect to /signin
    └─ User must login again
```

---

## Code Changes

### **File: `lib/api/index.ts`**

#### **Added Token Refresh Function:**
```typescript
async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
  
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh token')
  }

  const data = await response.json()
  
  // Store new tokens
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.tokens.accessToken)
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.tokens.refreshToken)

  return data.tokens.accessToken
}
```

#### **Enhanced API Call Function:**
```typescript
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // ... prepare request with current access token ...
  
  let response = await fetch(url, { ...requestOptions })

  // Handle 401 - Token expired
  if (response.status === 401 && endpoint !== '/auth/refresh') {
    if (isRefreshing) {
      // Queue this request if refresh already in progress
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => {
        // Retry with new token
        return fetch(url, updatedRequestOptions)
      })
    }

    isRefreshing = true

    try {
      // Get new access token
      const newAccessToken = await refreshAccessToken()
      
      // Update request headers
      requestHeaders.set('Authorization', `Bearer ${newAccessToken}`)
      
      // Retry original request
      response = await fetch(url, { ...requestOptions })
      
      // Process any queued requests
      processQueue(null, newAccessToken)
    } catch (refreshError) {
      // Refresh failed - clear tokens and redirect
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
      window.location.href = '/signin'
      
      processQueue(refreshError, null)
      throw refreshError
    } finally {
      isRefreshing = false
    }
  }

  // ... return response data ...
}
```

#### **Updated Auth API Functions:**
```typescript
// Store tokens after successful login
userLogin: async (credentials) => {
  const response = await apiCall('/auth/login', { ... })
  
  // Save to localStorage
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.tokens.accessToken)
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.tokens.refreshToken)
  
  return response
}

// Clear tokens on logout
logout: async () => {
  const response = await apiCall('/auth/logout', { ... })
  
  // Remove from localStorage
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
  
  return response
}
```

---

## Request Queue System

Prevents multiple refresh attempts when several requests fail simultaneously:

```typescript
let isRefreshing = false
let failedQueue = []

// When 401 detected:
if (isRefreshing) {
  // Another refresh in progress - queue this request
  failedQueue.push({ resolve, reject })
  // Wait for refresh to complete
  // Then retry with new token
} else {
  // First 401 - start refresh process
  isRefreshing = true
  // Refresh token
  // Retry this request
  // Process all queued requests
  isRefreshing = false
}
```

---

## Timeline Example

```
00:00 - User logs in → Access token valid for 15 min
00:05 - User browses dashboard → Token still valid ✅
00:10 - User views profile → Token still valid ✅
00:16 - User edits profile → Token expired! 
        ↓
        Auto refresh triggered
        ↓
        New token obtained
        ↓
        Profile update succeeds ✅
00:20 - User continues using app → New token valid ✅
00:31 - User still active → Auto refresh again ✅
        ... continues seamlessly ...
```

---

## Benefits

### **User Experience:**
- ✅ **No interruptions** - Users stay logged in seamlessly
- ✅ **No error messages** - 401 errors handled silently
- ✅ **No manual login** - Automatic token refresh
- ✅ **Works across tabs** - Shared localStorage

### **Security:**
- ✅ **Short-lived access tokens** (15 min) - Less risk if stolen
- ✅ **Long refresh token lifespan** (30 days) - Convenient
- ✅ **Automatic cleanup** - Expired refresh token → force login
- ✅ **Single refresh attempt** - Queue prevents spam

### **Developer Experience:**
- ✅ **Transparent** - Components don't need to handle refresh
- ✅ **Centralized** - All API calls use same logic
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Easy to debug** - Clear console logs

---

## Testing Scenarios

### **Scenario 1: Normal Usage**
1. User logs in
2. Access token valid
3. All API calls work normally ✅

### **Scenario 2: Token Expires During Session**
1. User logged in for 20 minutes
2. Access token expired
3. User clicks "Edit Profile"
4. API call fails with 401
5. **Auto refresh triggered**
6. New token obtained
7. Edit profile succeeds ✅
8. User doesn't notice anything!

### **Scenario 3: Multiple Simultaneous Requests**
1. User makes 5 API calls at once
2. All fail with 401 (token expired)
3. First request triggers refresh
4. Other 4 requests queued
5. Refresh succeeds
6. All 5 requests retried with new token ✅
7. All succeed!

### **Scenario 4: Refresh Token Expired**
1. User away for 31 days
2. Both tokens expired
3. User returns and clicks anything
4. Refresh attempt fails
5. **Redirected to /signin**
6. User must log in again ✅

---

## Configuration

### **Token Expiry Settings** (`.env`):
```env
JWT_ACCESS_EXPIRES=900       # 15 minutes (900 seconds)
JWT_REFRESH_EXPIRES=2592000  # 30 days (2,592,000 seconds)
```

### **Storage Keys** (`lib/data-utils.ts`):
```typescript
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
}
```

---

## Backend Requirements

The backend must have a working `/auth/refresh` endpoint:

```typescript
// POST /auth/refresh
{
  "refreshToken": "eyJhbGci..."
}

// Response:
{
  "tokens": {
    "accessToken": "eyJnEw...",  // New 15-min token
    "refreshToken": "eyJuZx..."  // New 30-day token
  },
  "user": { ... }
}
```

✅ **Already implemented** in `backend/src/auth/auth.service.ts`

---

## For Your Viva

### **Key Points to Explain:**

1. **Problem:** "Access tokens expire after 15 minutes for security, causing API failures"

2. **Solution:** "Implemented automatic token refresh that detects 401 errors and transparently obtains new tokens"

3. **How it works:** "When API call fails with 401, we use the refresh token to get a new access token and retry the request"

4. **Request queue:** "If multiple requests fail simultaneously, we queue them and refresh only once to avoid race conditions"

5. **Security:** "Short access token expiry reduces risk if stolen, while long refresh token lifespan provides good UX"

6. **Fallback:** "If refresh token is also expired, we clear storage and redirect to login page"

---

**Last Updated:** October 30, 2025
**Status:** ✅ Fully Implemented & Tested
