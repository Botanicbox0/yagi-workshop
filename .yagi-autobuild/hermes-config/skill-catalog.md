# Claude Code Skill Catalog
Auto-generated 2026-05-28T05:17:49+09:00

Layer 1 of the Hermes self-evolving router. Read this to pick 1-3 skills
relevant to a task, then hint them to claude-bg in the dispatch.

# === Project skills (yagi-workshop) ===

## yagi-design-system (project)
Location: /mnt/d/AI/projects/yagi-workshop/.claude/skills/yagi-design-system/SKILL.md
Description: YAGI Workshop design system v0.2.0 — the editorial integration discipline derived from Phase 2.9 (Projects hub redesign) and isomeet.com calibration. Auto-trigger this skill on ANY UI surface change inside YAGI Workshop: new components, page layouts, hero/CTA/section composition, typography decisi

## yagi-nextjs-conventions (project)
Location: /mnt/d/AI/projects/yagi-workshop/.claude/skills/yagi-nextjs-conventions/SKILL.md
Description: YAGI Workshop project-specific Next.js conventions. Load for any task touching YAGI codebase. Auto-triggers on Next.js file creation, Supabase query writing, form building, i18n key addition, RLS policy authoring within YAGI Workshop.

# === Claude Code plugin skills ===

## brainstorming (plugin)
Location: /home/yagi/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/brainstorming/SKILL.md
Description: You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.

## dispatching-parallel-agents (plugin)
Location: /home/yagi/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/dispatching-parallel-agents/SKILL.md
Description: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies

## executing-plans (plugin)
Location: /home/yagi/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/executing-plans/SKILL.md
Description: Use when you have a written implementation plan to execute in a separate session with review checkpoints

## finishing-a-development-branch (plugin)
Location: /home/yagi/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/finishing-a-development-branch/SKILL.md
Description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup

## receiving-code-review (plugin)
Location: /home/yagi/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/receiving-code-review/SKILL.md
Description: Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation

## requesting-code-review (plugin)
Location: /home/yagi/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/requesting-code-review/SKILL.md
Description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements

## subagent-driven-development (plugin)
Location: /home/yagi/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/subagent-driven-development/SKILL.md
Description: Use when executing implementation plans with independent tasks in the current session

## systematic-debugging (plugin)
Location: /home/yagi/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/systematic-debugging/SKILL.md
Description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes

## test-driven-development (plugin)
Location: /home/yagi/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/test-driven-development/SKILL.md
Description: Use when implementing any feature or bugfix, before writing implementation code

## using-git-worktrees (plugin)
Location: /home/yagi/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/using-git-worktrees/SKILL.md
Description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native tools or git worktree fallback

## using-superpowers (plugin)
Location: /home/yagi/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/using-superpowers/SKILL.md
Description: Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions

## verification-before-completion (plugin)
Location: /home/yagi/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/verification-before-completion/SKILL.md
Description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always

## writing-plans (plugin)
Location: /home/yagi/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/writing-plans/SKILL.md
Description: Use when you have a spec or requirements for a multi-step task, before touching code

## writing-skills (plugin)
Location: /home/yagi/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/writing-skills/SKILL.md
Description: Use when creating new skills, editing existing skills, or verifying skills work before deployment

## access (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/discord/skills/access/SKILL.md
Description: Manage Discord channel access — approve pairings, edit allowlists, set DM/group policy. Use when the user asks to pair, approve someone, check who's allowed, or change policy for the Discord channel.

## configure (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/discord/skills/configure/SKILL.md
Description: Set up the Discord channel — save the bot token and review access policy. Use when the user pastes a Discord bot token, asks to configure Discord, asks "how do I set this up" or "who can reach me," or wants to check channel status.

## access (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/imessage/skills/access/SKILL.md
Description: Manage iMessage channel access — approve pairings, edit allowlists, set DM/group policy. Use when the user asks to pair, approve someone, check who's allowed, or change policy for the iMessage channel.

## configure (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/imessage/skills/configure/SKILL.md
Description: Check iMessage channel setup and review access policy. Use when the user asks to configure iMessage, asks "how do I set this up" or "who can reach me," or wants to know why texts aren't reaching the assistant.

## access (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/telegram/skills/access/SKILL.md
Description: Manage Telegram channel access — approve pairings, edit allowlists, set DM/group policy. Use when the user asks to pair, approve someone, check who's allowed, or change policy for the Telegram channel.

