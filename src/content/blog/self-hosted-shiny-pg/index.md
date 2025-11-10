---
title: "From Lab to Production: an R Shiny Survey with a Database Backend"
author: "Matthias Bannert & Minna Heim"
toc: false
draft: false
snippet: ""
cover: ./shiny-survey.png
coverAlt: "Dr. Egghead panics - too many tools and rabbit holes for him."
publishDate: "2025-11-23"
category: "SELF-HOSTED, DevOps, Tutorial"
tags: [Data Science, API, R]
---


## Component Overview

- R Shiny is a web application framework that allows Statisticians to stay in their domain when creating a website.
- Postgres is the self-proclaimed most advanced open source database when it comes relational database management systems (RDBMS).
- docker runtime environment allows to run instances of previously built docker images


## Our Application: a Shiny Based Online Survey

- a survey needs a web frontend so participants could use their browsers
- a survey needs a backend so answers can be stored in a database.
- first let's consider the frontend -> code snippet for the survey.
- for the backend we need to first create a schema and table so we can store participants' answers, show the SQL create table statement.


## Run your host vs. Container

- running your R frontend locally is kinda easy, and as a data scientist, you run R interactively often, but still: running on your notebook other can't access it.
- postgres
- Depending on your operating system, you can either use docker-ce directly or use Docker Desktop to run locally.
- docker-compose
