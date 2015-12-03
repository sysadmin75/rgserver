#!/usr/bin/env python
import os
import sys
import traceback
import time
###
import dbcon
import matchstate as ms
import proxy
import sandbox
import shorten
import rgkit.game
import tools

S_MATCH_REST = 4.0

TIME_RATE = 0.1
WIN_RATE = 0.05
SYMMETRIC = True


def get_cpu_time(pid):
    clk_tck = float(os.sysconf(os.sysconf_names['SC_CLK_TCK']))
    with open("/proc/%d/stat" % (pid,)) as fpath:
        vals = fpath.read().split(' ')
        time = sum(
            int(f) / clk_tck for f in vals[13:15])
        return time


def calc_score(scores):
    if scores[0] == scores[1]:
        return 0.5
    return 1 if scores[0] > scores[1] else 0


def update_ratings(db, match, game_result):
    MINUTE = 60
    HOUR = 60 * MINUTE
    DAY = 24 * HOUR
    # WEEK = 7 * DAY
    # MONTH = 30 * DAY

    def get_k_factor(r1_rating, r2_rating, r1_update, r2_update):
        k_factor = min(tools.get_k_factor(r1_rating),
                       tools.get_k_factor(r2_rating))
        # Increase k_factor for recently updated bots.
        if (time.time() - r1_update < DAY or
                time.time() - r2_update < DAY):
            k_factor = int(k_factor * 2)
        elif (time.time() - r1_update < 3 * DAY or
                time.time() - r2_update < 3 * DAY):
            k_factor = int(k_factor * 1.5)
        return k_factor

    def new_rating(r1, r2, result, k_factor):
        expected = 1.0 / (1 + pow(10.0, (r2 - r1) / 400.0))
        return r1 + k_factor * (result - expected)

    def get_rating_and_update_time(rid):
        result = db.select(
            'robots',
            what='rating, last_updated',
            where='id=$id',
            vars={
                'id': rid})
        if not result:
            return None, None
        robot = result[0]
        rating = robot['rating']
        last_updated = robot['last_updated']
        if rating is None:
            return tools.DEFAULT_RATING, last_updated
        return rating, last_updated

    def get_ranking(rating):
        query = '''
            select count(*) as ranking
            from robots r
            where compiled and passed and not disabled and
                  r.rating > $rating + 1e-5
        '''
        robot = db.query(query, vars={'rating': rating})
        return robot[0]['ranking']

    rating1, updated1 = get_rating_and_update_time(match['r1_id'])
    rating2, updated2 = get_rating_and_update_time(match['r2_id'])

    k_factor = get_k_factor(rating1, rating2, updated1, updated2)

    new_rating1 = new_rating(rating1, rating2, game_result, k_factor)
    new_rating2 = new_rating(rating2, rating1, 1 - game_result, k_factor)

    # ratings might have changed since the match was created
    ranking1 = get_ranking(rating1)
    ranking2 = get_ranking(rating2)
    db.update('matches', where='id=$id', vars={'id': match['id']},
              r1_rating=rating1, r2_rating=rating2,
              r1_ranking=ranking1, r2_ranking=ranking2,
              k_factor=k_factor)
    db.update('robots', where='id=$id', vars={'id': match['r1_id']},
              rating=new_rating1, last_opponent=match['r2_id'],
              last_match=int(time.time()))
    db.update('robots', where='id=$id', vars={'id': match['r2_id']},
              rating=new_rating2, last_opponent=match['r1_id'],
              last_match=int(time.time()))


def update_stats(db, match, r1_time, r2_time, score):
    if r1_time is not None:
        db.query('UPDATE robots SET time=time*(1-$r) + $t*$r WHERE id=$id',
                 vars={'id': match['r1_id'], 'r': TIME_RATE, 't': r1_time})
    if r2_time is not None:
        db.query('UPDATE robots SET time=time*(1-$r) + $t*$r WHERE id=$id',
                 vars={'id': match['r2_id'], 'r': TIME_RATE, 't': r2_time})
    db.query('UPDATE robots SET winrate=winrate*(1-$r) + $t*$r WHERE id=$id',
             vars={'id': match['r1_id'], 'r': WIN_RATE, 't': score})
    db.query('UPDATE robots SET winrate=winrate*(1-$r) + $t*$r WHERE id=$id',
             vars={'id': match['r2_id'], 'r': WIN_RATE, 't': 1 - score})


