[Robot Game](http://robotgame.net) server code
===================================

## Setup

Install [Docker](https://docs.docker.com/installation/#installation)
and [Compose](https://docs.docker.com/compose/install/).

## Initialization

1. Fork and `git clone`
2. Run `docker-compose up` (may need `sudo`)

The website is now live at [localhost:8000](http://localhost:8000). The matchmaker
has started automatically.

## Development

> Coming soon!

## Upgrade

1. [Sync](https://help.github.com/articles/syncing-a-fork/)
2. `docker-compose stop`
3. `docker-compose rm -v` (this will remove all data)
4. `docker-compose up`
