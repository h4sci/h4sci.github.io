---
title: "Tuning Our Lab Setup for Production"
author: "Minna Heim & Matthias Bannert"
toc: false
draft: false
snippet: "We revisit our Shiny + Postgres survey example from the previous post and show how to keep the exact same functionality while cutting image size in half, and reducing the dependencies. By switching to a lighter Alpine-based R image and making dependencies explicit, we turn a teaching prototype into a leaner, more portable production setup that is also suitable for CI/CD."
cover: ./shiny-survey-lighter.png
coverAlt: "R Shiny Frontend of an online survey"
publishDate: "2025-11-26"
category: "SELF-HOSTED, DevOps, Tutorial"
tags: [Survey, R, Shiny, Postgres, Docker, docker-compose, Alpine]
---

<!-- 2 more introductory sätze -->
Based on the example from the [previous blogpost](https://h4sci.github.io/blog/self-hosted-shiny-pg), while the postgres image that we use is lean and well suited for our production purposes, the `rocker/shiny` image is quite general and bulky. Hence, we would like to build a custom shiny image instead in this post..


## Breaking down our custom Alpine-Based Image


```dockerfile
# Base image
FROM devxygmbh/r-alpine:4-3.21

# Install system dependencies (Alpine package manager)
RUN apk update && apk add --no-cache \
    libpq \
    libxml2 \
    libcurl \
    libgit2 \
    postgresql-client \
    postgresql-libs \
    build-base \
    postgresql-dev \
    libxml2-dev \
    libcurl-dev \
    libgit2-dev

# Install R packages
RUN R -q -e 'install.packages(c("shiny", "RPostgres", "shinythemes", "shinyjs", "DBI"), repos="https://cloud.r-project.org")'

EXPOSE 3838

# not actually used, overwritten by `docker-compose.yml`, here just in case the container is used alone, without docker-compose.
CMD ["R", "-e", "shiny::runApp('/srv/shiny-server/survey', host='0.0.0.0', port=3838)"]
```


### Key differences:

**Base image**: `devxygmbh/r-alpine:4-3.21` instead of `rocker/shiny`. First of all, alpine is much lighter base than debian or ubuntu. That is, the image size is much smaller and fewer dependencies make maintenance easier, for example monitoring critical vulnerabilities (CVEs). Keep in mind that docker images get pulled often, and a few hundred MB in image size can reduce traffic and build time substantially. 

**Explicit system libraries**: because fewer sys-libs are pre-installed we need to add postgres drivers, curl and a few other libraries.

**ARM vs AMD architecture**: DevXY Gmbh provides ARM images to run on modern ARM chipset architecture such as Apple chips from the M1 on, or modern electricity saving servers. Some libraries/binaries are not available for ARM, hence very general prebuilt images from dockerhub (such as `rocker/shiny`) use AMD. For an extended discussion, see below.


## Why Care About Image Size?

When you're just getting started, using a convenient base image such as
`rocker/shiny` is a great choice. It gives you:

- **R + Shiny pre-installed**
- **System libraries** for many common packages
- A quick path to “it just works”

However, one trade-off is size. On a laptop with limited disk space, a CI system that
pulls images frequently, or a small cloud VM, image size starts to matter:

- **Slower pulls and pushes**
- **Longer cold starts** when new machines spin up
- **Less space** for other projects and datasets

To showcase this better, here are the sizes for the base images we compare:

**Base images:**
- `devxygmbh/r-alpine:4-3.21`: **138.3 MB**
- `rocker/shiny`: **544.9 MB**

**After installing all dependencies and R packages:**
- **Base example (rocker/shiny)**: **1.68 GB**
- **Lightweight example (Alpine-based shiny image)**: **789 MB**

That's not just a nice chart for presentations — it’s a practical improvement when
you rebuild frequently or run on constrained hardware.

Using a lighter base image such as `r-alpine` also means:

- **Adding only the dependencies you need**
- **Better isolation and maintainability**
- **Smaller attack surface**

**Exercise:** Check [Docker Hub](https://hub.docker.com/) for these base images to compare contents, and you will see the reason for the size differences.


## How to Measure Image Size Yourself

You can reproduce these numbers on your machine with standard Docker commands.
After building an image, just run:

```bash
docker images 
```
 
Docker will show you the image in a table, including a **SIZE** column.


## Why Architecture Matters

Docker images must either:

- be built **for the architecture you're running**, or

- be built as **multi-arch** images.

If an image isn't available for your machine, Docker Desktop will fall back to CPU
emulation using qemu, which works but is slower.

### Rocker vs Alpine: Platform Support

`rocker/shiny`:

- Official build targets amd64

- No native arm64 builds

- On Apple Silicon → runs via emulation → slower builds and slower runtime (this is what the previous blogpost did with the `--platform=linux/amd64 rocker/shiny` flag)

- Larger, heavier images

Alpine-based R images (`devxygmbh/r-alpine`):

- Typically provide amd64 + arm64 images

- Faster native performance on Apple Silicon and arm clouds servers (often cheaper)

- Smaller and easier to rebuild locally


## APPENDIX: running the fine tuned app
 
Use the following `docker-compose.yaml` file with the `DOCKERFILE` from above:

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
         - "./shiny-data:/srv/shiny-server/survey"
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


With the assumption that you have followed the instructions of the previous blog post & have gotten it to run, all you have to do is:

1. Start the full stack:

   ```bash
   docker-compose up -d
   ```

2. Once the containers are up, visit:

   - Shiny app: `http://localhost:3838`


From here on your survey behaves exactly as in the original tutorial, only the
containers are **smaller and more explicit** in their dependencies.



If you want to see this **Example in action**, visit the [github.com/h4sci/h4sci-poll](https://github.com/h4sci/h4sci-poll) directory!