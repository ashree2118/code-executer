# Code Executer Server

## Submit Benchmarks

The benchmark scripts send repeated `POST` requests to the existing `/api/submit` endpoint. They do not change application business logic.

Start the API, worker, Redis, Postgres, and Docker runtime first:

```bash
npm run dev
npm run worker
```

Run the cached benchmark:

```bash
npm run benchmark:cached
```

This submits the same Python program repeatedly. If the result is not already cached, the script sends one warm-up submit request, waits for the worker to populate Redis, then verifies the cache with another submit request before measuring.

Run the uncached benchmark:

```bash
npm run benchmark:uncached
```

This submits a unique Python program for each request, so every request should miss the result cache and follow the normal queue path.

Optional environment variables:

```bash
BENCHMARK_URL=http://localhost:3000/api/submit
BENCHMARK_REQUESTS=8
BENCHMARK_CONCURRENCY=3
BENCHMARK_REQUEST_TIMEOUT_MS=30000
BENCHMARK_WARMUP_DELAY_MS=15000
```

The default request count is kept below the app's default 10 requests/minute rate limit. Cached mode may use two extra submit requests for warm-up and verification. For larger benchmark runs, raise `RATE_LIMIT_REQUESTS` on the API process, then set a larger `BENCHMARK_REQUESTS` value.

Each benchmark prints:

- Requests/sec: higher is better.
- Average latency: mean response time across all requests.
- p50: half of requests completed at or below this latency.
- p95: 95% of requests completed at or below this latency.
- p99: 99% of requests completed at or below this latency.

Cached results should show lower latency and higher throughput than uncached results because cache hits return immediately from Redis instead of enqueueing execution work.
