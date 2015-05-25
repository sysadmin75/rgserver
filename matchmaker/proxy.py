import multiprocessing as mp
import multiprocessing.queues as mpq
import os
import sys
import traceback

import cpu
import sandbox

import rgkit.game
from rgkit.settings import settings
import rgkit.rg

# load modules for the user to use
sys.modules['rg'] = sys.modules['rgkit.rg']
sys.modules['settings'] = sys.modules['rgkit.settings']

MAX_MS_PER_FIRST_ACT = 1500
MAX_MS_PER_ACT = 1000
MAX_MS_PER_CALL = 2000


class TimeoutError(Exception): pass
class TimeoutCannotRecoverError(Exception): pass


class ProxyProcess(object):
    def __init__(self, user_code):
        self._queue_data = mp.Queue()
        self._queue_action = cpu.CPUTimeoutQueue()
        self._queue_output = mp.Queue()

        self.process = mp.Process(target=sandbox.proxy_process_routine,
            args=(user_code, self._queue_data, self._queue_action, self._queue_output))
        self.process.daemon = True
        self.process.start()
        self._queue_action.set_pid(self.process.pid)
        self.pid = self.process.pid
        print(self.pid)
        self._ignore = 0

    def get_response(self, data, ms_timelimit=MAX_MS_PER_ACT):
        s_timelimit = ms_timelimit * 0.001
        data['timelimit'] = s_timelimit
        self._queue_data.put(data)
        try:
            # 10% room for error
            for i in range(self._ignore):
                self._queue_action.get(timeout=s_timelimit * 1.1)
                self._ignore -= 1
            return self._queue_action.get(timeout=s_timelimit * 1.1)
        except mpq.Empty:
            self._ignore += 1
            if self._ignore == 1:
                raise TimeoutError()
            raise TimeoutCannotRecoverError()

    def get_output(self):
        def get_next_output():
            try:
                return 'P| ' + self._queue_output.get_nowait()
            except mpq.Empty:
                return None
        return ''.join(iter(get_next_output, None))

    def alive(self):
        return self.process.is_alive()

    def cleanup(self):
        self._queue_data.close()
        self._queue_action.close()
        self._queue_output.close()

        self._queue_data.cancel_join_thread()
        self._queue_action.cancel_join_thread()
        self._queue_output.cancel_join_thread()

        self.process.terminate()


class ProxyBot(object):
    def __init__(self, process, output_file):
        self._process = process
        self._output_file = output_file
        self.skip = False
        self.errors = 0
        self.turn = None

    def act(self, game):
        global settings

        if self.skip:
            return ['suicide']

        data = {'game': game, 'properties': dict()}
        props = settings.exposed_properties + settings.player_only_properties
        for prop in props:
            data['properties'][prop] = getattr(self, prop)

        timelimit = MAX_MS_PER_ACT
        if self.turn != game.turn:
            self.turn = game.turn
            # Players who calculate all in first act per turn
            timelimit = MAX_MS_PER_FIRST_ACT

        error = False
        try:
            response = self._process.get_response(data, ms_timelimit=timelimit)
            if response['result'] == 'ok':
                return response['ret']
            else:
                error = True
            raise response['error']
        except (TimeoutError, TimeoutCannotRecoverError) as e:
            error = True
            raise e
        finally:
            if error:
                self._output_file.write(
                    'Error for bot {0}\n'.format(int(self.player_id) + 1))
                self.errors += 1
                if self.errors > 2:
                    self._output_file.write(
                        '\n\n3 or more errors, forfeiting bot ' +
                        '{0}.\n\n'.format(int(self.player_id) + 1))
                    self.skip = True
            self._output_file.write(self._process.get_output())


def make_player(user_code, output_file):
    global settings

    robot = None
    proxy_proc = None
    try:
        proxy_proc = ProxyProcess(user_code)
        result = proxy_proc.get_response({'query': 'Robot'}, MAX_MS_PER_CALL)
        if result['result'] == 'ok':
            robot = ProxyBot(proxy_proc, output_file)
        else:
            output_file.write(str(result))
    except Exception as e:
        if proxy_proc is not None:
            output_file.write(proxy_proc.get_output())
        traceback.print_exc(file=output_file)

    if proxy_proc is not None:
        output_file.write(proxy_proc.get_output())
    if robot is None:
        return None, None
    return proxy_proc, rgkit.game.Player(robot=robot)
