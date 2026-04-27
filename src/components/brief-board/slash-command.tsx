"use client";

// =============================================================================
// Phase 2.8.2 G_B2_B — Brief Board slash command
// =============================================================================
// Q-083 sibling-dep rule: @tiptap/suggestion + tippy.js are pinned to the
// matching @tiptap/* major.minor (3.22.4) and tippy.js@6.3.7. Bumping
// either independently risks the suggestion plugin silently breaking
// across TipTap minors.
//
// Korean IME guard (kickoff §2 G_B2_B FAIL on / ON_FAIL_LOOP loop 2):
//   The popover is suppressed while the editor view is mid-composition
//   (Hangul jamo assembly). Without this guard, the slash popup flickers
//   on every jamo keystroke and can swallow composition characters.
//
// Items: paragraph / heading 1-3 / bullet list / ordered list / divider /
// image / file / embed / quote (10 items per kickoff §2 G_B2_B EXIT).
// Image / file / embed delegate to caller-supplied callbacks because they
// need to trigger the editor's existing upload + embed pipelines.
// =============================================================================

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type RefObject,
} from "react";
import { Extension, type Editor, type Range } from "@tiptap/core";
import { Suggestion, type SuggestionOptions } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { cn } from "@/lib/utils";

type SlashItemKey =
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bullet_list"
  | "ordered_list"
  | "divider"
  | "image"
  | "file"
  | "embed"
  | "quote";

type SlashCommandHandlers = {
  onPickImage: () => void;
  onPickFile: () => void;
  onPickEmbed: () => void;
};

export type SlashItem = {
  key: SlashItemKey;
  title: string;
  description: string;
  command: (ctx: { editor: Editor; range: Range }) => void;
};

function buildItems(handlers: SlashCommandHandlers, t: (k: string) => string): SlashItem[] {
  return [
    {
      key: "paragraph",
      title: t("slash_paragraph"),
      description: t("slash_paragraph_desc"),
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setParagraph().run(),
    },
    {
      key: "heading_1",
      title: t("slash_heading_1"),
      description: t("slash_heading_1_desc"),
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
    },
    {
      key: "heading_2",
      title: t("slash_heading_2"),
      description: t("slash_heading_2_desc"),
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
    },
    {
      key: "heading_3",
      title: t("slash_heading_3"),
      description: t("slash_heading_3_desc"),
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
    },
    {
      key: "bullet_list",
      title: t("slash_bullet_list"),
      description: t("slash_bullet_list_desc"),
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      key: "ordered_list",
      title: t("slash_ordered_list"),
      description: t("slash_ordered_list_desc"),
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      key: "divider",
      title: t("slash_divider"),
      description: t("slash_divider_desc"),
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
      key: "quote",
      title: t("slash_quote"),
      description: t("slash_quote_desc"),
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      key: "image",
      title: t("slash_image"),
      description: t("slash_image_desc"),
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        handlers.onPickImage();
      },
    },
    {
      key: "file",
      title: t("slash_file"),
      description: t("slash_file_desc"),
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        handlers.onPickFile();
      },
    },
    {
      key: "embed",
      title: t("slash_embed"),
      description: t("slash_embed_desc"),
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        handlers.onPickEmbed();
      },
    },
  ];
}

// -----------------------------------------------------------------------------
// React popover list (rendered by tippy)
// -----------------------------------------------------------------------------

type ListProps = {
  items: SlashItem[];
  command: (item: SlashItem) => void;
};

export type SlashCommandListHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

export const SlashCommandList = forwardRef<SlashCommandListHandle, ListProps>(
  function SlashCommandList(props, ref) {
    const [selected, setSelected] = useState(0);

    useEffect(() => setSelected(0), [props.items]);

    function pick(index: number) {
      const item = props.items[index];
      if (item) props.command(item);
    }

    useImperativeHandle(ref, () => ({
      onKeyDown({ event }) {
        if (event.key === "ArrowDown") {
          setSelected((s) => (s + 1) % Math.max(1, props.items.length));
          return true;
        }
        if (event.key === "ArrowUp") {
          setSelected(
            (s) =>
              (s - 1 + Math.max(1, props.items.length)) %
              Math.max(1, props.items.length),
          );
          return true;
        }
        if (event.key === "Enter") {
          pick(selected);
          return true;
        }
        return false;
      },
    }));

    if (props.items.length === 0) {
      return null;
    }

    return (
      <div className="z-50 max-h-72 w-72 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
        {props.items.map((item, i) => (
          <button
            key={item.key}
            type="button"
            onClick={() => pick(i)}
            onMouseEnter={() => setSelected(i)}
            className={cn(
              "flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left transition-colors",
              i === selected
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50",
            )}
          >
            <span className="text-sm font-medium leading-tight keep-all">
              {item.title}
            </span>
            <span className="text-xs text-muted-foreground leading-tight keep-all">
              {item.description}
            </span>
          </button>
        ))}
      </div>
    );
  },
);

