import multiprocessing.queues as mpq
import os
import time


class CPUTimeoutQueue(mpq.Queue):
    """
    A version of multiprocessing.Queue which uses CPU time of a specified
    process instead of real time to limit the get() time. This only works on
    systems which support /proc/$pid/stat and only for local processes which
    don't fork and CPUs which keep their speed at the same level.
    """
    MAX_RETRY = 3
    MIN_ERROR = 0.1
    ERROR_PERCENT = 1.1

    def __init__(self, *args, **kwargs):
        self.clk_tck = float(os.sysconf(os.sysconf_names['SC_CLK_TCK']))
        super(CPUTimeoutQueue, self).__init__(*args, **kwargs)

    def set_pid(self, pid):
        self.pid = pid

    def _get_raw_cpu_time(self):
        with open("/proc/%d/stat" % (self.pid,)) as fpath:
            vals = fpath.read().split(' ')
            time = sum(
                int(f) / self.clk_tck for f in vals[13:15])
            return time

    def get(self, block=True, timeout=None):
        assert block and timeout is not None, (
            '%s.get() may only be used with block=True and a timeout!'.format(
                self.__class__.__name__))
        assert self.pid is not None, (
            'you must call q.set_pid(pid) before calling get()!')
        current_timeout = timeout
        pre_used_time = self._get_raw_cpu_time()
        pre_real_time = time.time()
        attempt_limit = 0
        while current_timeout > 0 and attempt_limit < self.MAX_RETRY:
            try:
                # Add a buffer both absolute and percentage wide to reduce the
                # number of necessary repetition
                return super(CPUTimeoutQueue, self).get(
                    block,
                    current_timeout * self.ERROR_PERCENT + self.MIN_ERROR)
            except mpq.Empty:
                post_used_time = self._get_raw_cpu_time()
                current_timeout = timeout - post_used_time + pre_used_time
                if current_timeout < 0:
                    attempt_limit = self.MAX_RETRY
                print('#timeout was supposed to be', timeout,
                      ', but CPU time was', post_used_time - pre_used_time,
                      'while the real time was', time.time() - pre_real_time)
                attempt_limit += 1
        raise mpq.Empty()
