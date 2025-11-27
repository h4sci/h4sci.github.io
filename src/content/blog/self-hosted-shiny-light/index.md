---
title: "Making the R Shiny Survey more Lightweight"
author: "Minna Heim & Matthias Bannert"
toc: false
draft: false
snippet: "We revisit our Shiny + Postgres survey from a previous post and show how to keep the exact same functionality while cutting image size in half. By switching to a lighter Alpine-based R image, making dependencies explicit and tidying the project layout, we turn a teaching prototype into a leaner, more portable setup that is friendlier to laptops, CI systems and small servers."
cover: ./shiny-survey.png
coverAlt: "R Shiny Frontend of an online survey"
publishDate: "2025-11-26"
category: "SELF-HOSTED, DevOps, Tutorial"
tags: [Survey, R, Shiny, Postgres, Docker, docker-compose, Alpine]
---

Important Notice: This post builds directly on our earlier tutorial [From Lab to Production: an R Shiny Survey with a Database Backend](https://h4sci.github.io/blog/self-hosted-shiny-pg/). Here, we keep the same functionality but **shrink the container footprint**, by using a lighter base image, which reduces our storage.

## Why Care About Image Size?

When you are just getting started, using a convenient base image like
`rocker/shiny` is a great choice. It gives you:

- **R + Shiny pre-installed**
- **System libraries** that cover many common use cases
- A quick way to get to “it runs!”

The trade-off is size. On a laptop with limited disk, a CI system pulling
images frequently, or a small cloud VM, image size starts to matter:

- **Slower pulls and pushes** across the network
- **Longer cold starts** when a new machine spins up
- **Less room** for other projects or datasets

To make this more concrete, here are the image sizes I observed on my machine:

**Base images:**

- `devxygmbh/r-alpine:4-3.21`: 138.3 MB  
- `rocker/shiny`: 544.9 MB

Once we add all required system dependencies and R packages, the final images
for the survey app look roughly like this:

- **Base example (heavier)**: 1.68 GB  
- **Lightweight example (Alpine-based)**: 789 MB

That’s not only a nice number to show in slides — it’s a practical improvement
when you rebuild images often or run on constrained hardware.

Amongst the benefits of using a lighter image such as `r-alpine` instead of the standard `rocker/shiny` being size related, switching to this lighter image provides the following improvements:

- less dependencies to manage
- isolation - know what you really need to build 
- easier to maintain due to lack of dependencies

Take Home Exercise: check out on the docker image library [dockerhub](https://hub.docker.com/) what each of these above mentioned images really consists of. then you can get more insight why the difference in base image size is so high.

## How to Measure Image Size Yourself

You can reproduce these numbers on your machine with standard Docker commands.
After building an image:

```bash
docker build -t myimage .
docker images myimage
```

Docker will show you the image in a table, including a **SIZE** column.
This is the quickest way to compare different Dockerfile variants.

If you want more detail, you can inspect the image:

```bash
docker image inspect myimage --format='{{.Size}}'
docker history myimage
```

The `docker history` view helps you see **which Dockerfile layers** contribute
most to the final size.


## Recap: The Original Survey Setup

In the [original post](https://h4sci.github.io/blog/self-hosted-shiny-pg/)
we built a small online survey:

- **Shiny frontend**: one-page survey UI written in R (`ui.R`, `server.R`)
- **Postgres backend**: a database that stores responses in a table
- **Docker + docker-compose**: one service for Shiny, one for Postgres,
  tied together via a shared Docker network and named containers

The Shiny container used `rocker/shiny` as its base image and mounted the app
code via a volume. This works well as a teaching example. In this follow-up we keep the same Shiny
app and database schema, but now, we will:

- switch to a **lighter base image**, and  
- **tidy up the app layout** to be more explicit and portable.

## A Lighter Base Image with Alpine

Instead of starting from `rocker/shiny`, we now use
`devxygmbh/r-alpine:4-3.21` as the base for the Shiny container.
This image ships R but not Shiny or Postgres-related system libraries, so we
install exactly what we need.

Here is the updated `DOCKERFILE`:

```Dockerfile

# before: FROM --platform=linux/amd64 rocker/shiny
FROM devxygmbh/r-alpine:4-3.21

# before: 
# RUN apt-get update && apt-get install -y \
#     libpq-dev \
#     && rm -rf /var/lib/apt/lists/*


# Install system dependencies
RUN apk add --no-cache \
      postgresql-client \
      postgresql-libs \
      postgresql-dev \
      g++ \
      make \
      libc6-compat \
      curl \
      # chat want's me to install these in case system libs are lacking to build shiny
      openssl-dev \
      zlib-dev \
      libuv-dev \


# Install R packages
# one at a time to see which ones act up / compile
RUN R -e "install.packages('DBI')"
RUN R -e "install.packages('RPostgres')"
RUN R -e "install.packages('shinythemes')"
RUN R -e "install.packages('shinyjs')"

WORKDIR /app
COPY app ./app

# Expose Shiny port
EXPOSE 3838

# Run Shiny in app mode (or use shiny-server if you install it)
CMD ["R", "--vanilla", "-e", "shiny::runApp('/srv/app/', host='0.0.0.0', port=3838)"]
```

Main differences compared to the original setup:

- **Different base image**: `devxygmbh/r-alpine:4-3.21` instead of `rocker/shiny`
- **More system libraries**: since the r-alpine image is lighter, we need more installations to use postgres and shiny
- The Shiny app is placed in a dedicated `/app` directory inside the image, more about the new project structure later.

## Updating `docker-compose.yaml` for the Lightweight Image

With the new Dockerfile, the compose file becomes slightly simpler. We now
build directly from the project root and mount the Shiny app from a dedicated
`app/` directory:

```yaml
services:
   shiny:
      build:
         context: .
         dockerfile: DOCKERFILE
      container_name: fe_shiny
      restart: always
      ports:
         - "3838:3838"
      volumes:
         - "./app:/srv/app"
      command: ["R", "--vanilla", "-e", "shiny::runApp('/srv/app', host='0.0.0.0', port=3838)"]

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

The Shiny container still talks to Postgres via the hostname
`db_container` (the service name), and Postgres still persists data in
`./pgdata` on the host.


## A Simpler Project Layout

To go along with the lighter image, we also slightly reorganise the project.
The new directory structure looks like this:

```text
.
├── app/
│   ├── ui.R
│   └── server.R
├── DOCKERFILE
├── docker-compose.yaml
├── blog.md
├── .gitignore    # ignores /pgdata
└── pgdata/       # postgres data volume (persistent data)
```

Compared to the original `shiny_data/survey` setup, this:

- makes the **app location explicit** (`/app` in the image, `./app` on host)
- keeps database data (`pgdata/`) clearly separated
- plays nicely with `.gitignore` — you typically commit `app/`, `blog.md`,
  `DOCKERFILE`, `docker-compose.yaml`, but not `pgdata/`

The Shiny app code itself (`ui.R` and `server.R`) remains exactly the same as
in the original post.


## Running the Lightweight Version

With the assumption, that you have followed the instructions of the previous blog post & have gotten it to run, all you have to do is:

1. Start the full stack:

   ```bash
   docker-compose up -d
   ```

2. Once the containers are up, visit:

   - Shiny app: `http://localhost:3838`


From here on your survey behaves exactly as in the original tutorial, only the
containers are **smaller and more explicit** in their dependencies.


## Platform Discussion

Discussion about using different platform builds, i.e. for mac: amd64 vs arm64. benefits and drawbacks of using each. here we use ?


If you want to see this Example in action, visit the [github.com/h4sci/h4sci-poll](https://github.com/h4sci/h4sci-poll) directory!