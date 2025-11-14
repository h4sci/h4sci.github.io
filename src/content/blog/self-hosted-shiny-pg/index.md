---
title: "From Lab to Production: an R Shiny Survey with a Database Backend"
author: "Matthias Bannert & Minna Heim"
toc: false
draft: false
snippet: "At the first glimpse, building a survey application might seem like a frontend exercise, but it's actually a great vehicle for understanding Docker and containerization. An online survey inherently requires multiple components working together: a web interface for participants, a database for storing responses, and communication between these parts. These needs make it an ideal real-world example for learning docker-compose - a tool to coordinate multiple application parts in light weight fashion."
cover: ./shiny-survey.png
coverAlt: "R Shiny Frontend of an online survey"
publishDate: "2025-11-14"
category: "SELF-HOSTED, DevOps, Tutorial"
tags: [Survey, R, Shiny, Postgres, Docker, docker-compose]
---


Imagine you're a chef who's perfected a complex recipe at home. It works beautifully in your kitchen with your pots, your stove, and your ingredients. But when you try to recreate it at a friend's house, nothing quite works the same way—the oven runs hot, the measurements are in different units, and you're missing that one crucial spice. This is essentially the problem developers face when moving applications between different computers and servers. Enter Docker: the solution that packages your application along with its entire "kitchen" so it works identically everywhere.

<div class="text-4xl">"With Docker, your multi-parts application becomes a self-contained unit."</div>

In this post, we'll build a simple but working survey application using R Shiny and PostgreSQL. Our real focus though is on **how Docker transforms your development workflow**. We'll see how Docker containers solve the "works on my machine" problem, how Docker Compose allows us to manage multi-container applications with ease. And why Docker is a game changer not only for seasoned Sysadmins and DevOps gurus but what it can do for data scientists and other applied researchers.


## Component Overview

**Docker** provides a runtime environment that allows you to run instances (containers) of previously built docker images. Think of a Docker image as a snapshot containing your application and everything it needs to run—the programming language, libraries, dependencies, system tools, and configuration. Containers are isolated from your host system and from each other, yet they can communicate when you tell them to. A bit like multiple self-contained computers running on your laptop, each doing its own job.

**Docker Compose** takes this containerization a step further. While Docker handles individual containers, Docker Compose coordinates multiple containers as a unified application. You describe your entire application stack in a single YAML file: Which containers do you need? How do they connect? What ports do they expose? Docker Compose handles the rest. One command brings everything up; one command tears it down.

**R Shiny** is a web application framework that allows statisticians and data scientists to stay firmly within their domain when creating web graphical user interfaces (GUIs). If you're comfortable with R, you can build interactive web applications without *needing* to learn JavaScript, HTML, or CSS. This way you can leverage your existing R skills to create a data collection tool without leaving R.

**PostgreSQL** is the self-proclaimed "world's most advanced open source database" when it comes to relational database management systems (RDBMS). It's robust, handles concurrent connections well, and integrates seamlessly with R.


## Frontend Component: R Shiny

For the frontend, we create a Shiny app that presents survey questions to users. The beauty of using Shiny here is that you can design your survey, add conditional logic — all without leaving the R environment. Our shiny app consists of two files: 1) ui.R holding a simple user interface and 2) server.R containing the logic and storage functions behind the survey. For more detailed discussion of shiny see the [shiny case study in the RSE book]().

Demo survey ui.R:

```r
fluidPage(
  theme = shinytheme("superhero"),
  title = "Hacking for Sciences - Demo Survey",
  fluidRow(
    column(
      width = 6,
      div(
        class = "jumbotron",
        h1("Hacking for Sciences"),
        p("Some Introductory paragraph motivating our survey.")
      )
    )
  ),
  uiOutput("basic_questions"),
  uiOutput("submit"),
  uiOutput("thanks")
)


```

## Backend Component: Postgres Database

For the backend, we need to *once* create a PostgreSQL database schema and table structure that can store participants' answers. The table design will depend on your specific survey, but generally you will want to capture things like a unique response ID, timestamp, and columns for each survey question. Obviously, we can think of more complex designs such as separate tables for different questions types etc.

Here's a simple one table CREATE TABLE statement:

```sql
CREATE TABLE rseed.h4sci_intro(
  id text,
  free_text text,
  demo_slider int,
  survey_year int,
  PRIMARY KEY (id)
);
```

## Middleware Component: server.R

The server.R file is a layer that takes the information from the frontend and sends it to the underlying Postgres database.