def run_game(db, match, output_file):
    proxy_process1, proxy_process2 = None, None
    try:
        # TODO: Fix load_map, seriously.
        sandbox.load_map()

        output_file.write('---Starting Robot 1---\n')
        proxy_process1, p1 = proxy.make_player(match['r1_code'], output_file)
        if p1 is None:
            db.update('robots', passed=False,
                      where='id=$id', vars={'id': match['r1_id']})
            raise Exception('Robot 1 not able to be instantiated.')

        output_file.write('---Starting Robot 2---\n')
        proxy_process2, p2 = proxy.make_player(match['r2_code'], output_file)
        if p2 is None:
            db.update('robots', passed=False,
                      where='id=$id', vars={'id': match['r2_id']})
            raise Exception('Robot 2 not able to be instantiated.')

        g = rgkit.game.Game([p1,
                             p2],
                            record_actions=False,
                            record_history=True,
                            print_info=True,
                            seed=match['seed'],
                            symmetric=SYMMETRIC)
        g.run_all_turns()

        game_scores = g.get_scores()
        r1_score, r2_score = game_scores
        score = calc_score(game_scores)
        history = g.history
        match_data = shorten.dumps({'history': history, 'score': game_scores})
        winner = {1: match['r1_id'], 0: match['r2_id'], 0.5: 0}[score]

        output_file.write('---Time Taken---\n')
        r1_time = None
        r2_time = None
        try:
            r1_time = get_cpu_time(proxy_process1.pid)
            r2_time = get_cpu_time(proxy_process2.pid)
            output_file.write('R1: {0}\nR2: {1}\n'.format(r1_time, r2_time))
        except Exception:
            traceback.print_exc(file=output_file)

        # turn off printing here because the output for data is huge
        old_print = db.printing
        db.printing = False
        db.insert(
            'history',
            match_id=match['id'], data=match_data, timestamp=int(time.time()))
        db.update(
            'matches',
            where='id=$id', vars={'id': match['id']},
            winner=winner, state=ms.DONE,
            r1_score=r1_score, r2_score=r2_score,
            r1_time=r1_time, r2_time=r2_time,
            timestamp=int(time.time()))
        db.printing = old_print

        if not proxy_process1.alive():
            db.update('robots', passed=False,
                      where='id=$id', vars={'id': match['r1_id']})
            output_file.write('Robot 1 died, marking as invalid bot.\n')
        if not proxy_process2.alive():
            db.update('robots', passed=False,
                      where='id=$id', vars={'id': match['r2_id']})
            output_file.write('Robot 2 died, marking as invalid bot.\n')

        return score, r1_time, r2_time
    finally:
        if proxy_process1 is not None:
            proxy_process1.cleanup()
        if proxy_process2 is not None:
            proxy_process2.cleanup()


def run_match(db, match):
    sys.stdout.flush()
    sys.stderr.flush()
    with open('/matchlog/%d' % match['id'], 'w+') as f:
        try:
            sys.stdout = sys.stderr = f
            db.update('matches', where='id=$id', vars={'id': match['id']},
                      state=ms.RUNNING)
            score, r1_time, r2_time = run_game(db, match, f)
            if match['ranked']:
                update_ratings(db, match, score)
                update_stats(db, match, r1_time, r2_time, score)
        except Exception:
            traceback.print_exc(file=f)
            db.update('matches', where='id=$id', state=ms.ERROR,
                      vars={'id': match['id']})
    sys.stdout = sys.__stdout__
    sys.stderr = sys.__stderr__
    time.sleep(S_MATCH_REST)


def get_match(db, mid):
    query = '''
        select
            matches.*,
            r1.compiled_code as r1_code, r2.compiled_code as r2_code,
            r1.rating as r1_rating, r2.rating as r2_rating,
            r1.name as r1_name, r2.name as r2_name
        from matches
            join robots r1 on r1.id = matches.r1_id
            join robots r2 on r2.id = matches.r2_id
        where matches.id = $id'''

    match = db.query(query, vars={'id': mid})
    return match[0] if match else None


if __name__ == '__main__':
    db = dbcon.connect_db()
    if len(sys.argv) > 1:
        match = get_match(db, int(sys.argv[1]))
        run_game(db, match, sys.stdout)
