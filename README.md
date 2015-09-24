[Robot Game](http://robotgame.net) server code [![Build Status](https://travis-ci.org/RobotGame/rgserver.svg?branch=master)](https://travis-ci.org/RobotGame/rgserver)
===================================

[![Join the chat at https://gitter.im/RobotGame/rgserver](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/RobotGame/rgserver?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## Setup

Install [Docker](https://docs.docker.com/installation/#installation)
and [Compose](https://docs.docker.com/compose/install/).

## Initialization

1. Fork and `git clone`.
2. Run `docker-compose up` (may require `sudo`).

The website is now live at [localhost:8000](http://localhost:8000). The
matchmaker starts automatically.

## Development

> Coming soon!

## Upgrade

1. [Sync](https://help.github.com/articles/syncing-a-fork/) with upstream.
2. Run `docker-compose stop`.
3. Run `docker-compose build`.
4. Run `docker-compose up`.
