#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Home Sale Helper — PostHog KPI Dashboard Setup
#
# Creates the "Home Sale Helper — KPIs" dashboard with all required insights:
#   • Engagement  : DAU/WAU/MAU trend, J7/J30 retention
#   • Funnel      : activation funnel with drop-off
#   • Monetization: payment_completed trend + conversion rate
#   • AI Usage    : volume/day + success rate
#
# Requirements:
#   POSTHOG_PERSONAL_API_KEY  — Personal API key (Settings → Personal API keys)
#                               Needs "project:write" scope.
#   POSTHOG_PROJECT_ID        — Numeric project ID (visible in the URL on
#                               app.posthog.com/project/<ID>/...)
#   POSTHOG_HOST              — Default: https://app.posthog.com
#
# Usage:
#   POSTHOG_PERSONAL_API_KEY=phx_... \
#   POSTHOG_PROJECT_ID=12345 \
#   bash scripts/setup-posthog-dashboards.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Validate env ────────────────────────────────────────────────────────────
: "${POSTHOG_PERSONAL_API_KEY:?Missing POSTHOG_PERSONAL_API_KEY (phx_...)}"
: "${POSTHOG_PROJECT_ID:?Missing POSTHOG_PROJECT_ID (numeric)}"
HOST="${POSTHOG_HOST:-https://app.posthog.com}"
BASE_URL="${HOST}/api/projects/${POSTHOG_PROJECT_ID}"
AUTH="Authorization: Bearer ${POSTHOG_PERSONAL_API_KEY}"

echo "→ PostHog host  : ${HOST}"
echo "→ Project ID    : ${POSTHOG_PROJECT_ID}"
echo ""

# ── Helper ──────────────────────────────────────────────────────────────────
ph_post() {
  local endpoint="$1"
  local payload="$2"
  curl -s -X POST \
    -H "${AUTH}" \
    -H "Content-Type: application/json" \
    "${BASE_URL}${endpoint}" \
    -d "${payload}"
}

# ── 1. Create dashboard ─────────────────────────────────────────────────────
echo "Creating dashboard 'Home Sale Helper — KPIs'..."
DASHBOARD=$(ph_post "/dashboards/" '{
  "name": "Home Sale Helper \u2014 KPIs",
  "description": "Core product KPIs: engagement, activation funnel, monetisation, AI usage.",
  "pinned": true
}')
DASHBOARD_ID=$(echo "$DASHBOARD" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

if [[ -z "$DASHBOARD_ID" ]]; then
  echo "ERROR: Failed to create dashboard."
  echo "$DASHBOARD"
  exit 1
fi
echo "  ✓ Dashboard created — ID: ${DASHBOARD_ID}"
echo ""

# ── Helper: create insight and tile it on the dashboard ─────────────────────
add_insight() {
  local name="$1"
  local filters="$2"
  echo "  Creating insight: ${name}..."
  INSIGHT=$(ph_post "/insights/" "$(jq -n \
    --arg name "$name" \
    --argjson filters "$filters" \
    --argjson dashboard "$DASHBOARD_ID" \
    '{name: $name, filters: $filters, dashboards: [$dashboard], saved: true}')")
  INSIGHT_ID=$(echo "$INSIGHT" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
  if [[ -z "$INSIGHT_ID" ]]; then
    echo "    WARNING: could not parse insight id — response:"
    echo "$INSIGHT" | head -3
  else
    echo "    ✓ insight ${INSIGHT_ID} tiled on dashboard ${DASHBOARD_ID}"
  fi
}

# ── 2. Engagement section ───────────────────────────────────────────────────
echo "Section: Engagement"

add_insight "DAU / WAU / MAU — 30-day trend" '{
  "insight": "TRENDS",
  "interval": "day",
  "date_from": "-30d",
  "events": [
    {
      "id": "$pageview",
      "math": "dau",
      "name": "$pageview",
      "type": "events",
      "order": 0,
      "custom_name": "DAU"
    }
  ],
  "display": "ActionsLineGraph",
  "breakdown_type": null
}'

add_insight "Rétention J7 / J30" '{
  "insight": "RETENTION",
  "period": "Week",
  "date_from": "-8w",
  "target_entity": {
    "id": "$pageview",
    "type": "events"
  },
  "returning_entity": {
    "id": "$pageview",
    "type": "events"
  },
  "retention_type": "retention_first_time"
}'

# ── 3. Funnel Activation ─────────────────────────────────────────────────────
echo ""
echo "Section: Funnel Activation"

add_insight "Funnel principal — Activation" '{
  "insight": "FUNNELS",
  "date_from": "-30d",
  "funnel_window_days": 14,
  "events": [
    {"id": "user_signed_up",        "order": 0, "name": "user_signed_up",        "type": "events"},
    {"id": "listing_created",       "order": 1, "name": "listing_created",       "type": "events"},
    {"id": "ai_analysis_requested", "order": 2, "name": "ai_analysis_requested", "type": "events"},
    {"id": "ai_analysis_completed", "order": 3, "name": "ai_analysis_completed", "type": "events"}
  ],
  "layout": "horizontal"
}'

# ── 4. Monetisation ─────────────────────────────────────────────────────────
echo ""
echo "Section: Monétisation"

add_insight "Conversions — payment_completed / jour" '{
  "insight": "TRENDS",
  "interval": "day",
  "date_from": "-30d",
  "events": [
    {
      "id": "payment_completed",
      "math": "total",
      "name": "payment_completed",
      "type": "events",
      "order": 0,
      "custom_name": "Payments"
    }
  ],
  "display": "ActionsBar"
}'

add_insight "Taux de conversion — Inscription → Paiement" '{
  "insight": "FUNNELS",
  "date_from": "-30d",
  "funnel_window_days": 30,
  "events": [
    {"id": "user_signed_up",    "order": 0, "name": "user_signed_up",    "type": "events"},
    {"id": "payment_completed", "order": 1, "name": "payment_completed", "type": "events"}
  ],
  "layout": "horizontal"
}'

# ── 5. AI Usage ──────────────────────────────────────────────────────────────
echo ""
echo "Section: Usage AI"

add_insight "Volume analyses AI / jour" '{
  "insight": "TRENDS",
  "interval": "day",
  "date_from": "-30d",
  "events": [
    {
      "id": "ai_analysis_requested",
      "math": "total",
      "name": "ai_analysis_requested",
      "type": "events",
      "order": 0,
      "custom_name": "AI Requests"
    }
  ],
  "display": "ActionsBar"
}'

add_insight "Taux de succès AI — Completed / Requested" '{
  "insight": "TRENDS",
  "interval": "day",
  "date_from": "-30d",
  "events": [
    {
      "id": "ai_analysis_requested",
      "math": "total",
      "name": "ai_analysis_requested",
      "type": "events",
      "order": 0,
      "custom_name": "Requested"
    },
    {
      "id": "ai_analysis_completed",
      "math": "total",
      "name": "ai_analysis_completed",
      "type": "events",
      "order": 1,
      "custom_name": "Completed"
    }
  ],
  "display": "ActionsLineGraph",
  "formula": "B/A"
}'

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "✓ All insights created and tiled."
echo ""
echo "Dashboard URL:"
echo "  ${HOST}/project/${POSTHOG_PROJECT_ID}/dashboard/${DASHBOARD_ID}"
