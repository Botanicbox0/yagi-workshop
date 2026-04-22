"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, Hand } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type ReactionType = "like" | "dislike" | "needs_change";

type ReactionCounts = {
  like: number;
  dislike: number;
  needs_change: number;
};

type LocalStorageData = {
  name?: string;
  email?: string;
  reactions?: Record<string, ReactionType>;
};

const LS_KEY_PREFIX = "yagi-share-";

function readStorage(token: string): LocalStorageData {
  try {
    const raw = localStorage.getItem(`${LS_KEY_PREFIX}${token}`);
    return raw ? (JSON.parse(raw) as LocalStorageData) : {};
  } catch {
    return {};
  }
}

function writeStorage(token: string, data: LocalStorageData) {
  try {
    localStorage.setItem(`${LS_KEY_PREFIX}${token}`, JSON.stringify(data));
  } catch {
    // ignore
  }
}

type Props = {
  frameId: string;
  token: string;
  initial: ReactionCounts;
  currentReaction?: ReactionType;
};

export function FastFeedbackBar({
  frameId,
  token,
  initial,
  currentReaction: initialCurrent,
}: Props) {
  const t = useTranslations("reactions");
  const tShare = useTranslations("share");

  const [counts, setCounts] = useState<ReactionCounts>(initial);
  const [selected, setSelected] = useState<ReactionType | null>(
    initialCurrent ?? null,
  );
  const [showForm, setShowForm] = useState(false);
  const [pendingReaction, setPendingReaction] = useState<ReactionType | null>(
    null,
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const buttons: { type: ReactionType; icon: React.ReactNode; label: string }[] =
    [
      {
        type: "like",
        icon: <ThumbsUp className="h-4 w-4" />,
        label: t("reaction_like"),
      },
      {
        type: "dislike",
        icon: <ThumbsDown className="h-4 w-4" />,
        label: t("reaction_dislike"),
      },
      {
        type: "needs_change",
        icon: <Hand className="h-4 w-4" />,
        label: t("reaction_needs_change"),
      },
    ];

  const handleReactionClick = (reaction: ReactionType) => {
    const stored = readStorage(token);
    if (!stored.name || !stored.email) {
      setPendingReaction(reaction);
      setName(stored.name ?? "");
      setEmail(stored.email ?? "");
      setShowForm(true);
      return;
    }
    void submitReaction(reaction, stored.name, stored.email);
  };

  const submitReaction = async (
    reaction: ReactionType,
    reactorName: string,
    reactorEmail: string,
  ) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/share/${token}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frame_id: frameId,
          reaction,
          reactor_name: reactorName,
          reactor_email: reactorEmail,
        }),
      });

      if (res.status === 429) {
        toast.error(tShare("rate_limit_reactions"));
        return;
      }

      if (!res.ok) return;

      const data = (await res.json()) as ReactionCounts;

      // Optimistically update counts and selected state
      const wasSelected = selected === reaction;
      setCounts(data);
      setSelected(wasSelected ? null : reaction);

      // Persist identity + frame reaction in localStorage
      const stored = readStorage(token);
      stored.name = reactorName;
      stored.email = reactorEmail;
      stored.reactions = { ...(stored.reactions ?? {}), [frameId]: reaction };
      writeStorage(token, stored);

      toast.success(
        selected ? t("reaction_updated") : t("reaction_submitted"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(tShare("reaction_name_required"));
      return;
    }
    if (!email.trim()) {
      toast.error(tShare("reaction_email_required"));
      return;
    }
    if (!pendingReaction) return;
    setShowForm(false);
    void submitReaction(pendingReaction, name.trim(), email.trim());
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {buttons.map(({ type, icon, label }) => (
          <button
            key={type}
            onClick={() => handleReactionClick(type)}
            disabled={submitting}
            title={label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors",
              selected === type
                ? "bg-black text-white border-black"
                : "bg-white text-black border-gray-200 hover:border-black",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {icon}
            <span>{label}</span>
            <span className="text-xs opacity-60">
              {t("reaction_count_n", { n: counts[type] })}
            </span>
          </button>
        ))}
      </div>

      {showForm && (
        <form
          onSubmit={handleFormSubmit}
          className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 max-w-sm"
        >
          <p className="text-sm font-medium text-black">
            {t("reactor_name_label")}
          </p>
          <input
            type="text"
            placeholder={t("reactor_name_ph")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <p className="text-sm font-medium text-black">
            {t("reactor_email_label")}
          </p>
          <input
            type="email"
            placeholder={t("reactor_email_ph")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
            >
              {t("reaction_send")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setPendingReaction(null);
              }}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-black hover:border-black"
            >
              ✕
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
