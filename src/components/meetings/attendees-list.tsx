import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export type AttendeeRow = {
  id: string;
  email: string;
  display_name: string | null;
  is_organizer: boolean | null;
  response_status: string | null;
};

type Props = {
  attendees: AttendeeRow[];
  locale: string;
};

function getResponseBadgeVariant(
  status: string | null
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "accepted":
      return "default";
    case "declined":
      return "destructive";
    case "tentative":
      return "secondary";
    default:
      return "outline";
  }
}

export async function AttendeesList({ attendees, locale }: Props) {
  const t = await getTranslations({ locale, namespace: "meetings" });

  return (
    <div className="space-y-2">
      {attendees.map((attendee) => {
        const initials = (attendee.display_name ?? attendee.email)
          .charAt(0)
          .toUpperCase();
        const label = attendee.display_name ?? attendee.email;

        return (
          <div
            key={attendee.id}
            className="flex items-center gap-3 py-2 px-3 rounded-lg border border-border"
          >
            {/* Avatar circle */}
            <div
              className={cn(
                "w-8 h-8 rounded-full bg-muted flex items-center justify-center",
                "text-xs font-semibold text-muted-foreground shrink-0"
              )}
            >
              {initials}
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{label}</p>
              {attendee.display_name && (
                <p className="text-xs text-muted-foreground truncate">
                  {attendee.email}
                </p>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 shrink-0">
              {attendee.is_organizer && (
                <Badge
                  variant="secondary"
                  className="rounded-full text-[10px] px-2 py-0.5"
                >
                  {t("attendee_organizer")}
                </Badge>
              )}
              {attendee.response_status && (
                <Badge
                  variant={getResponseBadgeVariant(attendee.response_status)}
                  className="rounded-full text-[10px] px-2 py-0.5"
                >
                  {t(
                    `response_${attendee.response_status}` as
                      | "response_accepted"
                      | "response_declined"
                      | "response_tentative"
                      | "response_needsAction"
                  )}
                </Badge>
              )}
            </div>
          </div>
        );
      })}

      {attendees.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">{t("attendees_empty")}</p>
      )}
    </div>
  );
}
