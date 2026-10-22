---
title: "Herding Agents"
author: "Matt Bannert"
toc: false
draft: false
snippet: "Terminal multiplexers used to tile your terminal so you could keep an eye on a compile and a server log at the same time. In the agent era, panes tile your *agents*. Herdr is a multiplexer built for exactly that — scripting coding agents while still watching them work. A worked example: a multi-agent code review of my Rust/Svelte/Tauri time tracker."
cover: ./cover.png
coverAlt: "The herdr sheep logo next to three terminal panes labelled rust-reviewer, sql-reviewer, and svelte-reviewer, each reporting DONE."
publishDate: "2026-10-22"
category: "AI, DevOps, Tools"
tags: [Herdr, Agents, Multiplexer, Claude, Rust, Tauri, Codefloe]
---

Terminal multiplexers have been quietly running in the background of serious terminal work for roughly two decades. The idea is simple: let one terminal window host many sessions, keep them alive across disconnects, and let you walk away from a long-running job without killing it. For a generation of sysadmins and developers, [tmux](https://github.com/tmux/tmux) is *the* multiplexer — the mother of them all — with [GNU screen](https://www.gnu.org/software/screen/) as the grandparent nobody wants to meet in a dark alley anymore. If you have never run tmux, there is a vast universe of cheat sheets, dotfiles, and opinionated setups waiting for you. This post is not another one of those.

This post is about a newer multiplexer called [herdr](https://herdr.io/), and specifically about the one thing that makes it different: it was built to shepherd *coding agents*, not just shells.

## Herdr, in One Paragraph

Herdr is a terminal multiplexer. Panes, tabs, workspaces, keybindings — all the usual mechanics. For the standard multiplexer parts the [docs](https://herdr.io/) are the right place to start, and I will not re-document them here. What matters for this post is that herdr treats coding agents as first-class citizens: `herdr agent start`, `herdr agent prompt`, `herdr agent wait`, `herdr agent get`. Each pane can host an agent, and the whole mesh of panes-and-agents is addressable from a shell script.

## Multiplexers for the AI Age

In the tmux era, panes meant *human* parallelism — one eye on the compiler, another on the server log, a third on `htop`. In the agent era, panes mean *agent* parallelism: three Claude instances reviewing three parts of a Rust/Tauri app at the same time, while a human sits in a fourth pane and watches any of them narrate what they are doing. The pane layout is still the human interface, but the choreography underneath becomes a script: fan out work to multiple agents, wait for them to settle, fan their output back in to a synthesizer, hand the result to the human (or to yet another agent).

Herdr leans into exactly that. Every multiplexer operation — split a pane, change focus, start a shell — is also a CLI call. Every agent operation — kick off a prompt, poll status, wait for a settled state — is a CLI call too. The combination is a scriptable choreography layer for coding agents that still looks and feels like a terminal to the human sitting in front of it. Automation without a headless pipeline.

## A Worked Example: Reviewing jellytrack in Parallel

To make this concrete, I ran a multi-agent code review of my own time tracker, [jellytrack](https://jellytrack.alpine-jellyfish.ch/) — a Rust + Svelte 5 + Tauri 2 project hosted on the ultra-progressive git platform [codefloe](https://codefloe.com/alpine-jellyfish/jellytrack) — using herdr. The script lives at [h4sci-herdr/review-chain.fish](https://codefloe.com/h4sci/h4sci-herdr), and the pattern is a classic fan-out / fan-in:

```
+----------+-------------+
|          |   rust      |
|   you    +-------------+
|          |   sql       |
|          +-------------+
|          |   svelte    |
+----------+-------------+
```

Three reviewer agents, each pinned to its own pane, each pointed at a different slice of the codebase:

- `rust-reviewer` — only files under `src-tauri/`, looking for command-handler correctness, error handling, panics, suspicious use of the `unstable` Tauri feature, and state/lifetime issues.
- `sql-reviewer` — `src/lib/db.ts` and `src-tauri/capabilities/*`, looking for SQL injection risk, schema evolution problems, and over-broad Tauri capability grants.
- `svelte-reviewer` — Svelte 5 reactivity bugs and state-sync issues, with special attention to the 946-line `Entries.svelte`.

Each reviewer writes findings to its own markdown file. When all three are done, a fourth agent — the `synthesizer` — reads the three files and produces a single prioritized `report.md`.

Three lines of the fish script are worth lingering on. First, the fan-out layout — three nested `pane split` calls, each returning a pane id that the next call can target:

```fish
set -l rust_pane   (herdr pane split --current         --direction right --cwd $repo --no-focus | jq -r '.result.pane.pane_id')
set -l sql_pane    (herdr pane split --pane $rust_pane --direction down  --cwd $repo --no-focus | jq -r '.result.pane.pane_id')
set -l svelte_pane (herdr pane split --pane $sql_pane  --direction down  --cwd $repo --no-focus | jq -r '.result.pane.pane_id')
```

Second, starting a named agent in each pane:

```fish
herdr agent start rust-reviewer --kind claude --pane $rust_pane -- --permission-mode acceptEdits
```

And third, the prompt itself — fired with `--wait &` so all three prompts run concurrently, joined by a plain `wait`:

```fish
herdr agent prompt rust-reviewer "You are reviewing..." --wait --timeout 600000 &
```

### The Lesson You Only Learn by Running It Once

The script contains a small helper that is more interesting than it looks:

```fish
function wait_unblocked
    set -l name $argv[1]
    while test (herdr agent get $name | jq -r '.result.agent.agent_status') = blocked
        echo "⚠ $name is blocked — approve the dialog in its pane, then I'll keep waiting." >&2
        herdr agent wait $name --timeout 600000 > /dev/null
    end
end
```

The reason it exists: `agent prompt --wait` returns as soon as the agent reaches *any* settled state — and `blocked` is settled. The first time I ran this chain, the script marched happily through to the synthesis step while all three reviewers were still sitting at an approval dialog, waiting for me to click. The report came out empty, in a way that looked a lot like success.

The two-line fix is to loop while the agent reports `blocked` and nudge the human in the pane. It is the kind of thing you can only learn by running the chain once and watching it fail convincingly.

(Related operational detail worth mentioning: Claude Code shows a one-time "Do you trust the files in this folder?" dialog the first time it runs in a new directory. `--permission-mode acceptEdits` does *not* bypass that one. Pre-trust each working directory once by hand before you script against it.)

### Fan In

Once all three reviewers are done — unblocked and done, not merely settled — a new pane is opened and a `synthesizer` agent is started in it with one job: read the three reviewer files, dedupe overlapping findings, prioritize, and write a single `report.md`.

```fish
set -l synth_pane (herdr pane split --current --direction down --cwd (pwd) --no-focus | jq -r '.result.pane.pane_id')
herdr agent start synthesizer --kind claude --pane $synth_pane -- --permission-mode acceptEdits
herdr agent prompt synthesizer "Read these three review files..." --wait --timeout 600000
wait_unblocked synthesizer
```

On this particular run, the synthesized report flagged six high-severity issues clustered at the Rust ↔ JavaScript boundary — a `create_new_db` command that would cheerfully `remove_file()` on any path the frontend passed it, a sqlite:// connection URL built with `format!()` on a raw path (so a space, `#`, `?`, or `%` silently opens the wrong file or none), a latent SQL identifier-injection in `updateEntry`, and a double-load race in two Svelte components that silently reverts unsaved notes. None of those were on my own to-do list.

## What This Actually Buys You

Orchestrating three reviewers from a fish script is, on its face, not that different from running three `claude` processes in three tmux panes by hand. The difference is in the margins:

- **Status is machine-readable.** `herdr agent get` returns JSON with the agent's status, so a script can tell "settled but blocked" apart from "settled and done." A human skimming three tmux panes cannot easily do that at speed, and definitely cannot do it reliably at four in the afternoon.
- **Hand-off is a script step.** Fan-in from three reviewers to a synthesizer is just another `herdr agent start` plus a `herdr agent prompt`. No copy-paste, no window-switching ritual, no "paste this into the other Claude" dance.
- **The human stays in the room.** The whole chain runs in a visible pane layout, so I can watch any reviewer's actual output while the script is coordinating them. It is not a headless pipeline that produces a mystery artifact; it is a supervised one.

For solo, open-ended work — a brainstorm, a design discussion, writing this blog post — a single Claude session with a brainstorming skill still wins, and the multiplexer-as-orchestrator is just overhead. For bounded, parallelizable work with a clear fan-in step — code reviews, multi-angle research, rendering the same document in three formats, running the same migration against three environments — the pattern starts to earn its keep almost immediately.

The mother multiplexer tiled your terminal. Herdr tiles your agents.
