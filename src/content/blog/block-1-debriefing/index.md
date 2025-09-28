---
title: "H4Sci 2025: Block 1 - Course Debriefing"
author: "Matt Bannert"
toc: false
draft: false
snippet: "Stack -- a developer's toolkit. We discussed how much DevOps a researcher and analyst really needs. Not all rabbit holes are for everyone. Git version control carpentry may be the one skill you must take a way from a semester of hacking for science... Read more!"
cover: ./dr_egghead_panics.jpg
coverAlt: "Dr. Egghead panics - too many tools and rabbit holes for him."
publishDate: "2025-09-26"
category: "Recap"
tags: [Data Science, Git, DevOps ]
---

## Maneuvering the Open Source Ecosystem (Choose Your Rabbit Holes)

To start diving into a new ecosystem can be daunting and overwhelming, particularly when system borders are fuzzy and the landscape seems to evolve at a break-neck pace.
In the first block of our course, we figured splitting the open source landscape into categories of tools provides a reasonable guideline: programming, languages, interaction environments, version control systems, data management, infrastructure, automation, communication and publishing tools.
Obviously, not every project needs tools of every category.
Still though, the ability to classify newly spotted software helps a great deal to figure out how deep you want to dive into learning a new technology.

[RSE Book: Stack - A Developer's Toolkit](https://rse-book.github.io/stack-developer-toolkit.html)

The one no-brainer tool choice that should be used in every software project or analysis is *git version control*.
Hence everyone using programming to tackle data quests should have carpentry level git skills.


## How Long Does It Take to Learn Git (And Where to Start)?

First of all, get two ecosystem related hurdles out of the way: SSH Key Pair authentication and Quitting Vim.
Both hurdles do not even have anything to do with git itself.
Nevertheless newcomers will inevitably bump into them and potentially loose valuable motivation and endurance before they even started.

Once your public key is with your remote git provider of choice and you know how to quit a hacker's favorite text editor you're good to go. If you're new to git, i.e., you don't use git every week, here are a few steps to give you a bit of guidance getting started:

- **step 0** (30 minutes): Google how to quit vim. Google how generate an SSH Key pair. Find a solution that works for you. Apply.
[H4SCi YouTube Channel: A Login Process to Foster Automation](https://www.youtube.com/watch?v=yBnPKOcK31A&list=PLurgzfjmXEaOerL2hWo443Asyq0nFyupG&index=4) | [Use RStudiop to create an SSH Key Pair](https://rse-book.github.io/case-studies.html#sec-rsa)

- **step 1** (5 minutes): get an idea about the scope of your commitment first: [H4Sci YouTube on How Long Does It Take to Learn Git? ](https://www.youtube.com/watch?v=YmWQfQXgAj0)

- **step 2** (1 hour): read through the basics. We strongly recommend to use the CLI to walk through basic steps. Learning the basic syntax will greatly and sustainably improve your understanding of the most important code management and collaboration tool around: [RSE Book: Version Control Chapter](https://rse-book.github.io/version-control.html)

- **step 3** (a few hours / a day): play around with the git CLI, a local and a remote repository. Try to practice with others involving a remote repository. Being able to solve tasks 1-3 is a good first milestone: [H4Sci Tasks](https://github.com/h4sci/h4sci-tasks/issues)

- **step 4** (1-3 months): become a regular git user who sleep walks through commit, push and pulls as well as forks and merge request. At this point you can contribute to existing open source projects and evaluate repositories / software projects you find online.

## Additional Git Ressources

There is so much information on git available that it may be impossible to compose a comprehensive list.
Certainly, such a list is beyond the scope of this blog post.
Still, here a few git resources:

- Jan Simson's introduction to git (Dedicated Git Course taught at KIT, Germany): [https://simson.io/intro-to-git/](https://simson.io/intro-to-git/)

- Pitfalls and quick resolutions: [Oh Shit Git](https://ohshitgit.com/)

- Rebase vs. merge strategy (advanced discussion): [Atlassian tutorial](https://www.atlassian.com/git/tutorials/merging-vs-rebasing)

- Alternative, free and fast git provider based on OSS forgejo, hosted in Switzerland: [codefloe](https://codefloe.com)