// -----------------------------------------------------------------------------
// Suggestion config factory + extension
// -----------------------------------------------------------------------------

export function createSlashCommandSuggestion(
  handlers: SlashCommandHandlers,
  translate: (key: string) => string,
): Omit<SuggestionOptions<SlashItem, { command: SlashItem["command"] }>, "editor"> {
  const allItems = buildItems(handlers, translate);

  return {
    char: "/",
    allowSpaces: false,
    startOfLine: false,
    items: ({ query, editor }) => {
      // IME guard: do not surface items while a Hangul (or any) composition
      // is in progress. The popover lifecycle (onStart/onUpdate) runs even
      // for a 0-item state, so we ALSO short-circuit the render below.
      if (editor.view.composing) return [];
      const q = query.toLowerCase();
      return allItems.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.description.toLowerCase().includes(q) ||
          it.key.includes(q),
      );
    },
    command: ({ editor, range, props }) => {
      props.command({ editor, range });
    },
    render: () => {
      let component: ReactRenderer<SlashCommandListHandle, ListProps> | null = null;
      let popup: TippyInstance[] = [];

      return {
        onStart: (props) => {
          // Same IME guard at the lifecycle level — the items() short-circuit
          // above prevents re-render flicker but tippy's popup is owned here.
          if (props.editor.view.composing) return;

          component = new ReactRenderer(SlashCommandList, {
            props: {
              items: props.items,
              command: (item: SlashItem) =>
                props.command({ command: item.command }),
            },
            editor: props.editor,
          });

          if (!props.clientRect) return;

          popup = tippy("body", {
            getReferenceClientRect: () =>
              props.clientRect?.() ?? new DOMRect(),
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },
        onUpdate: (props) => {
          if (!component) return;
          // Phase 2.8.2 K-05 LOOP 1 — IME guard mid-popup. items() already
          // returns [] during composition, but we additionally hide the
          // tippy popup so positioning logic does not reflow on every
          // jamo keystroke.
          if (props.editor.view.composing) {
            popup[0]?.hide();
            return;
          } else {
            popup[0]?.show();
          }
          component.updateProps({
            items: props.items,
            command: (item: SlashItem) =>
              props.command({ command: item.command }),
          });
          if (!props.clientRect || !popup[0]) return;
          popup[0].setProps({
            getReferenceClientRect: () =>
              props.clientRect?.() ?? new DOMRect(),
          });
        },
        onKeyDown: (props) => {
          // Phase 2.8.2 K-05 LOOP 1 — IME guard for keyboard nav. During
          // Hangul composition, ArrowUp/Down/Enter are candidate-select
          // and commit keys at the OS IME layer; we MUST NOT consume them
          // for slash-menu navigation or composition characters silently
          // get dropped (Codex K-05 HIGH-B #2). The Suggestion plugin
          // exposes `view` (EditorView), not `editor`, in this lifecycle.
          if (props.view.composing) return false;
          if (props.event.key === "Escape") {
            popup[0]?.hide();
            return true;
          }
          return (
            component?.ref?.onKeyDown({ event: props.event }) ?? false
          );
        },
        onExit: () => {
          popup[0]?.destroy();
          component?.destroy();
          popup = [];
          component = null;
        },
      };
    },
  };
}

// Extension that wires the Suggestion plugin into the editor. Pass the
// suggestion options via Extension.configure({ suggestion: ... }).
export const SlashCommandExtension = Extension.create<{
  suggestion: ReturnType<typeof createSlashCommandSuggestion>;
}>({
  name: "slashCommand",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({ editor, range, props }) => {
          (props as { command: SlashItem["command"] }).command({
            editor,
            range,
          });
        },
      } as ReturnType<typeof createSlashCommandSuggestion>,
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

// Re-export so callers can use this single ref type without importing
// from the internal ReactRenderer module.
export type { RefObject };
