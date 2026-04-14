/**
 * Push Notifications — Expo Push Notification Service
 *
 * Replaces Firebase Cloud Messaging. Works natively with the Expo mobile app,
 * handles both iOS (APNs) and Android (FCM) via Expo's infrastructure.
 *
 * The mobile app stores an `expoPushToken` per user (format: ExponentPushToken[xxx]).
 * The backend sends notifications by calling the Expo push API.
 */

import Expo, { type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk'
import { env } from '../config/env.js'

const expo = new Expo({
  accessToken: env.EXPO_ACCESS_TOKEN,
  // Use gzip compression for large batches
  useFcmV1: true,
})

export interface PushPayload {
  title: string
  body: string
  data?: Record<string, unknown>
  badge?: number
}

/**
 * Send a push notification to one or more Expo push tokens.
 * Silently skips invalid tokens (e.g. uninstalled apps).
 */
export async function sendPushNotification(
  tokens: string | string[],
  payload: PushPayload,
): Promise<void> {
  const tokenList = Array.isArray(tokens) ? tokens : [tokens]

  // Filter valid Expo push tokens
  const validTokens = tokenList.filter((t) => Expo.isExpoPushToken(t))
  if (validTokens.length === 0) return

  const messages: ExpoPushMessage[] = validTokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    badge: payload.badge,
    sound: 'default',
  }))

  // Expo recommends batching large sends
  const chunks = expo.chunkPushNotifications(messages)
  const tickets: ExpoPushTicket[] = []

  for (const chunk of chunks) {
    const chunkTickets = await expo.sendPushNotificationsAsync(chunk)
    tickets.push(...chunkTickets)
  }

  // Log errors (e.g. DeviceNotRegistered) without crashing
  for (const ticket of tickets) {
    if (ticket.status === 'error') {
      console.error('[push] Delivery error:', ticket.message, ticket.details)
    }
  }
}

// ── Convenience helpers ──────────────────────────────────────────────────────

/** Notify seller that a publish job failed on a marketplace platform. */
export function notifyPublishFailure(
  token: string,
  platform: string,
  listingTitle: string,
): Promise<void> {
  return sendPushNotification(token, {
    title: `Publication échouée — ${platform}`,
    body: `Impossible de publier "${listingTitle}" sur ${platform}. Appuie pour réessayer.`,
    data: { type: 'publish_failure', platform },
  })
}

/** Notify seller of a new buyer message. */
export function notifyNewMessage(
  token: string,
  buyerName: string,
  listingTitle: string,
): Promise<void> {
  return sendPushNotification(token, {
    title: `Nouveau message de ${buyerName}`,
    body: `À propos de "${listingTitle}"`,
    data: { type: 'new_message' },
  })
}
