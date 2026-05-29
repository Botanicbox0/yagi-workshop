#!/usr/bin/env python3
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


MAX_TEXT = 1800
RAW_LOG_PATH = Path.home() / ".codex" / "notify-last-payload.json"
STATUS_LOG_PATH = Path.home() / ".codex" / "notify-last-status.json"


def read_payload() -> tuple[str, dict[str, Any]]:
    raw = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
    raw = raw.strip()
    if not raw:
        return "{}", {}
    try:
        parsed = json.loads(raw)
        return raw, parsed if isinstance(parsed, dict) else {"payload": parsed}
    except json.JSONDecodeError:
        return raw, {"raw": raw}


def write_json_file(path: Path, value: Any) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
        path.chmod(0o600)
    except OSError:
        pass


def truncate(value: str, limit: int = MAX_TEXT) -> str:
    value = " ".join(value.split())
    if len(value) <= limit:
        return value
    return value[: limit - 1].rstrip() + "..."


def stringify_message(message: Any) -> str:
    if isinstance(message, str):
        return message
    if isinstance(message, dict):
        for key in ("content", "text", "message", "summary"):
            value = message.get(key)
            if isinstance(value, str):
                return value
        return json.dumps(message, ensure_ascii=False)
    return str(message)


def summarize_input_messages(messages: Any) -> str:
    if not isinstance(messages, list) or not messages:
        return ""
    last = messages[-1]
    if isinstance(last, dict):
        role = last.get("role") or last.get("type") or "input"
        text = stringify_message(last)
        return f"{role}: {text}"
    return stringify_message(last)


def build_text(payload: dict[str, Any]) -> str:
    event_type = str(payload.get("type") or "codex-event")
    thread_id = payload.get("thread-id") or payload.get("thread_id") or payload.get("threadId")
    turn_id = payload.get("turn-id") or payload.get("turn_id") or payload.get("turnId")
    cwd = payload.get("cwd")
    assistant = (
        payload.get("last-assistant-message")
        or payload.get("last_assistant_message")
        or payload.get("summary")
        or payload.get("message")
        or ""
    )
    if not assistant:
        assistant = summarize_input_messages(payload.get("input-messages"))

    lines = [f"[Codex] {event_type}"]
    if cwd:
        lines.append(f"cwd: {cwd}")
    turn_bits = []
    if thread_id:
        turn_bits.append(f"thread={thread_id}")
    if turn_id:
        turn_bits.append(f"turn={turn_id}")
    if turn_bits:
        lines.append(" ".join(turn_bits))
    if assistant:
        lines.append(truncate(stringify_message(assistant)))
    return truncate("\n".join(lines))


def post_to_slack(webhook_url: str, text: str) -> tuple[int | None, str]:
    data = json.dumps({"text": text}, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        webhook_url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as res:
            return res.getcode(), res.read(200).decode("utf-8", "replace")
    except urllib.error.HTTPError as err:
        return err.code, err.read(200).decode("utf-8", "replace")
    except Exception as err:
        return None, err.__class__.__name__


def main() -> int:
    raw, payload = read_payload()
    write_json_file(RAW_LOG_PATH, {"raw": raw, "parsed": payload})

    webhook_url = os.environ.get("SLACK_WEBHOOK_URL")
    if not webhook_url:
        write_json_file(STATUS_LOG_PATH, {"ok": False, "skipped": "missing_env"})
        return 0

    status, body = post_to_slack(webhook_url, build_text(payload))
    write_json_file(
        STATUS_LOG_PATH,
        {"ok": status is not None and 200 <= status < 300, "status": status, "body": body},
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
