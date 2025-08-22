### Auth Flow (Email + SMS OTP)

```mermaid
flowchart TD
  A[Start] --> B{User chooses login method}
  B -->|Email| C[Enter email]
  C --> D[Auth.js Email Provider sends magic link via Resend]
  D --> E[User clicks magic link]
  E --> F[Auth.js verifies token, creates JWT session]
  F --> G[Set httpOnly cookie sameSite=lax]
  G --> H[Redirect to app]

  B -->|SMS OTP| I[Enter phone number]
  I --> J[POST /api/auth/sms/request]
  J --> K[Twilio sends OTP]
  K --> L[User enters OTP]
  L --> M[Auth.js Credentials Provider verifies code]
  M --> F

  H --> N{Has invitation token?}
  N -->|Yes| O[POST /api/invitations/accept/:token]
  O --> P[Assign list role (VIEWER) and permissions]
  P --> Q[User lands on list]
  N -->|No| R[User lands on home]
```