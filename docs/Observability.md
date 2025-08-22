### Observability

This app includes:
- Request ID propagation
- Structured JSON logs
- Central error formatter
- Basic analytics events

### Request ID

- Middleware adds `x-request-id` header if missing and attaches it to `req`.
- Propagated in responses and included in all logs.

### Logs

- All HTTP requests under `/api` are logged as JSON:
  - Fields: `ts`, `level`, `msg`, `reqId`, `path`, `method`, `statusCode`, `durationMs`.
- Errors are logged with `err` object: `name`, `message`, `stack`.

Sample request log:
```json
{"ts":"2025-08-22T22:50:00.000Z","level":"info","msg":"http_request","reqId":"c9b9...","path":"/api/lists","method":"POST","statusCode":200,"durationMs":37}
```

Sample error log:
```json
{"ts":"2025-08-22T22:50:01.100Z","level":"error","msg":"http_error","reqId":"c9b9...","path":"/api/lists/123","method":"PATCH","err":{"name":"ApiError","message":"FORBIDDEN"}}
```

### Error Formatter

- Central Express error handler converts thrown errors to a typed JSON error payload:
  - `{ error: { code: string, message: string } }`

### Analytics

- Emitted as JSON logs with `msg=analytics` and event-specific `meta`:
  - `list_created`, `invite_sent`, `invite_accepted`, `subscription_updated`.

Sample analytics logs:
```json
{"ts":"2025-08-22T22:50:05.000Z","level":"info","msg":"analytics","reqId":"c9b9...","meta":{"type":"list_created","listId":"lst_123","userId":"usr_1"}}
{"ts":"2025-08-22T22:50:06.000Z","level":"info","msg":"analytics","reqId":"c9b9...","meta":{"type":"invite_sent","listId":"lst_123","inviterId":"usr_1","channel":"email"}}
{"ts":"2025-08-22T22:50:07.000Z","level":"info","msg":"analytics","reqId":"c9b9...","meta":{"type":"subscription_updated","userId":"usr_1","status":"active"}}
```

### Tracing / External Sinks (Optional)

- You can ship logs to Logflare or Sentry by replacing the logger `console.log(JSON.stringify(...))` with their SDKs.
- Include `reqId` for correlation across services.