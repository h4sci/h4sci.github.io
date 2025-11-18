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

In this post, we'll build a simple but working survey application using R Shiny and PostgreSQL. Our real focus though is on **how Docker transforms our development workflow**. We'll see how Docker containers solve the "works on my machine" problem, how Docker Compose allows us to manage multi-container applications with ease. And we'll see why Docker is such a game changer not only for seasoned Sysadmins and DevOps gurus but what it can do for data scientists and other applied researchers.


## Component Overview

**Docker** provides a runtime environment that allows us to run instances (containers) of previously built docker images. Think of a Docker image as a snapshot containing our application and everything it needs to run—the programming language, libraries, dependencies, system tools, and configuration. Containers are isolated from our host system and from each other, yet they can communicate when we tell them to. A bit like multiple self-contained computers running on our laptop, each doing its own job.

**Docker Compose** takes containerization a step further. While simple Docker handles individual containers, Docker Compose coordinates multiple containers as a unified application. To do this, we describe our entire application stack in a single YAML file: Which containers do we need? How do they connect? What ports do they expose? Docker Compose handles all of this. One command brings everything up -- another tears it down again.

**R Shiny** is a web application framework that allows statisticians and data scientists to stay firmly within their domain when creating web based graphical user interfaces (GUIs). If we're comfortable with R, we can build interactive web applications without *needing* to learn JavaScript, HTML or CSS. This way we can leverage our existing R skills to create a data collection tool or an interactive data visualisation tool without leaving R.

**PostgreSQL** is the self-proclaimed "world's most advanced open source database" when it comes to relational database management systems (RDBMS). It's robust, handles concurrent connections well, and integrates seamlessly with R.


## Backend Component: Docker

First, before we look at the implementation details, let's compare the traditional approach to host all these parts locally with the containerized approach. That is where we see why Docker is transformative (=containerization for our purposes).

<div class="text-4xl">"The cool thing about containers is, they run virtually — pun intended — the same way on a remote server as they run on our local notebook."</div>

### Traditional Approach: Running Locally

Running our R frontend locally is relatively straightforward if we're a data scientist who works with R interactively. We open RStudio, load our Shiny app script, and click "Run App." The application launches in our browser, done.

But there are challenges around the corner: 

**Problem 1: Isolation.** When we run the application on our laptop, other people can't access it.

**Problem 2: PostgreSQL installation.** We could install PostgreSQL directly on our operating system. That is, download the installer, set up a database server, configure users and permissions. But PostgreSQL configuration varies across platforms Windows, macOS and Linux may all behave differently. What version are we running? What port is it using? How do we ensure our colleague's setup matches ours?
 
**Problem 3: Dependency management.** Our Shiny app needs specific R packages. Did we remember to document which ones? What versions? What if our colleague has a different version of R installed? 
 
**Problem 4: Sharing and collaboration.** To share our application, we'd need to write extensive setup instructions: "First install R version X.X.X, then PostgreSQL 16, then run these SQL scripts, then install these R packages, then configure these environment variables..."

### Containers to the Rescue

With Docker, our multi-parts application becomes a self-contained unit. We define our entire application in a configuration file. Basically we run two services: a) an *R Shiny frontend* service
and b) a *Postgres Backend* service. By giving containers names, these containers can be accessed from the other container using that name, e.g., *db_container* instead of localhost. Note, that we use an off-the-shelf postgres image and a custom image for the shiny service. Our shiny DOCKERFILE recipe to build the shiny image is super minimal and not really lean and optimised, but a quick and working solution that avoids the rabbit hole of in-depth image optimization. That's another blog post - stay tuned :).

In the compose file below, note the mounted *volumes* which are effectively folders on the host system that allow us to persist files beyond the lifetime of our containers. For the database container, it is used to persist the answers. For shiny it is used to persist the R code and allow for changes without rebuilding the entire image.


In practice, a `docker-compose.yaml` file for our survey application could look like this:

