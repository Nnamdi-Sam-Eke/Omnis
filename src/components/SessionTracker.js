import { useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';

const TAB_ID = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const SESSION_LOCK_KEY = 'activeTabSessionLock';
const LEADERSHIP_TIMEOUT = 45000; // 45 seconds

console.log(`🆔 Tab ID created: ${TAB_ID}`);

// Try to claim leadership
const claimLeadership = () => {
  const now = Date.now();
  const lockStr = localStorage.getItem(SESSION_LOCK_KEY);

  try {
    const lock = lockStr ? JSON.parse(lockStr) : null;

    if (!lock || now - lock.timestamp > LEADERSHIP_TIMEOUT) {
      const newLock = { tabId: TAB_ID, timestamp: now };
      localStorage.setItem(SESSION_LOCK_KEY, JSON.stringify(newLock));
      console.log(`👑 Leadership claimed by tab: ${TAB_ID}`);
      return true;
    }

    if (lock.tabId === TAB_ID) {
      localStorage.setItem(
        SESSION_LOCK_KEY,
        JSON.stringify({ tabId: TAB_ID, timestamp: now })
      );
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error claiming leadership:', error);
    return false;
  }
};

// Release leadership on unload
const releaseLeadership = () => {
  try {
    const lockStr = localStorage.getItem(SESSION_LOCK_KEY);
    const lock = lockStr ? JSON.parse(lockStr) : null;
    if (lock && lock.tabId === TAB_ID) {
      localStorage.removeItem(SESSION_LOCK_KEY);
      console.log('👑 Leadership released');
    }
  } catch (error) {
    console.error('❌ Error releasing leadership:', error);
  }
};

const SessionTracker = ({ onBecomeLeader, onLoseLeader }) => {
  const { user } = useAuth(); // AuthContext-driven
  const isLeaderRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const handleStorageChange = (e) => {
      if (e.key === SESSION_LOCK_KEY) {
        const nowLeader = claimLeadership();
        if (!isLeaderRef.current && nowLeader && user) {
          isLeaderRef.current = true;
          onBecomeLeader?.(user);
          console.log('🎖️ Became leader tab');
        } else if (isLeaderRef.current && !nowLeader) {
          isLeaderRef.current = false;
          onLoseLeader?.(user);
          console.log('👋 Lost leadership tab');
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isLeaderRef.current) {
        isLeaderRef.current = false;
        onLoseLeader?.(user);
      } else if (!document.hidden && !isLeaderRef.current && user) {
        const nowLeader = claimLeadership();
        if (nowLeader) {
          isLeaderRef.current = true;
          onBecomeLeader?.(user);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', releaseLeadership);

    // Try initial leadership claim when component mounts & user exists
    if (user) {
      const nowLeader = claimLeadership();
      if (nowLeader) {
        isLeaderRef.current = true;
        onBecomeLeader?.(user);
      }
    }

    return () => {
      isMountedRef.current = false;
      isLeaderRef.current = false;
      onLoseLeader?.(user);
      releaseLeadership();
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', releaseLeadership);
    };
  }, [user, onBecomeLeader, onLoseLeader]);

  return null;
};

export default SessionTracker;
