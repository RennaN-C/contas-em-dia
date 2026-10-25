import { useEffect, useState } from 'react';
import { messagesApi } from '../features/messages/messages.api';
export function useUnreadMessages() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = () => { messagesApi.summary().then(r => { if(active) setUnread(r.unread ?? 0); }).catch(() => {}); };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('saldo:messages-changed', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('saldo:messages-changed', refresh); };
  }, []);
  return unread;
}