```yaml
services:
   shiny:
      container_name: fe_shiny
      build:
         context: ./shiny-image
         dockerfile: DOCKERFILE
      restart: always
      ports:
         - "3838:3838"
      volumes:
         - "./shiny_data:/srv/shiny-server"
      command: ["R", "--vanilla", "-e", "shiny::runApp('/srv/shiny-server/survey', host='0.0.0.0', port=3838)"]
   postgres:
      # a name, e.g.,  db_container is instrumental to be
      # called as host from the shiny app
      container_name: db_container
      image: postgres:15-alpine
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


### Running Containers with Docker Compose

Given a runtime environment that allows you to run Docker, users can run our entire app with a single command. They don't need R installed. They don't need PostgreSQL installed. They don't need to configure anything. Just run `docker-compose up`.

| Command | Description |
|---------|-------------|
| `docker-compose up` | Starts both containers, creates a network between them, initializes the database |
| `docker-compose down` | Stops everything cleanly |
| `docker-compose logs` | View logs from all containers |
| `docker-compose restart` | Restart services without rebuilding |



### Environments to Run Docker on Our Computer

The fact that running Docker locally is similar to running it on a server is especially great for non-computer science researchers who - like many if not most data scientists - learned programming by solving (data) puzzles. Developing for an app-life inside an isolated, standalone container teaches us to recognise what the quintessential dependencies are that are needed to run an application, and help us include and manage these dependencies properly. Among other things it helps us understand that the difference between relative and absolute paths matters (and that hardcoded absolute path that only exist on your machine are just never a good idea).

**Docker Desktop and Docker CE**

Yet, we need an environment to make containers run on our local computer. While Linux simply uses the same docker-ce (ce = community edition) as servers would, MacOS und Windows use Docker Desktop. Docker Desktop provides a graphical interface and handles some of the complexity of running Docker on non-Linux systems. Once installed, the experience is consistent across all platforms[^1].


## Breaking Down the Components: R Shiny Frontend

For the frontend, we create a Shiny app that presents survey questions to users. The beauty of using Shiny here is that we can design our survey, add conditional logic — all without leaving the R environment. Our shiny app consists of two files: 1) `ui.R` holding a simple user interface and 2) `server.R` containing the logic and storage functions behind the survey. For more detailed discussion of shiny see the [shiny case study in the RSE book](https://rse-book.github.io/case-studies.html#web-applications-with-r-shiny).

Demo survey `ui.R`:

```r
fluidPage(
  theme = shinytheme("superhero"),
  title = "Hacking for Science - Demo Survey",
  fluidRow(
    column(
      width = 6,
      div(
        class = "jumbotron",
        h1("Hacking for Science"),
        p("Some Introductory paragraph motivating our survey.")
      )
    )
  ),
  uiOutput("basic_questions"),
  uiOutput("submit"),
  uiOutput("thanks")
)


```

## Middleware Component: server.R

The `server.R` file is a layer that takes the information from the frontend and sends it to the underlying Postgres database.

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
      host = "db_container",
      dbname = "postgres",
      password = "postgres",
      port = 5432
    )
    dbExecute(con, "SET SEARCH_PATH=rseed")
    dbAppendTable(con, dbQuoteIdentifier(con, "h4sci_demo"), response)
    dbDisconnect(con)
  }


  submitted <- reactiveVal(FALSE)

  output$basic_questions <- renderUI(
      if (!submitted()) {
        fluidRow(
          column(
            width = 6,
            div(
              class = "panel panel-primary",
              div(
                class = "panel-heading",
                h3("Basic Questions")
              ),
              div(
                class = "panel-body",
                "Please indicate your familiarity with the following demo topic.
                1 = never heard of it, 2 = trying out status, 3 = used it in courses or projects,
                4 = use this language regularly, very experienced,
                5 = expert: write my own extensions, packages, etc.",
                sliderInput("demo_slider", "Demo Slider", min = 1, max = 5, value = 3),
              )
            )
          )
        )
      }
    )

  output$free_text <- renderUI(
      if (!submitted()) {
        fluidRow(
          column(
            width = 6,
            div(
              class = "panel panel-primary",
              div(
                class = "panel-heading",
                h3("Additional Expectations")
              ),
              div(
                class = "panel-body",
                "Do you have any additional unaddressed expectations or comments you would like to submit?",
                textAreaInput(
                  "free_text",
                  "",
                  "", rows=20, cols=150
                )
              )
            )
          )
        )
      }
    )



  response <- reactive({
    dt <- data.frame(
      id = session$token,
      free_text = paste(input$free_text, collapse = ","),
      demo_slider = input$demo_slider,
      survey_year = 2025,
      stringsAsFactors = FALSE
    )
  })


  output$submit <- renderUI(
    if (!submitted()) {
      fluidRow(
        column(
          width = 6,
          div(
            class = "panel panel-primary",
            div(
              class = "panel-heading",
              h3("Submit Your Answers!")
            ),
            div(
              class = "panel-body", align = "right",
              actionButton("submit", "submit")
            )
          )
        )
      )
    }
  )


  observeEvent(input$submit, {
    store_record(response())
    submitted(TRUE)
    # has_participated(TRUE)
    # js$setcookie("HAS_PARTICIPATED_IN_SPOSM_INTRO_SURVEY")
  })

  output$thanks <- renderUI(
    if (submitted()) {
      fluidRow(
        column(
          width = 6,
          div(
            class = "panel panel-info",
            div(
              class = "panel-heading",
              h3("Thank You")
            ),
            div(
              class = "panel-body", align = "right",
              "Thank you for your participation. Please only take part once.",
              conditionalPanel(
                condition = "input.raffle == 'Yes'",
                sprintf("Here is your session token: %s. We will reveal the first 8 characters of the winner token in class. Please contact us if your token matches.", session$token)
              )
            ),

          )
        )
      )
    }
  )
})


```


