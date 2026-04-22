/**
 * RFC 5545 .ics calendar file builder.
 *
 * Pure utility. No external dependencies. Safe to import from server or client.
 * Used as a fallback when Google Calendar integration is unavailable or the
 * user wants to attach an .ics file to an email invite.
 *
 * References:
 *   - RFC 5545 §3.3.11 (TEXT escaping)
 *   - RFC 5545 §3.1    (Content line folding, 75 octets)
 */

export type IcsEventArgs = {
  /** Stable UID, e.g. `meeting-${meeting.id}@yagiworkshop.xyz` */
  uid: string
  title: string
  description?: string
  startsAt: Date
  endsAt: Date
  organizerEmail: string
  organizerName?: string
  attendeeEmails: string[]
  /** Optional, e.g. "Google Meet TBD" or a URL */
  location?: string
  /** Default 'REQUEST' */
  method?: 'REQUEST' | 'CANCEL'
}

const CRLF = '\r\n'

/**
 * Escape a value for use as a TEXT-type property per RFC 5545 §3.3.11.
 * Order matters: backslashes must be escaped first so later escapes don't
 * double-escape the backslashes they insert.
 */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
}

/**
 * Format a Date as UTC "basic" ICS format: YYYYMMDDTHHMMSSZ.
 */
function toIcsUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}` +
    `${pad(d.getUTCMonth() + 1)}` +
    `${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}` +
    `${pad(d.getUTCMinutes())}` +
    `${pad(d.getUTCSeconds())}Z`
  )
}

/**
 * Fold a single logical content line to a max of 75 octets per physical line.
 * Continuation lines begin with a single space (RFC 5545 §3.1).
 *
 * Note: RFC 5545 speaks of "octets" (UTF-8 bytes). For ASCII content, octets
 * === characters. For multibyte UTF-8 (e.g. Korean), we fold by byte length
 * to respect the spec. We still split on a character boundary by trimming
 * back to a safe code-point boundary if the 75-byte slice would split a
 * multibyte sequence.
 */
function foldLine(line: string): string {
  const MAX_OCTETS = 75
  const encoder = new TextEncoder()
  const bytes = encoder.encode(line)
  if (bytes.length <= MAX_OCTETS) return line

  const decoder = new TextDecoder('utf-8')
  const parts: string[] = []
  let offset = 0
  let isFirst = true

  while (offset < bytes.length) {
    // First line gets full 75; continuation lines reserve 1 octet for the
    // leading space, so they get up to 74 octets of payload.
    const budget = isFirst ? MAX_OCTETS : MAX_OCTETS - 1
    let end = Math.min(offset + budget, bytes.length)

    // Back off if we'd split inside a UTF-8 multibyte sequence.
    // Continuation bytes match 10xxxxxx (0x80..0xBF).
    while (end > offset && end < bytes.length) {
      const b = bytes[end]!
      if ((b & 0xc0) === 0x80) {
        end -= 1
      } else {
        break
      }
    }

    const slice = bytes.slice(offset, end)
    const text = decoder.decode(slice)
    parts.push(isFirst ? text : ' ' + text)
    offset = end
    isFirst = false
  }

  return parts.join(CRLF)
}

/**
 * Build an RFC 5545 VCALENDAR string with a single VEVENT.
 * All line endings are CRLF. All TEXT values are escaped.
 */
export function buildIcs(args: IcsEventArgs): string {
  const method = args.method ?? 'REQUEST'
  const now = new Date()

  const lines: string[] = []

  // VCALENDAR envelope
  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//YAGI Workshop//Meetings//EN')
  lines.push('CALSCALE:GREGORIAN')
  lines.push(`METHOD:${method}`)

  // VEVENT block
  lines.push('BEGIN:VEVENT')
  lines.push(`UID:${args.uid}`)
  lines.push(`DTSTAMP:${toIcsUtc(now)}`)
  lines.push(`DTSTART:${toIcsUtc(args.startsAt)}`)
  lines.push(`DTEND:${toIcsUtc(args.endsAt)}`)
  lines.push(`SUMMARY:${escapeText(args.title)}`)

  if (args.description !== undefined && args.description !== '') {
    lines.push(`DESCRIPTION:${escapeText(args.description)}`)
  }

  if (args.location !== undefined && args.location !== '') {
    lines.push(`LOCATION:${escapeText(args.location)}`)
  }

  if (args.organizerName !== undefined && args.organizerName !== '') {
    lines.push(
      `ORGANIZER;CN=${escapeText(args.organizerName)}:mailto:${args.organizerEmail}`,
    )
  } else {
    lines.push(`ORGANIZER:mailto:${args.organizerEmail}`)
  }

  for (const email of args.attendeeEmails) {
    lines.push(
      `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${email}`,
    )
  }

  lines.push('SEQUENCE:0')

  if (method === 'CANCEL') {
    lines.push('STATUS:CANCELLED')
  }

  lines.push('END:VEVENT')
  lines.push('END:VCALENDAR')

  // Fold long lines, then join with CRLF and append a final CRLF per RFC.
  return lines.map(foldLine).join(CRLF) + CRLF
}
