import web

params = {
    'host': 'db',
    'dbn': 'postgres',
    'db': 'robotgame',
    'user': 'robot',
    'pw': 'allthebots',
}

connection = None
def connect_db():
    global params
    global connection
    if connection is None:
        connection = web.database(**params)
    connection.printing = False  # False by default
    return connection