## configure (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/telegram/skills/configure/SKILL.md
Description: Set up the Telegram channel — save the bot token and review access policy. Use when the user pastes a Telegram bot token, asks to configure Telegram, asks "how do I set this up" or "who can reach me," or wants to check channel status.

## claude-automation-recommender (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/claude-code-setup/skills/claude-automation-recommender/SKILL.md
Description: Analyze a codebase and recommend Claude Code automations (hooks, subagents, skills, plugins, MCP servers). Use when user asks for automation recommendations, wants to optimize their Claude Code setup, mentions improving Claude Code workflows, asks how to first set up Claude Code for a project, or wa

## claude-md-improver (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/claude-md-management/skills/claude-md-improver/SKILL.md
Description: Audit and improve CLAUDE.md files in repositories. Use when user asks to check, audit, update, improve, or fix CLAUDE.md files. Scans for all CLAUDE.md files, evaluates quality against templates, outputs quality report, then makes targeted updates. Also use when the user mentions "CLAUDE.md maintena

## cardputer-buddy (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/cwc-makers/skills/cardputer-buddy/SKILL.md
Description: Iterate on the Cardputer-Adv MicroPython app bundle (Claude Buddy, Snake, Hello) after the device is already provisioned via m5-onboard. Use when the user wants to add a new app, push a single changed .py without re-flashing, watch device serial logs, or run a one-shot REPL command. Trigger on "add 

## m5-onboard (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/cwc-makers/skills/m5-onboard/SKILL.md
Description: End-to-end onboarding for a freshly-plugged-in M5Stack ESP32 device (Cardputer, Cardputer-Adv, Core, CoreS3, Stick) — detect on USB, flash UIFlow 2.0 firmware, and install the Claude Buddy MicroPython app bundle. Use whenever the user plugs in or wants to flash/provision/reset an M5Stack or ESP32 

## example-command (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/example-plugin/skills/example-command/SKILL.md
Description: An example user-invoked skill that demonstrates frontmatter options and the skills/<name>/SKILL.md layout

## example-skill (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/example-plugin/skills/example-skill/SKILL.md
Description: This skill should be used when the user asks to "demonstrate skills", "show skill format", "create a skill template", or discusses skill development patterns. Provides a reference template for creating Claude Code plugin skills.

## frontend-design (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/skills/frontend-design/SKILL.md
Description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics.

## writing-rules (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/hookify/skills/writing-rules/SKILL.md
Description: This skill should be used when the user asks to "create a hookify rule", "write a hook rule", "configure hookify", "add a hookify rule", or needs guidance on hookify rule syntax and patterns.

## math-olympiad (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/math-olympiad/skills/math-olympiad/SKILL.md
Description: "Solve competition math problems (IMO, Putnam, USAMO, AIME) with adversarial verification that catches the errors self-verification misses. Activates when asked to 'solve this IMO problem', 'prove this olympiad inequality', 'verify this competition proof', 'find a counterexample', 'is this proof cor

## build-mcp-app (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/mcp-server-dev/skills/build-mcp-app/SKILL.md
Description: This skill should be used when the user wants to build an "MCP app", add "interactive UI" or "widgets" to an MCP server, "render components in chat", build "MCP UI resources", make a tool that shows a "form", "picker", "dashboard" or "confirmation dialog" inline in the conversation, or mentions "app

## build-mcp-server (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/mcp-server-dev/skills/build-mcp-server/SKILL.md
Description: This skill should be used when the user asks to "build an MCP server", "create an MCP", "make an MCP integration", "wrap an API for Claude", "expose tools to Claude", "make an MCP app", or discusses building something with the Model Context Protocol. It is the entry point for MCP server development 

## build-mcpb (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/mcp-server-dev/skills/build-mcpb/SKILL.md
Description: This skill should be used when the user wants to "package an MCP server", "bundle an MCP", "make an MCPB", "ship a local MCP server", "distribute a local MCP", discusses ".mcpb files", mentions bundling a Node or Python runtime with their MCP server, or needs an MCP server that interacts with the lo

## playground (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/playground/skills/playground/SKILL.md
Description: Creates interactive HTML playgrounds — self-contained single-file explorers that let users configure something visually through controls, see a live preview, and copy out a prompt. Use when the user asks to make a playground, explorer, or interactive tool for a topic.

