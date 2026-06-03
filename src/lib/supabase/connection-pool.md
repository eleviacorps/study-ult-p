# Connection Pool Configuration

## Supabase Dashboard Settings

Navigate to **Project Settings → Database → Connection Pooling**.

### Recommended Settings

| Setting | Hobby Plan | Pro Plan |
|---------|-----------|----------|
| Mode | **Transaction** | Transaction |
| Pool Size | **15** | 30+ |
| Default Pool Size | **15** | 30 |
| PgBouncer Status | **Enabled** | Enabled |

### Why Transaction Mode?
- Allows multiplexing multiple requests within a single serverless function invocation
- Each `supabase.from(...).select()` or `.insert()` borrows a connection for the duration of the query only, not the entire Edge Function lifetime
- Next.js Edge Functions that make 10 parallel queries (like `/api/sync` GET) can share 3-5 pool connections instead of needing 10

## Application-Level Connection Management

1. **Keep alive**: Supabase JS client handles keep-alive automatically
2. **Query batching**: All API routes use batch upserts (array-based inserts) — this keeps connection borrow time short
3. **Promise.all parallelization**: The `/api/sync` GET uses `Promise.all` for 10 parallel queries — these share the pool efficiently because each query borrows a connection for milliseconds

## Monitoring

Monitor pool utilization in Supabase Dashboard:
- **Database → Connections**: Current open / max connections
- If `waiting_connections` is consistently > 0, increase pool size
- If `idle_in_transaction` connections grow, switch to Transaction mode