## Breaking Down the Components: Postgres Database

For the backend, we need to *once* create a PostgreSQL database schema and table structure in order to store participants' answers. The table design will depend on our specific survey, but generally we want to capture things like a unique response ID, timestamp, and columns for each survey question. Obviously, we can think of more complex designs such as separate tables for different questions types etc.

But let's keep the structure simple for now:

```sql
CREATE SCHEMA rseed;

CREATE TABLE rseed.h4sci_demo(
  id text,
  free_text text,
  demo_slider int,
  survey_year int,
  PRIMARY KEY (id)
);
```

Even if you do not have a *psql* client installed locally, you can run:

```sh
docker-compose exec postgres psql -U postgres -d postgres
```

to interactively interact with the database. Copy the SQL statement above to install create a basic schema and table. Of course, we only need to do so once. After the table is created and persisted thanks to the volume mount we can start storing survey answers.


## Ready to Start 🚀

Start the entire thing!

```sh
docker-compose up -d
```

Note the *-d* which allows us to run docker-compose in the background.
Our app will be locally available in our favorite web browser at: **http://localhost:3838/**
On a 'real' remote webserver, the very same setup will work, but we will need some glue in between, so our domain is mapped to our app. But enough for one blog post – let's take a look at webservers DNS etc. another time!

Ah, and we can check out our participants answers like this:

```sh
docker-compose exec postgres psql -U postgres -d postgres
```

once the client is up, simply query our table:

```SQL
SELECT * FROM rseed.h4sci_demo ;
```

## Appendix: Our Custom DOCKERFILE

Though not the focus of this blog post, here's our custom DOCKERFILE for the sake of completeness (and reproducibilty):

```sh
FROM --platform=linux/amd64 rocker/shiny

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*


# force use of binaries
RUN echo "options(repos = c(CRAN = 'https://packagemanager.posit.co/cran/__linux__/jammy/latest'))" >> /usr/local/lib/R/etc/Rprofile.site


# Install R packages
# one at a time to see which ones act up / compile
RUN R -e "install.packages('DBI')"
RUN R -e "install.packages('RPostgres')"
RUN R -e "install.packages('shinythemes')"
RUN R -e "install.packages('shinyjs')"


# Expose Shiny port
EXPOSE 3838

# Run Shiny in app mode (or use shiny-server if you install it)
CMD ["R", "--vanilla", "-e", "shiny::runApp('/srv/shiny-server/', host='0.0.0.0', port=3838)"]


```

In principle we use an off-the-shelf shiny image from the rocker project which is not ideally for ARM computers such as M1 Macs and beyond. The rocker projects does not have ARM images, so we use AMD as platform in order to avoid compilation. From the point of view of our proof of concept this is minor technical detail, but for production use it would certainly be good to use an image that is optimized for the target architecture. Note also that we force the process to use R binaries when possible to avoid lengthy builds due to compilation. The CMD command in the final line is not really relevant as we overwrite the command in the compose file.



## Disclaimer

This blog post experimented with using AI not to generate code (which was written before LLMs when people wore pyjamas and lived live slow), but regular text. Still, you are reading a post with more than just a human note. I've used the following pattern: Define section -> add bullet items to each section -> ask AI to flesh each section out -> feedback loop -> declutter, remove content -> add code examples -> fine tune.

Hmm, I haven't made my mind up whether I saved time and/or energy until I reached a self-set finish line. Was it more fun? Hard to tell, too. I'll continue to work on different techniques and keep you h4sci blog readers posted.

[^1]: Mac OS, we could also use [orbstack](https://orbstack.dev) or [colima](https://abiosoft.github.com/colima) to run docker if we need an alternative due to licensing or other reasons.
