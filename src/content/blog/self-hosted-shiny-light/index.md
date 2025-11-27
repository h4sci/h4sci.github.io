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

# Lighter Docker Images for RShiny

In our previous post, we built a simple RShiny application connected to a Postgres
database inside a Docker container. It worked well — but the base image we used,
`rocker/shiny`, is quite heavy.

> Today we’ll take the same app and build **a much slimmer version** using an
> Alpine-based R image instead of `rocker/shiny`.

Alpine containers are lightweight and intentionally minimalist, so we must install more
dependencies ourselves. But the result is a significantly **smaller**, **clearer**, and
**more maintainable** image.

Let’s look at the differences.

---

## Why Care About Image Size?

When you're just getting started, using a convenient base image such as
`rocker/shiny` is a great choice. It gives you:

- **R + Shiny pre-installed**
- **System libraries** for many common packages
- A quick path to “it just works”

However, the trade-off is size. On a laptop with limited disk space, a CI system that
pulls images frequently, or a small cloud VM, image size starts to matter:

- **Slower pulls and pushes**
- **Longer cold starts** when new machines spin up
- **Less space** for other projects and datasets

Here are the image sizes on my machine:

**Base images:**
- `devxygmbh/r-alpine:4-3.21`: **138.3 MB**
- `rocker/shiny`: **544.9 MB**

**After installing all dependencies and R packages:**
- **Base example (rocker/shiny)**: **1.68 GB**
- **Lightweight example (Alpine-based)**: **789 MB**

That's not just a nice chart for presentations — it’s a practical improvement when
you rebuild frequently or run on constrained hardware.

Using a lighter base image such as `r-alpine` also means:

- **Only the dependencies you need**
- **Better isolation and maintainability**
- **Smaller attack surface**

> **Exercise:** Check [Docker Hub](https://hub.docker.com/) for these images to compare contents, and you will see the reason for the size differences.


## How to Measure Image Size Yourself

You can reproduce these numbers on your machine with standard Docker commands.
After building an image:

```bash
docker build -t myimage .
docker images myimage
```
 
Docker will show you the image in a table, including a **SIZE** column.

---

## The New Dockerfile (Alpine-Based)

Below is the new Dockerfile using the Alpine R base image:

```dockerfile
# Base image
FROM devxygmbh/r-alpine:4-3.21

# Install system dependencies (Alpine package manager)
RUN apk update && apk add --no-cache \
    libpq \
    libxml2 \
    libcurl \
    libgit2 \
    postgresql-libs \
    && apk add --no-cache --virtual .build-deps \
    build-base \
    postgresql-dev \
    libxml2-dev \
    libcurl-dev \
    libgit2-dev

# Install R packages
RUN R -q -e 'install.packages(c("shiny", "RPostgres", "shinythemes", "shinyjs", "DBI"), repos="https://cloud.r-project.org")'

# Configure app
WORKDIR /app
COPY ./app /app

EXPOSE 3838

CMD ["R", "-e", "shiny::runApp('/srv/app', host='0.0.0.0', port=3838)"]
```


Key differences:

- **Base image**: `devxygmbh/r-alpine:4-3.21` instead of `rocker/shiny`
- **Explicit system libraries**: since the Alpine image is lighter, we need more installations to use postgres and shiny
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

Modern development spans multiple CPU architectures. The two common ones are:

- **amd64 (Intel/AMD)** — servers, Linux machines, older Macs -> which tends to be heavier, thus slower

- **arm64 (Apple Silicon)** — modern Macs (M1–M4), many cloud platforms -> is fast, builds efficiently

### Why Architecture Matters

Docker images must either:

- be built **for the architecture you're running**, or

- be built as **multi-arch** images.

If an image isn't available for your machine, Docker Desktop will fall back to CPU
emulation using qemu, which works but is slower.

### Rocker vs Alpine: Platform Support

`rocker/shiny`:

- Official build targets amd64

- No native arm64 builds

- On Apple Silicon → runs via emulation → slower builds and slower runtime

- Larger, heavier images

Alpine-based R images (`devxygmbh/r-alpine`):

- Typically provide amd64 + arm64 images

- Faster native performance on Apple Silicon

- Smaller and easier to rebuild locally

One of the hidden advantages of going lightweight is that you automatically gain
better architecture compatibility.


If you want to see this Example in action, visit the [github.com/h4sci/h4sci-poll](https://github.com/h4sci/h4sci-poll) directory!