## agent-development (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/plugin-dev/skills/agent-development/SKILL.md
Description: This skill should be used when the user asks to "create an agent", "add an agent", "write a subagent", "agent frontmatter", "when to use description", "agent examples", "agent tools", "agent colors", "autonomous agent", or needs guidance on agent structure, system prompts, triggering conditions, or 

## command-development (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/plugin-dev/skills/command-development/SKILL.md
Description: This skill should be used when the user asks to "create a slash command", "add a command", "write a custom command", "define command arguments", "use command frontmatter", "organize commands", "create command with file references", "interactive command", "use AskUserQuestion in command", or needs gu

## hook-development (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/plugin-dev/skills/hook-development/SKILL.md
Description: This skill should be used when the user asks to "create a hook", "add a PreToolUse/PostToolUse/Stop hook", "validate tool use", "implement prompt-based hooks", "use ${CLAUDE_PLUGIN_ROOT}", "set up event-driven automation", "block dangerous commands", or mentions hook events (PreToolUse, PostToolUse,

## mcp-integration (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/plugin-dev/skills/mcp-integration/SKILL.md
Description: This skill should be used when the user asks to "add MCP server", "integrate MCP", "configure MCP in plugin", "use .mcp.json", "set up Model Context Protocol", "connect external service", mentions "${CLAUDE_PLUGIN_ROOT} with MCP", or discusses MCP server types (SSE, stdio, HTTP, WebSocket). Provides

## plugin-settings (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/plugin-dev/skills/plugin-settings/SKILL.md
Description: This skill should be used when the user asks about "plugin settings", "store plugin configuration", "user-configurable plugin", ".local.md files", "plugin state files", "read YAML frontmatter", "per-project plugin settings", or wants to make plugin behavior configurable. Documents the .claude/plugin

## plugin-structure (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/plugin-dev/skills/plugin-structure/SKILL.md
Description: This skill should be used when the user asks to "create a plugin", "scaffold a plugin", "understand plugin structure", "organize plugin components", "set up plugin.json", "use ${CLAUDE_PLUGIN_ROOT}", "add commands/agents/skills/hooks", "configure auto-discovery", or needs guidance on plugin director

## skill-development (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/plugin-dev/skills/skill-development/SKILL.md
Description: This skill should be used when the user wants to "create a skill", "add a skill to plugin", "write a new skill", "improve skill description", "organize skill content", or needs guidance on skill structure, progressive disclosure, or skill development best practices for Claude Code plugins.

## session-report (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/session-report/skills/session-report/SKILL.md
Description: Generate an explorable HTML report of Claude Code session usage (tokens, cache, subagents, skills, expensive prompts) from ~/.claude/projects transcripts.

## skill-creator (plugin)
Location: /home/yagi/.claude/plugins/marketplaces/claude-plugins-official/plugins/skill-creator/skills/skill-creator/SKILL.md
Description: Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better t

# === Hermes agent skills ===

## apple-notes (hermes)
Location: /home/yagi/.hermes/skills/apple/apple-notes/SKILL.md
Description: Manage Apple Notes via memo CLI: create, search, edit.

## apple-reminders (hermes)
Location: /home/yagi/.hermes/skills/apple/apple-reminders/SKILL.md
Description: Apple Reminders via remindctl: add, list, complete.

## findmy (hermes)
Location: /home/yagi/.hermes/skills/apple/findmy/SKILL.md
Description: Track Apple devices/AirTags via FindMy.app on macOS.

## imessage (hermes)
Location: /home/yagi/.hermes/skills/apple/imessage/SKILL.md
Description: Send and receive iMessages/SMS via the imsg CLI on macOS.

## macos-computer-use (hermes)
Location: /home/yagi/.hermes/skills/apple/macos-computer-use/SKILL.md
Description: Drive the macOS desktop in the background — screenshots, mouse, keyboard, scroll, drag — without stealing the user's cursor, keyboard focus, or Space. Works with any tool-capable model. Load this skill whenever the `computer_use` tool is available.

## claude-code (hermes)
Location: /home/yagi/.hermes/skills/autonomous-ai-agents/claude-code/SKILL.md
Description: Delegate coding to Claude Code CLI (features, PRs).

## codex (hermes)
Location: /home/yagi/.hermes/skills/autonomous-ai-agents/codex/SKILL.md
Description: Delegate coding to OpenAI Codex CLI (features, PRs).

## hermes-agent (hermes)
Location: /home/yagi/.hermes/skills/autonomous-ai-agents/hermes-agent/SKILL.md
Description: Configure, extend, or contribute to Hermes Agent.

## kanban-codex-lane (hermes)
Location: /home/yagi/.hermes/skills/autonomous-ai-agents/kanban-codex-lane/SKILL.md
Description: Use when a Hermes Kanban worker wants to run Codex CLI as an isolated implementation lane while Hermes keeps ownership of task lifecycle, reconciliation, testing, and handoff.

## opencode (hermes)
Location: /home/yagi/.hermes/skills/autonomous-ai-agents/opencode/SKILL.md
Description: Delegate coding to OpenCode CLI (features, PR review).

## architecture-diagram (hermes)
Location: /home/yagi/.hermes/skills/creative/architecture-diagram/SKILL.md
Description: Dark-themed SVG architecture/cloud/infra diagrams as HTML.

## ascii-art (hermes)
Location: /home/yagi/.hermes/skills/creative/ascii-art/SKILL.md
Description: ASCII art: pyfiglet, cowsay, boxes, image-to-ascii.

## ascii-video (hermes)
Location: /home/yagi/.hermes/skills/creative/ascii-video/SKILL.md
Description: ASCII video: convert video/audio to colored ASCII MP4/GIF.

## baoyu-article-illustrator (hermes)
Location: /home/yagi/.hermes/skills/creative/baoyu-article-illustrator/SKILL.md
Description: Article illustrations: type × style × palette consistency.

## baoyu-comic (hermes)
Location: /home/yagi/.hermes/skills/creative/baoyu-comic/SKILL.md
Description: Knowledge comics (知识漫画): educational, biography, tutorial.

## baoyu-infographic (hermes)
Location: /home/yagi/.hermes/skills/creative/baoyu-infographic/SKILL.md
Description: Infographics: 21 layouts x 21 styles (信息图, 可视化).

## claude-design (hermes)
Location: /home/yagi/.hermes/skills/creative/claude-design/SKILL.md
Description: Design one-off HTML artifacts (landing, deck, prototype).

## comfyui (hermes)
Location: /home/yagi/.hermes/skills/creative/comfyui/SKILL.md
Description: Generate images, video, and audio with ComfyUI — install, launch, manage nodes/models, run workflows with parameter injection. Uses the official comfy-cli for lifecycle and direct REST/WebSocket API for execution.

## creative-ideation (hermes)
Location: /home/yagi/.hermes/skills/creative/creative-ideation/SKILL.md
Description: Generate project ideas via creative constraints.

## design-md (hermes)
Location: /home/yagi/.hermes/skills/creative/design-md/SKILL.md
Description: Author/validate/export Google's DESIGN.md token spec files.

## excalidraw (hermes)
Location: /home/yagi/.hermes/skills/creative/excalidraw/SKILL.md
Description: Hand-drawn Excalidraw JSON diagrams (arch, flow, seq).

## humanizer (hermes)
Location: /home/yagi/.hermes/skills/creative/humanizer/SKILL.md
Description: Humanize text: strip AI-isms and add real voice.

## manim-video (hermes)
Location: /home/yagi/.hermes/skills/creative/manim-video/SKILL.md
Description: Manim CE animations: 3Blue1Brown math/algo videos.

## p5js (hermes)
Location: /home/yagi/.hermes/skills/creative/p5js/SKILL.md
Description: p5.js sketches: gen art, shaders, interactive, 3D.

## pixel-art (hermes)
Location: /home/yagi/.hermes/skills/creative/pixel-art/SKILL.md
Description: Pixel art w/ era palettes (NES, Game Boy, PICO-8).

## popular-web-designs (hermes)
Location: /home/yagi/.hermes/skills/creative/popular-web-designs/SKILL.md
Description: 54 real design systems (Stripe, Linear, Vercel) as HTML/CSS.

## pretext (hermes)
Location: /home/yagi/.hermes/skills/creative/pretext/SKILL.md
Description: Use when building creative browser demos with @chenglou/pretext — DOM-free text layout for ASCII art, typographic flow around obstacles, text-as-geometry games, kinetic typography, and text-powered generative art. Produces single-file HTML demos by default.

## sketch (hermes)
Location: /home/yagi/.hermes/skills/creative/sketch/SKILL.md
Description: Throwaway HTML mockups: 2-3 design variants to compare.

## songwriting-and-ai-music (hermes)
Location: /home/yagi/.hermes/skills/creative/songwriting-and-ai-music/SKILL.md
Description: Songwriting craft and Suno AI music prompts.

## touchdesigner-mcp (hermes)
Location: /home/yagi/.hermes/skills/creative/touchdesigner-mcp/SKILL.md
Description: Control a running TouchDesigner instance via twozero MCP — create operators, set parameters, wire connections, execute Python, build real-time visuals. 36 native tools.

## jupyter-live-kernel (hermes)
Location: /home/yagi/.hermes/skills/data-science/jupyter-live-kernel/SKILL.md
Description: Iterative Python via live Jupyter kernel (hamelnb).

## kanban-orchestrator (hermes)
Location: /home/yagi/.hermes/skills/devops/kanban-orchestrator/SKILL.md
Description: Decomposition playbook + anti-temptation rules for an orchestrator profile routing work through Kanban. The "don't do the work yourself" rule and the basic lifecycle are auto-injected into every kanban worker's system prompt; this skill is the deeper playbook when you're specifically playing the orc

## kanban-worker (hermes)
Location: /home/yagi/.hermes/skills/devops/kanban-worker/SKILL.md
Description: Pitfalls, examples, and edge cases for Hermes Kanban workers. The lifecycle itself is auto-injected into every worker's system prompt as KANBAN_GUIDANCE (from agent/prompt_builder.py); this skill is what you load when you want deeper detail on specific scenarios.

## webhook-subscriptions (hermes)
Location: /home/yagi/.hermes/skills/devops/webhook-subscriptions/SKILL.md
Description: Webhook subscriptions: event-driven agent runs.

## dogfood (hermes)
Location: /home/yagi/.hermes/skills/dogfood/SKILL.md
Description: Exploratory QA of web apps: find bugs, evidence, reports.

## himalaya (hermes)
Location: /home/yagi/.hermes/skills/email/himalaya/SKILL.md
Description: Himalaya CLI: IMAP/SMTP email from terminal.

## minecraft-modpack-server (hermes)
Location: /home/yagi/.hermes/skills/gaming/minecraft-modpack-server/SKILL.md
Description: Host modded Minecraft servers (CurseForge, Modrinth).

## pokemon-player (hermes)
Location: /home/yagi/.hermes/skills/gaming/pokemon-player/SKILL.md
Description: Play Pokemon via headless emulator + RAM reads.

## codebase-inspection (hermes)
Location: /home/yagi/.hermes/skills/github/codebase-inspection/SKILL.md
Description: Inspect codebases w/ pygount: LOC, languages, ratios.

## github-auth (hermes)
Location: /home/yagi/.hermes/skills/github/github-auth/SKILL.md
Description: GitHub auth setup: HTTPS tokens, SSH keys, gh CLI login.

## github-code-review (hermes)
Location: /home/yagi/.hermes/skills/github/github-code-review/SKILL.md
Description: Review PRs: diffs, inline comments via gh or REST.

## github-issues (hermes)
Location: /home/yagi/.hermes/skills/github/github-issues/SKILL.md
Description: Create, triage, label, assign GitHub issues via gh or REST.

## github-pr-workflow (hermes)
Location: /home/yagi/.hermes/skills/github/github-pr-workflow/SKILL.md
Description: GitHub PR lifecycle: branch, commit, open, CI, merge.

## github-repo-management (hermes)
Location: /home/yagi/.hermes/skills/github/github-repo-management/SKILL.md
Description: Clone/create/fork repos; manage remotes, releases.

## native-mcp (hermes)
Location: /home/yagi/.hermes/skills/mcp/native-mcp/SKILL.md
Description: MCP client: connect servers, register tools (stdio/HTTP).

## gif-search (hermes)
Location: /home/yagi/.hermes/skills/media/gif-search/SKILL.md
Description: Search/download GIFs from Tenor via curl + jq.

## heartmula (hermes)
Location: /home/yagi/.hermes/skills/media/heartmula/SKILL.md
Description: HeartMuLa: Suno-like song generation from lyrics + tags.

## songsee (hermes)
Location: /home/yagi/.hermes/skills/media/songsee/SKILL.md
Description: Audio spectrograms/features (mel, chroma, MFCC) via CLI.

## spotify (hermes)
Location: /home/yagi/.hermes/skills/media/spotify/SKILL.md
Description: Spotify: play, search, queue, manage playlists and devices.

## youtube-content (hermes)
Location: /home/yagi/.hermes/skills/media/youtube-content/SKILL.md
Description: YouTube transcripts to summaries, threads, blogs.

## lm-evaluation-harness (hermes)
Location: /home/yagi/.hermes/skills/mlops/evaluation/lm-evaluation-harness/SKILL.md
Description: lm-eval-harness: benchmark LLMs (MMLU, GSM8K, etc.).

## weights-and-biases (hermes)
Location: /home/yagi/.hermes/skills/mlops/evaluation/weights-and-biases/SKILL.md
Description: W&B: log ML experiments, sweeps, model registry, dashboards.

## huggingface-hub (hermes)
Location: /home/yagi/.hermes/skills/mlops/huggingface-hub/SKILL.md
Description: HuggingFace hf CLI: search/download/upload models, datasets.

## llama-cpp (hermes)
Location: /home/yagi/.hermes/skills/mlops/inference/llama-cpp/SKILL.md
Description: llama.cpp local GGUF inference + HF Hub model discovery.

## obliteratus (hermes)
Location: /home/yagi/.hermes/skills/mlops/inference/obliteratus/SKILL.md
Description: OBLITERATUS: abliterate LLM refusals (diff-in-means).

## vllm (hermes)
Location: /home/yagi/.hermes/skills/mlops/inference/vllm/SKILL.md
Description: vLLM: high-throughput LLM serving, OpenAI API, quantization.

## audiocraft (hermes)
Location: /home/yagi/.hermes/skills/mlops/models/audiocraft/SKILL.md
Description: AudioCraft: MusicGen text-to-music, AudioGen text-to-sound.

## segment-anything (hermes)
Location: /home/yagi/.hermes/skills/mlops/models/segment-anything/SKILL.md
Description: SAM: zero-shot image segmentation via points, boxes, masks.

## dspy (hermes)
Location: /home/yagi/.hermes/skills/mlops/research/dspy/SKILL.md
Description: DSPy: declarative LM programs, auto-optimize prompts, RAG.

## obsidian (hermes)
Location: /home/yagi/.hermes/skills/note-taking/obsidian/SKILL.md
Description: Read, search, create, and edit notes in the Obsidian vault.

## airtable (hermes)
Location: /home/yagi/.hermes/skills/productivity/airtable/SKILL.md
Description: Airtable REST API via curl. Records CRUD, filters, upserts.

## google-workspace (hermes)
Location: /home/yagi/.hermes/skills/productivity/google-workspace/SKILL.md
Description: Gmail, Calendar, Drive, Docs, Sheets via gws CLI or Python.

## linear (hermes)
Location: /home/yagi/.hermes/skills/productivity/linear/SKILL.md
Description: Linear: manage issues, projects, teams via GraphQL + curl.

## maps (hermes)
Location: /home/yagi/.hermes/skills/productivity/maps/SKILL.md
Description: Geocode, POIs, routes, timezones via OpenStreetMap/OSRM.

## nano-pdf (hermes)
Location: /home/yagi/.hermes/skills/productivity/nano-pdf/SKILL.md
Description: Edit PDF text/typos/titles via nano-pdf CLI (NL prompts).

## notion (hermes)
Location: /home/yagi/.hermes/skills/productivity/notion/SKILL.md
Description: Notion API + ntn CLI: pages, databases, markdown, Workers.

## ocr-and-documents (hermes)
Location: /home/yagi/.hermes/skills/productivity/ocr-and-documents/SKILL.md
Description: Extract text from PDFs/scans (pymupdf, marker-pdf).

## powerpoint (hermes)
Location: /home/yagi/.hermes/skills/productivity/powerpoint/SKILL.md
Description: Create, read, edit .pptx decks, slides, notes, templates.

## teams-meeting-pipeline (hermes)
Location: /home/yagi/.hermes/skills/productivity/teams-meeting-pipeline/SKILL.md
Description: Operate the Teams meeting summary pipeline via Hermes CLI — summarize meetings, inspect pipeline status, replay jobs, manage Microsoft Graph subscriptions.

## godmode (hermes)
Location: /home/yagi/.hermes/skills/red-teaming/godmode/SKILL.md
Description: Jailbreak LLMs: Parseltongue, GODMODE, ULTRAPLINIAN.

## arxiv (hermes)
Location: /home/yagi/.hermes/skills/research/arxiv/SKILL.md
Description: Search arXiv papers by keyword, author, category, or ID.

## blogwatcher (hermes)
Location: /home/yagi/.hermes/skills/research/blogwatcher/SKILL.md
Description: Monitor blogs and RSS/Atom feeds via blogwatcher-cli tool.

## llm-wiki (hermes)
Location: /home/yagi/.hermes/skills/research/llm-wiki/SKILL.md
Description: Karpathy's LLM Wiki: build/query interlinked markdown KB.

## polymarket (hermes)
Location: /home/yagi/.hermes/skills/research/polymarket/SKILL.md
Description: Query Polymarket: markets, prices, orderbooks, history.

## research-paper-writing (hermes)
Location: /home/yagi/.hermes/skills/research/research-paper-writing/SKILL.md
Description: Write ML papers for NeurIPS/ICML/ICLR: design→submit.

## openhue (hermes)
Location: /home/yagi/.hermes/skills/smart-home/openhue/SKILL.md
Description: Control Philips Hue lights, scenes, rooms via OpenHue CLI.

## xurl (hermes)
Location: /home/yagi/.hermes/skills/social-media/xurl/SKILL.md
Description: X/Twitter via xurl CLI: post, search, DM, media, v2 API.

## debugging-hermes-tui-commands (hermes)
Location: /home/yagi/.hermes/skills/software-development/debugging-hermes-tui-commands/SKILL.md
Description: Debug Hermes TUI slash commands: Python, gateway, Ink UI.

## hermes-agent-skill-authoring (hermes)
Location: /home/yagi/.hermes/skills/software-development/hermes-agent-skill-authoring/SKILL.md
Description: Author in-repo SKILL.md: frontmatter, validator, structure.

## hermes-s6-container-supervision (hermes)
Location: /home/yagi/.hermes/skills/software-development/hermes-s6-container-supervision/SKILL.md
Description: Modify, debug, or extend the s6-overlay supervision tree inside the Hermes Agent Docker image — adding new services, debugging profile gateways, understanding the Architecture B main-program pattern.

## node-inspect-debugger (hermes)
Location: /home/yagi/.hermes/skills/software-development/node-inspect-debugger/SKILL.md
Description: Debug Node.js via --inspect + Chrome DevTools Protocol CLI.

## plan (hermes)
Location: /home/yagi/.hermes/skills/software-development/plan/SKILL.md
Description: Plan mode: write markdown plan to .hermes/plans/, no exec.

## python-debugpy (hermes)
Location: /home/yagi/.hermes/skills/software-development/python-debugpy/SKILL.md
Description: Debug Python: pdb REPL + debugpy remote (DAP).

## requesting-code-review (hermes)
Location: /home/yagi/.hermes/skills/software-development/requesting-code-review/SKILL.md
Description: Pre-commit review: security scan, quality gates, auto-fix.

## spike (hermes)
Location: /home/yagi/.hermes/skills/software-development/spike/SKILL.md
Description: Throwaway experiments to validate an idea before build.

## subagent-driven-development (hermes)
Location: /home/yagi/.hermes/skills/software-development/subagent-driven-development/SKILL.md
Description: Execute plans via delegate_task subagents (2-stage review).

## systematic-debugging (hermes)
Location: /home/yagi/.hermes/skills/software-development/systematic-debugging/SKILL.md
Description: 4-phase root cause debugging: understand bugs before fixing.

## test-driven-development (hermes)
Location: /home/yagi/.hermes/skills/software-development/test-driven-development/SKILL.md
Description: TDD: enforce RED-GREEN-REFACTOR, tests before code.

## writing-plans (hermes)
Location: /home/yagi/.hermes/skills/software-development/writing-plans/SKILL.md
Description: Write implementation plans: bite-sized tasks, paths, code.

## yuanbao (hermes)
Location: /home/yagi/.hermes/skills/yuanbao/SKILL.md
Description: Yuanbao (元宝) groups: @mention users, query info/members.

