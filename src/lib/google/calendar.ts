import { randomUUID } from 'node:crypto'
import { getAccessToken } from '@/lib/google/auth'

export type CreateEventArgs = {
  title: string
  description?: string
  scheduledAt: Date
  durationMinutes: number
  attendeeEmails: string[]
  organizerEmail: string // YAGI account — informational only; the API uses the OAuth identity
  timezone?: string // default 'Asia/Seoul'
  // Phase 2.0 G4 #8 (Phase 1.3 M3) — stable conference requestId for
  // idempotent retries. Callers should pass a value that is constant across
  // retries of the SAME logical meeting (e.g. the meeting row's UUID) so
  // Google dedups the conference instead of creating a duplicate Meet link.
  // If omitted, falls back to a fresh randomUUID and loses retry safety.
  requestId?: string
}

export type CreateEventResult =
  | { ok: true; event_id: string; meet_link: string | null }
  | { ok: false; reason: 'no_auth' | 'api_error'; detail?: string }

const TIMEOUT_MS = 10_000

/**
 * Format a Date as an ISO 8601 string with an explicit offset for the given
 * IANA timezone (e.g. `2026-04-25T14:00:00+09:00`). The Google Calendar API
 * accepts ISO strings with an offset and also respects the `timeZone` field;
 * providing both is the robust shape.
 */
function formatWithOffset(date: Date, timezone: string): string {
  // Use Intl to derive the wall-clock components and offset for the timezone.
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value
    return acc
  }, {})

  const year = parts.year
  const month = parts.month
  const day = parts.day
  const hour = parts.hour === '24' ? '00' : parts.hour
  const minute = parts.minute
  const second = parts.second

  // Compute the offset in minutes for this timezone at this instant.
  const asUTC = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  )
  const offsetMinutes = Math.round((asUTC - date.getTime()) / 60_000)
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absOff = Math.abs(offsetMinutes)
  const offH = String(Math.floor(absOff / 60)).padStart(2, '0')
  const offM = String(absOff % 60).padStart(2, '0')

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offH}:${offM}`
}

type GoogleEventResponse = {
  id?: string
  hangoutLink?: string
  conferenceData?: {
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>
  }
}

export async function createCalendarEvent(args: CreateEventArgs): Promise<CreateEventResult> {
  const token = await getAccessToken()
  if (!token) return { ok: false, reason: 'no_auth' }

  const timezone = args.timezone ?? 'Asia/Seoul'
  const startDate = args.scheduledAt
  const endDate = new Date(startDate.getTime() + args.durationMinutes * 60_000)

  const body = {
    summary: args.title,
    description: args.description,
    start: {
      dateTime: formatWithOffset(startDate, timezone),
      timeZone: timezone,
    },
    end: {
      dateTime: formatWithOffset(endDate, timezone),
      timeZone: timezone,
    },
    attendees: args.attendeeEmails.map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: args.requestId ?? randomUUID(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
    reminders: { useDefault: true },
  }

  const url =
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(
        `[google/calendar] create event failed — status ${res.status}: ${text.slice(0, 500)}`
      )
      return { ok: false, reason: 'api_error', detail: `HTTP ${res.status}` }
    }

    const data = (await res.json()) as GoogleEventResponse
    const eventId = data.id
    if (!eventId) {
      console.error('[google/calendar] create event returned no id')
      return { ok: false, reason: 'api_error', detail: 'missing event id' }
    }

    const fallbackLink =
      data.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ?? null
    const meetLink = data.hangoutLink ?? fallbackLink

    console.log(`[google/calendar] created event ${eventId} status ${res.status}`)
    return { ok: true, event_id: eventId, meet_link: meetLink }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    console.error(`[google/calendar] create event error: ${detail}`)
    return { ok: false, reason: 'api_error', detail }
  } finally {
    clearTimeout(timer)
  }
}

export async function cancelCalendarEvent(eventId: string): Promise<{ ok: boolean }> {
  const token = await getAccessToken()
  if (!token) return { ok: false }

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
    eventId
  )}?sendUpdates=all`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    })

    // 200/204 = deleted; 410 = already gone (idempotent success)
    if (res.status === 200 || res.status === 204 || res.status === 410) {
      console.log(`[google/calendar] cancelled event ${eventId} status ${res.status}`)
      return { ok: true }
    }

    const text = await res.text().catch(() => '')
    console.error(
      `[google/calendar] cancel event failed — status ${res.status}: ${text.slice(0, 500)}`
    )
    return { ok: false }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    console.error(`[google/calendar] cancel event error: ${detail}`)
    return { ok: false }
  } finally {
    clearTimeout(timer)
  }
}
