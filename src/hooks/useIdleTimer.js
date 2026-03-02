import { useEffect, useRef, useState } from 'react';

// Lightweight cross-tab idle timer using BroadcastChannel with localStorage fallback.
export default function useIdleTimer({
  timeoutMinutes = 12,
  warningMinutes = 10,
  onWarn = () => {},
  onTimeout = () => {},
  onActive = () => {},
} = {}) {
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = warningMinutes * 60 * 1000;

  const idRef = useRef(`tab_${Math.random().toString(36).slice(2, 9)}`);
  const bcRef = useRef(null);
  const leaderRef = useRef(null);
  const heartbeatRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const warnTimerRef = useRef(null);
  const timeoutTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const [isLeader, setIsLeader] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, Math.floor((timeoutMs - (Date.now() - lastActivityRef.current)) / 1000)));
  const isWarningRef = useRef(false);

  const send = (msg) => {
    try {
      if (!bcRef.current) return;
      bcRef.current.postMessage(msg);
    } catch (err) {
      // ignore
    }
  };

  const becomeLeader = () => {
    leaderRef.current = idRef.current;
    setIsLeader(true);
    send({ type: 'leader-is', id: idRef.current });
    // start heartbeat
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => send({ type: 'heartbeat', id: idRef.current }), 5000);
  };

  const resetTimers = () => {
    lastActivityRef.current = Date.now();
    setIsWarning(false);
    setSecondsLeft(Math.max(0, Math.floor((timeoutMs - (Date.now() - lastActivityRef.current)) / 1000)));
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    const timeUntilWarn = Math.max(0, warningMs - (Date.now() - lastActivityRef.current));
    const timeUntilTimeout = Math.max(0, timeoutMs - (Date.now() - lastActivityRef.current));

    warnTimerRef.current = setTimeout(() => {
      // only leader shows warning
      if (leaderRef.current === idRef.current) {
        isWarningRef.current = true;
        setIsWarning(true);
        onWarn();
        // start countdown
        countdownIntervalRef.current = setInterval(() => {
          const secs = Math.max(0, Math.floor((timeoutMs - (Date.now() - lastActivityRef.current)) / 1000));
          setSecondsLeft(secs);
        }, 1000);
      }
    }, timeUntilWarn);

    timeoutTimerRef.current = setTimeout(() => {
      if (leaderRef.current === idRef.current) {
        onTimeout();
      }
    }, timeUntilTimeout);
  };

  const handleActivityLocal = (origin = 'local') => {
    // When warning is showing, ignore passive activity (mouse/keys/scroll)
    // Only allow explicit `stay` action to reset timers.
    if (isWarningRef.current && origin !== 'stay-button') return;

    lastActivityRef.current = Date.now();
    send({ type: 'active', id: idRef.current, origin });
    resetTimers();
    onActive();
  };

  useEffect(() => {
    // setup BroadcastChannel or fallback to window.addEventListener('storage')
    try {
      if ('BroadcastChannel' in window) {
        bcRef.current = new BroadcastChannel('omnis-idle');
        bcRef.current.onmessage = (ev) => {
          const msg = ev.data;
          if (!msg || !msg.type) return;
          if (msg.type === 'who-is-leader') {
            if (leaderRef.current === idRef.current) {
              send({ type: 'leader-is', id: idRef.current });
            }
          }
          if (msg.type === 'leader-is') {
            leaderRef.current = msg.id;
            setIsLeader(msg.id === idRef.current);
            if (msg.id !== idRef.current && heartbeatRef.current) {
              clearInterval(heartbeatRef.current);
              heartbeatRef.current = null;
            }
          }
          if (msg.type === 'heartbeat') {
            leaderRef.current = msg.id;
            setIsLeader(msg.id === idRef.current);
          }
              if (msg.type === 'active') {
                // If we're currently warning, ignore passive activity broadcasts
                if (isWarningRef.current && msg.origin !== 'stay-button') return;
                lastActivityRef.current = Date.now();
                if (isWarningRef.current) {
                  isWarningRef.current = false;
                  setIsWarning(false);
                }
                resetTimers();
                onActive();
              }
        };
      } else {
        const storageHandler = (e) => {
          if (e.key !== 'omnis-idle-msg') return;
          try {
            const msg = JSON.parse(e.newValue);
            if (!msg) return;
            if (msg.type === 'active') {
              if (isWarningRef.current && msg.origin !== 'stay-button') return;
              lastActivityRef.current = Date.now();
              if (isWarningRef.current) {
                isWarningRef.current = false;
                setIsWarning(false);
              }
              resetTimers();
              onActive();
            }
            if (msg.type === 'leader-is') {
              leaderRef.current = msg.id;
              setIsLeader(msg.id === idRef.current);
            }
          } catch (err) {}
        };
        window.addEventListener('storage', storageHandler);
        bcRef.current = { postMessage: (m) => localStorage.setItem('omnis-idle-msg', JSON.stringify(m)) };
      }
    } catch (err) {
      // ignore
    }

    // election: ask who is leader
    setTimeout(() => send({ type: 'who-is-leader', id: idRef.current }), 50);

    // if nobody claims leadership in short time, become leader
    const claimTimer = setTimeout(() => {
      if (!leaderRef.current) becomeLeader();
    }, 300);

    // event listeners for activity
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const activityHandler = () => {
      // ignore passive activity while modal is visible
      if (isWarningRef.current) return;
      handleActivityLocal('local');
    };
    events.forEach((ev) => window.addEventListener(ev, activityHandler, { passive: true }));

    // start timers based on now
    resetTimers();

    // cleanup
    return () => {
      clearTimeout(claimTimer);
      if (bcRef.current && bcRef.current.close) bcRef.current.close();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      events.forEach((ev) => window.removeEventListener(ev, activityHandler));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stay = () => {
    handleActivityLocal('stay-button');
  };

  const forceLogout = () => {
    // broadcast and call onTimeout
    send({ type: 'timeout', id: idRef.current });
    onTimeout();
  };

  return {
    isLeader,
    isWarning,
    secondsLeft,
    stay,
    forceLogout,
  };
}