```r
library(shiny)
library(shinyjs)
library(DBI)
library(RPostgres)

shinyServer(function(input, output, session) {
  # it should be sufficient to store the session token.
  # cookies auth is a more sophisticated alternative, but
  # let's not dive into js to deep for now.
  # session$token

  store_record <- function(response) {
    con <- dbConnect(
      drv = Postgres(),
      user = "postgres",
      host = "localhost",
      dbname = "postgres",
      password = "postgres",
      port = 1111
    )
    dbExecute(con, "SET SEARCH_PATH=rseed")
    dbAppendTable(con, dbQuoteIdentifier(con, "h4sci_intro"), response)
    dbDisconnect(con)
  }

  submitted <- reactiveVal(FALSE)

  response <- reactive({
    dt <- data.frame(
      id = session$token,
      free_text = paste(input$free_text, collapse = ","),
      demo_slider = input$demo_slider,
      survey_year = 2024,
      stringsAsFactors = FALSE
    )
  })

  observeEvent(input$submit, {
    store_record(response())
    submitted(TRUE)
    # has_participated(TRUE)
    # js$setcookie("HAS_PARTICIPATED_IN_SPOSM_INTRO_SURVEY")
  })


```



## Backend Component: Docker

First, before we look at the implementation details, let's compare the traditional local host approach with the containerized approach. That is where we see why Docker (=containerization for our purposes) is transformative.

<div class="text-4xl">"The cool thing about containers is, they run virtually — pun intended — the same way on a remote server as they run on your local notebook."</div>

### Traditional Approach: Running Locally

Running your R frontend locally is relatively straightforward if you're a data scientist who works with R interactively. You open RStudio, load your Shiny app script, and click "Run App." The application launches in your browser, done.

But there are challenges around the corner: **Problem 1: Isolation.** When you run the application on your laptop, other people can't access it. **Problem 2: PostgreSQL installation.** You could install PostgreSQL directly on your operating system. That is, download the installer, set up a database server, configure users and permissions. But PostgreSQL configuration varies across platforms Windows, macOS and Linux may all behave differently. What version are you running? What port is it using? How do you ensure your colleague's setup matches yours? **Problem 3: Dependency management.** Your Shiny app needs specific R packages. Did you remember to document which ones? What versions? What if your colleague has a different version of R installed? **Problem 4: Sharing and collaboration.** To share your application, you'd need to write extensive setup instructions: "First install R version X.X.X, then PostgreSQL 16, then run these SQL scripts, then install these R packages, then configure these environment variables..."

### Containers to the Rescue

With Docker, your multi-parts application becomes a self-contained unit. You define your entire application in some configuration file, for example:

- A container running your Shiny app with the exact R version and packages it needs
- A container running PostgreSQL with the database already initialized
- How these containers connect to each other
- What ports are exposed to the outside world

In practice, a *docker-compose.yaml* file for our survey application could look like this:

```yaml
services:
   shiny:
      container_name: fe_shiny
      image: rocker/shiny
      restart: always
      ports: 3838:3838
      volumes:
        - "./shiny_data:/"
   postgres:
      # a name, e.g.,  db_container is instrumental to be
      # called as host from the shiny app
      container_name: db_container
      image: postgres
      restart: always
      environment:
         - POSTGRES_USER=postgres
         - POSTGRES_PASSWORD=postgres # Don't use passwords like this in production
      # This port mapping is only necessary to connect from the host,
      # not to let containers talk to each other.
      # port-forwarding: from host port:to docker port -> mapping
      ports:
         - "1111:5432"
      # if container killed, then data is still stored in volume (locally)
      volumes:
         - "./pgdata:/var/lib/postgresql/data"
```


Given a runtime environment that allows you to run Docker, users can run our entire app with a single command. They don't need R installed. They don't need PostgreSQL installed. They don't need to configure anything. Just run `docker-compose up`.

| Command | Description |
|---------|-------------|
| `docker-compose up` | Starts both containers, creates a network between them, initializes the database |
| `docker-compose down` | Stops everything cleanly |
| `docker-compose logs` | View logs from all containers |
| `docker-compose restart` | Restart services without rebuilding |



### Environments to Run Docker on Your Computer

The cool thing about containers, they run virtually -- pun intended -- the same way on a remote server as they run on your local notebook. This is especially great for non-computer science researchers who - like many if not most data scientists - learned programming by solving (data) puzzles: developing for an app-life inside an isolated, standalone container teaches us to include and manage dependencies properly. It helps us understand that the difference between relative and absolute paths matters.

**Docker Desktop and Docker CE**

Yet, we need an environment to make containers run on our local computer. While Linux simply uses the same docker-ce (ce = community edition) as servers would, MacOs und Windows use Docker Desktop. Docker Desktop provides a graphical interface and handles some of the complexity of running Docker on non-Linux systems. Once installed, the experience is consistent across all platforms[^1].

## Disclaimer

This blog post experimented with using AI not to generate code (which was when people wore pyjamas and lived live slow), but regular text. Still, you are reading a post with more than just a human note. I've used the following pattern: Define section -> add bullet items to each section -> ask AI to flesh each section out -> feedback loop -> declutter, remove content -> add code examples -> fine tune. Hmm, I haven't made my mind up whether I saved time and/or energy until I reached a self-set finish line. Was it more fun? Hard to tell, too. I'll continue to work on different techniques and keep you posted.

[^1]: Mac OS, you could also use [orbstack](https://orbstack.dev) or [colima](https://abiosoft.github.com/colima) to run docker if you need an alternative due to licensing or other reasons.
