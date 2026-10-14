# rls-check

Instant Supabase RLS security scan. Point it at your SQL migrations, get an AI-powered audit report in seconds.

## Quick start

```bash
# Install globally
npm install -g @cekuu35/rls-check

# Or run once (no install)
npx @cekuu35/rls-check

# Or clone and run
git clone https://github.com/cekuu35/rls-check
cd rls-check && node cli.js
```

Run it in your project root where `supabase/migrations/` lives:

```bash
cd my-supabase-app
npx @cekuu35/rls-check
```

## What it finds

- **World-readable tables** — `USING(true)` policies with no `TO` clause (Postgres evaluates these for PUBLIC)
- **Missing RLS** — tables reachable by the API keys with no policies at all
- **Permissive overrides** — policies that quietly cancel restrictive ones
- **Service-role exposure** — credentials reachable from client code
- **Open storage buckets** — public access without owner checks

## What you get

```
🔴 [CRITICAL] public.live_locations
   Policy: live_locations_all
   Problem: TO-less policy — evaluated for PUBLIC, anon included
   Fix: create policy "live_locations_members" on public.live_locations
        for select to authenticated using (...)
```

Severity-ranked findings with the exact SQL to fix each one. If your policies are clean, it says so — no invented problems.

## Requirements

- An NVIDIA NIM API key (free at [build.nvidia.com](https://build.nvidia.com))
- Set it as `NVIDIA_API_KEY` environment variable

```bash
export NVIDIA_API_KEY=nvapi-...
# or on Windows:
set NVIDIA_API_KEY=nvapi-...
```

## Why this exists

I audit public Supabase repositories for RLS exposures — 100+ scanned to date. The most common class isn't "RLS off," it's policies that *look* right but quietly expose data: a missing `TO` clause, a blanket `using(true)`, a policy written by an AI tool that optimized for making the error go away. This tool catches that class.

For the write-up of these patterns with real cases: [3 RLS Leaks I Found in Production Apps](https://dev.to/cekuu35/3-supabase-rls-leaks-i-found-in-production-apps-this-week-and-the-30-second-check-for-each-4pk0)

## October 30, 2026

Supabase is removing default table grants on October 30. New tables in existing projects will throw `42501: permission denied` without explicit GRANTs. This tool checks for that class too — [the Migration Kit has the paste-ready fixes](https://cengokurtoglu.gumroad.com/l/supabase-oct30-migration-kit).

## Related tools

- [alexa-mcp-server](https://github.com/cekuu35/alexa-mcp-server) — the same audit as an MCP tool for AI agents
- [rls.cenkkurtoglu.com](https://rls.cenkkurtoglu.com) — free web-based RLS checker
- [Migration Rescue Kit](https://cengokurtoglu.gumroad.com/l/tzkggl) — fix migration version conflicts, drift, and broken pushes

## License

MIT
