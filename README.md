# Astralmarket

Astralmarket is a market-intelligence product for the Bags.fm ecosystem.

Live product: [astralmarket.xyz](https://www.astralmarket.xyz/)

It turns Bags launch, pool, and migration activity into a familiar market dashboard: ranked tokens, price movement, market capitalization, 7-day chart context, creator metadata, and token-level intelligence built around Bags-native mechanics.

## Why This Exists

Bags has a fast-moving launch environment. New tokens appear, pools become active, and some markets migrate, but the information needed to evaluate those moves is scattered across launch feeds, pool state, token metadata, market pairs, and raw price data.

Astralmarket brings those signals into one place.

The goal is simple: make Bags markets legible.

## What The Product Does

Astralmarket provides:

- A Bags-focused market dashboard with ranked token rows.
- Price, 1h, 24h, and 7d movement for cached market data.
- 24h volume, market capitalization, and token imagery from market enrichment.
- 7-day sparkline history built from backend market snapshots.
- Token detail pages with larger market charts, source data, pool status, and creator context.
- Separation between Bags launch signals and broader crypto news context.
- Backend sync coverage reporting so market data freshness can be evaluated.

This is not a generic crypto table with a Bags label added on top. The product model is built around Bags-specific states: fresh launches, live DBC pools, and migrated DAMM v2 markets.

## Product Experience

The web app is designed to feel familiar to anyone who has used market discovery products like CoinGecko or DexScreener, while still making Bags-specific context visible.

Key screens:

- **Market leaderboard**: scan token rank, price, movement, volume, market cap, and recent trend in one row.
- **Highlights**: quickly identify trending Bags tokens and top gainers.
- **Latest signals**: separate launch-feed activity from broader market news.
- **Coin detail**: inspect token price history, pool data, route/source details, creator info, and derived Bags market signal.

The interface is intentionally dense and operational rather than promotional. The target user is trying to compare markets, not read marketing copy.

## Technical Approach

Astralmarket is a pnpm/Turbo monorepo with a separated web and backend architecture:

```text
apps/web       Next.js web app
apps/backend   Fastify API and sync worker
packages/*     Shared UI and repo configuration
```

Runtime architecture:

```text
Web app
  -> cached server-side market fetches
    -> Fastify API
      -> Postgres/Supabase cache
      -> Bags API
      -> DexScreener
      -> Solana RPC
      -> optional FMP crypto news
```

The backend is cache-first. It synchronizes market state into Postgres, then serves fast read endpoints to the web app. Live external API calls are used as fallback paths, not as the primary request path for every user visit.

## Data Pipeline

The backend sync process:

1. Reads Bags token launch feed and pool data.
2. Classifies tokens by Bags market state.
3. Enriches tokens with DexScreener price, volume, liquidity, market-cap, and image data.
4. Uses Solana RPC supply data for fallback market-cap calculations.
5. Writes market snapshots for historical charts and 7-day movement.
6. Derives missing price-change windows when external market data is incomplete.
7. Stores Bags launch signals and optional market news separately.
8. Reports sync coverage, including tokens scanned, market data hits, prices found, market caps found, and derived changes.

This gives evaluators a clear way to judge both the product surface and the reliability of the underlying market data.

## API Surface

Primary backend routes:

```text
GET  /health
GET  /v1/bags/category
GET  /v1/bags/market?page=1&limit=50
GET  /v1/bags/coins/:identifier
POST /v1/admin/sync/bags
```

The public market endpoints are intentionally simple and stable. The admin sync endpoint is protected by a secret header in production.

## What Makes It Different

Astralmarket is built around Bags market structure instead of generic token listings.

Differentiators:

- Bags-native pool state: fresh launch, live DBC, migrated DAMM v2.
- Cached historical snapshots instead of one-off live reads.
- Coin detail pages that expose pool/source context, not only price.
- Derived market signals that account for Bags launch status and pool state.
- Separate treatment of Bags launch-feed signals and external market news.
- Vercel-side fetch caching for public web reads, reducing pressure on the backend.
- Backend sync coverage metrics for visibility into data quality.

## Evaluation Focus

When reviewing the product, the strongest areas to inspect are:

- Whether the homepage makes Bags market movement scannable.
- Whether token rows provide enough context to compare opportunities quickly.
- Whether the coin detail page explains why a token is relevant beyond price alone.
- Whether the backend model can continue improving as more snapshots accumulate.
- Whether the data pipeline gracefully handles incomplete third-party market data.

Astralmarket is strongest after scheduled syncs have been running long enough to collect chart history. A new deployment may show sparse charts until enough snapshots exist.

## Current Maturity

Implemented:

- Bags market sync and cache.
- DexScreener market enrichment.
- Solana RPC supply enrichment.
- Historical snapshots for market rows and coin charts.
- Market leaderboard and pagination.
- Coin detail pages.
- Bags signal and crypto news display paths.
- Vercel server-side caching for public market reads.
- Production-ready backend deployment shape behind a reverse proxy.

Still intentionally limited:

- Search and watchlist controls are present as disabled affordances.
- More timeframes beyond the 7-day chart window are not active yet.
- Chart richness depends on accumulated sync history.
- News enrichment is optional and depends on API credentials.

These constraints are explicit rather than hidden. The current product focuses on proving the market-intelligence loop first: sync, enrich, cache, rank, chart, and explain.

## Repository Notes

The repository is organized for continued product development:

```text
apps/web       user-facing market interface
apps/backend   API, sync jobs, Prisma models, data enrichment
apps/docs      placeholder documentation app
packages/ui    shared component package
```

Quality checks currently include TypeScript validation, linting, and backend ranking tests.

## Product Thesis

Bags needs market intelligence that understands Bags.

Astralmarket is the first layer of that: a dedicated discovery and analysis surface for Bags tokens, backed by a sync pipeline that turns launch and pool activity into readable market context.
