import ast
import imp
import limitexec as le
import os
import pkg_resources
import pwd
import random
import resource
import sys
import time
import traceback

from rgkit.settings import settings


def load_map():
    map_filename = pkg_resources.resource_filename(
        'rgkit', 'maps/default.py')
    map_data = ast.literal_eval(open(map_filename).read())
    settings.init_map(map_data)


def proxy_process_routine(user_code, queue_in, queue_out, queue_output):
    start_time = time.time()
    pid = os.getpid()
    queue_output.put('Starting {} at {}.\n'.format(pid, start_time))

    class Logger:

        def write(self, data):
            queue_output.put(data)

        def flush(self):
            pass

    # Cannot use sys as drop_privileges will disable it
    out = sys.stdout = sys.stderr = Logger()
    trace_func = traceback.print_exc
    exit_func = os._exit
    try:
        def limit_resources():
            MEM_LIMIT = (2 ** 20) * 1024  # MB
            for rsrc in ('DATA', 'RSS', 'AS'):
                resource.setrlimit(
                    getattr(
                        resource,
                        'RLIMIT_' + rsrc),
                    (MEM_LIMIT,
                     MEM_LIMIT))
            resource.setrlimit(resource.RLIMIT_NPROC, (10, 10))

        def disable_modules(*blacklist):
            '''Always disable sys.'''

            def disable_mod(mod):
                sys.modules[mod] = None
                globals()[mod] = None
                pass

            for mod_name in blacklist:
                disable_mod(mod_name)
            disable_mod('sys')

        # counting on iptables to restrict network access for `nobody`
        def drop_privileges(uid_name='nobody'):
            uid = pwd.getpwnam(uid_name).pw_uid
            # limit_resources()

            os.chroot('jail')
            os.chdir('jail')
            os.setgroups([])
            os.umask(0)
            os.setuid(uid)
            os.nice(5)  # Lower priority

            disable_modules(
                'ctypes',
                'imp',
                'inspect',
                'multiprocessing',
                'os',
                'pdb',
                'posix',
                'dbcon')

            # No sleeping!
            time.sleep = lambda s: 0

        def make_user_robot(code, mod):
            try:
                exec code in mod.__dict__
            except:
                trace_func(file=out)
            finally:
                cmp_time = time.time()
                out.write(
                    'Compilation: {0:.4g}s\n'.format(cmp_time - start_time))
                if 'Robot' in mod.__dict__:
                    bot = mod.__dict__['Robot']()
                    ini_time = time.time()
                    out.write(
                        'Initialization: {0:.4g}s\n'.format(
                            ini_time - cmp_time))
                    return bot
                return None

        for data in iter(queue_in.get, None):
            if 'query' in data:
                load_map()
                mod = imp.new_module('usercode')
                drop_privileges()
                robot = make_user_robot(user_code, mod)
                queue_out.put({'result': 'ok'})
            else:
                robot.__dict__.update(data['properties'])
                random.seed(data['game'].seed)
                with le.time_limit(data['timelimit']):
                    action = robot.act(data['game'])
                queue_out.put({'result': 'ok', 'ret': action})
    except:
        trace_func(file=out)
        exit_func(0)
