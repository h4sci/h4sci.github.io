---
title: "Humans in the Vibe"
author: "Matt Bannert"
toc: false
draft: false
snippet: "Hikaru still plays chess, Harry Mack still freestyles, and software stocks still hold value even as single developers reproduce established suites in record time. I built a small macOS time tracker trying to add value as a human in the AI age — and to find out where creating software is still fun. The result is jellytrack: a Tauri + Rust + SQLite menu-bar app with a sibling Quarto reporting layer."
cover: ./stack.svg
coverAlt: "Stack: Rust, Tauri, SQLite, codefloe, Crow CI"
publishDate: "2026-10-20"
category: "Rust, Quarto, AI"
tags: [Rust, Quarto, AI, Codefloe, CrowCI]
---

Hikaru and his friends keep playing chess. Harry Mack still freestyles on the street every week. Software stocks still hold value even as [solo developers reproduce established juggernauts](https://getartcraft.com/) like Adobe's creative suite in record time. The question is no longer whether humans *can* still create software — the question is where it is still worth doing, and where it is still *fun*.

To find out, I built a small tool myself: [jellytrack](https://jellytrack.alpine-jellyfish.ch/), a menu-bar time tracker for macOS. The mission was simple — contribute end-to-end and enjoy the ride. What follows is less of a tutorial rather than a field report on where a human adds value when the keyboard is mostly operated by an LLM.

## The First Human Contribution: Make It Useful

The big-data years taught me: everyone is looking for use cases for their shiny new tech. Three questions had to come back with a yes before I started:

- Was there an actual need of mine — and hopefully of others, too?
- Could I ship a minimum viable product before disappearing down a rabbit hole?
- Was there no existing tool at a price comparable to two or three vibe-coding afternoons?

My little tool checked all three: I hated time tracking the way I had been doing it. The scope was narrow enough that the rabbit's ears were already poking out of the hole, so I could reasonably hope to finish instead of getting side-tracked and ultimately giving up. Finally, there are tons of trackers out there, but they focus on additional functionality from dashboards to system integration instead of tackling the awkwardness of time tracking as a compliance ritual. So, yes, it felt like I could talk myself into spending a few afternoons on the project. Plus, an exact fit was clearly my itch. And exactly where I could contribute based on years of experience and unhappiness with tracking in pet projects, academic research, university teaching, consulting, and DevOps engineering.

Pressure-testing this itch with Claude Opus' brainstorming skill was the first place where a human still clearly added value. Plus talking to a patient listener that (almost) never gets annoyed by yet another personal pipedream of an idea the world needed an app for. It got the discussion started and lifted the USP definition another level. At the same time the resoluting notes were a great starting point and anchor for specification and prompts that to could be executed *in parallel* by subagents.

## The Second Human Contribution: Avoiding Confirmation Bias

Choosing the stack is where a human still earns their keep. LLM-driven tools tend to confirm: ask them to compare two options and they will quietly use your prompt to predict your preference, then hand it back to you. They often know your bias before you do. Skip the explicit stack discussion entirely and models default to the most popular choices. After all, you end up with a rag-rug of SaaS tools glued together just because you did not mention your self-hosting capabilities and expertise explicitly.

For example, in the case of jellytrack, the following were deliberate human-made decisions: 

- **Local-first over sync.** Learning from existing apps, a tracker built around syncing and sharing quickly becomes the default path. Interactively challenging my own intuition that there was a need for a local-first tool was worthwhile. Last but not least, deliberately steering the project was fun, too.
- **Integration-first over dashboards.** Jellytrack is explicitly aimed at people who build their own reports. The app records; analysis happens elsewhere. A plain SQLite file on disk serves the raw data to the data scientist.
- **Desktop over web.** A menu-bar icon one second away from your current task beats a browser tab every time. Recording had to happen when the work was happening. 

Those three decisions picked the stack almost on their own:

- [**Tauri 2**](https://tauri.app/) (Rust) for the app shell, tray integration, and window management — small binary, native menu bar, none of Electron's weight.
- **SvelteKit** with Svelte 5 runes on the frontend, bundled with **Bun**.
- **SQLite** via `tauri-plugin-sql` — the whole database is a file the user owns and can point any tool at.

The source lives at [codefloe.com/alpine-jellyfish/jellytrack](https://codefloe.com/alpine-jellyfish/jellytrack). (FWIW, hosting on [codefloe](https://codefloe.com/) is another deliberate, human decision here. A small platform that is ultra-transparent about their stack and approach, is blazing fast compared to all common Git platforms I tried, has significantly lower downtimes than most and comes with a very generous free CI minutes offering built on [Crow CI](https://crowci.com/). Plus, unlike some independent GitHub alternatives, it does not run an anti-AI campaign, providing a great basis to share my little experimental project.)

Speaking of the codebase: Rust for everything that touches the OS, Svelte for everything the user sees, and a readable schema in between. I once tried Rust in 2019 and felt I was not enough of a nerd to move code from my existing work to Rust, still I liked the approach and vowed to come back and give it a second chance. AI has essentially eliminated the part about Rust that was too hard for many and with every project that teaches me more about Rust I like it better for CLIs, middleware and lately desktop. Tauri is my latest addition to the stack and I can't say much yet. It gives you a cross-platform desktop app in a binary roughly a tenth of an Electron build, and the trade-off (steeper learning curve) is exactly the kind of thing a well-prompted LLM flattens.

## The Third Human Contribution: Leveraging Data Science - Collect Data, Report Separately

Working in data science, data engineering and devOps for data science for the past 20 years, I wanted to leverage my background to create a tool tailored for data scientists. A zero human intervention tool would clearly have been possible (and working) in 2026. And as remarkable as this is, such a tool would likely not fit my niche of an audience.

The design principle that made jellytrack enjoyable to build is that the app does not do reporting. It records what you worked on, and when. That is it. All the analysis lives in a sibling repository: [codefloe.com/alpine-jellyfish/jellytrack-reports](https://codefloe.com/alpine-jellyfish/jellytrack-reports). Humans are staying in the mix via Quarto (or any other reporting framework) to express their creativity and needs through R or Python code while adding prose as they need.

My repo shares **Quarto** templates — written in R, using `dplyr`, `ggplot2`, and `RSQLite` — that connect directly to the jellytrack SQLite database. The lookup is deliberate and overridable: first a `JELLYTRACK_DB` environment variable, then the app's custom database picker, finally the default location. The first template, `weekly-hours-by-project.qmd`, is a rolling twelve-week review with current-week metrics, stacked bar charts, weekly summaries, and project rankings, rendered to a self-contained HTML file. Styling is a small SCSS theme that mirrors the app's visual language.

The split is deliberate. Jellytrack users are the kind of people who already know their way around `dplyr`, pandas, or DuckDB. Giving them a plain `.db` file and a template they can fork is the  respectful [platinum treatment (= treating others not like you want to be treated but like they want to be treated)](https://www.linkedin.com/posts/tareefk_you-should-consider-using-the-platinum-rule-activity-7503090673617846273-vQsS) than shipping a hard-coded dashboard. It also keeps the tracking app small and the reporting layer easy to evolve without redeploying anything. 

## Stay Motivated! (We Were Never Better Than Magnus...)

Clearly, the economics of creating software have changed, but the cards are still being shuffled. 
Here's back-of-the-envelope for jellytrack: an afternoon valued modestly at CHF 20, three of them, plus roughly CHF 5 in Claude tokens — the MVP cost just under CHF 65. 
If there was decently fitting tool that was not too hard to find and priced below CHF 65 people like me should still buy it. Maybe, a more commercially motivated version of jellytrack could add a hosted variant and sell subscriptions. A combo model like [ARTCRAFT's](https://getartcraft.com/apps). Still today, there are plenty of chances. We just have to keep finding our roles.

Plus, we were never better at basketball than Michael Jordan. Harry Mack's lexical diversity is easily outmatched by even a cheap LLM. We were never better at chess than Magnus. And Hikaru was not either. Still millions enjoy Harry Mack's freestyle lyrics on YouTube, many are watching Hikaru's chess channels. Millions around the world still play basketball. Because, all of these activities are fun. Because keeping humans not just in the loop as approval clickers but as creative designers will help in the long run because our emotions are important drivers.

> Our mission is to not get bored by the process.
