[Robot Game](http://robotgame.net) server code
===================================

Please use github issues for server code/infrastructure related tasks/bugs/feature requests.

## Dev environment setup using Vagrant

First, download and install [Vagrant](https://www.vagrantup.com/downloads.html) and [VirtualBox](https://www.virtualbox.org/wiki/Downloads) for your operating system. For Linux and OSX, run `vagrant up` in the project directory. The Windows instructions should be similar. This should take 5-10 minutes (depending on your connection) and will set up your dev environment automatically.

When the above finishes, you should be able to view your local robotgame server at `localhost:8080` using your favorite browser.

Run `vagrant ssh` to SSH into the VirtualBox VM running your server. Make some changes and run `rg restart` to see those changes.

For more on using Vagrant, see the [Vagrant documentation](https://docs.vagrantup.com/v2/).

## Workflow:

1.  Fork and checkout project
2.  Create a virtualenv and install requirements with "pip install -r requirements.txt".
3.  Copy all the X.example files and remove the ".example" suffix, edit them according to your local environment. (If someone wants to explain in more detail what's involved here, please do so!)
4.  Code to your satisfaction.
5.  Make a pull request and wait for a committer to review and merge your code. Ping on IRC if it's taking more than a couple days to get a response. :)

## Postgres setup

(Presumes a brand new, fresh Ubuntu 14.04 install)

1. `sudo apt-get update`
1. `sudo apt-get install postgresql-9.3 postgresql-client-9.3`
1. `sudo -u postgres createuser --interactive`
    1. role to add: robot
    1. superuser: n
    1. create databases: y
    1. create roles: n
1. Enter PROJECT_PATH/config
1. `postgres -U robot -h localhost < db_schema.sql`

## rgsandbox setup

To clone [rgsandbox](https://github.com/RobotGame/rgsandbox), run `git submodule update --recursive`. 

## Notes

Thank you.

Yes, in the interest of getting this code out there, I'll leave README just as is. Feel free to elaborate and make this better and easier for a new dev.

