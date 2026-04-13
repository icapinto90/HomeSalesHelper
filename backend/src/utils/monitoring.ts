/**
 * Monitoring bootstrapper — initialise Sentry (error tracking) and
 * PostHog (product analytics) at process start-up.
 *
 * Import this module FIRST in server.ts, before any other imports,
 * so that Sentry can instrument third-party libraries automatically.
 */

import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import { PostHog } from 'posthog-node'

// ── Sentry ────────────────────────────────────────────────────────────────────

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    console.warn('[monitoring] SENTRY_DSN not set — Sentry disabled')
    return
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'local',
    integrations: [nodeProfilingIntegration()],
    // Capture 100 % of transactions in dev/staging; 10 % in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 1.0,
  })
}

// ── PostHog ───────────────────────────────────────────────────────────────────

let _posthog: PostHog | null = null

export function initPostHog(): PostHog | null {
  const apiKey = process.env.POSTHOG_API_KEY
  if (!apiKey) {
    console.warn('[monitoring] POSTHOG_API_KEY not set — PostHog disabled')
    return null
  }

  _posthog = new PostHog(apiKey, {
    host: process.env.POSTHOG_HOST ?? 'https://app.posthog.com',
    flushAt: 20,
    flushInterval: 10_000,
  })

  return _posthog
}

/** Track a server-side product event. No-ops when PostHog is not configured. */
export function trackEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  _posthog?.capture({ distinctId, event, properties })
}

/** Flush analytics & close connections gracefully on shutdown. */
export async function shutdownMonitoring(): Promise<void> {
  await Promise.all([
    Sentry.flush(2_000).catch(() => {}),
    _posthog?.shutdown(),
  ])
}
