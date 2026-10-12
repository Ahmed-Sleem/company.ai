/**
 * Desktop notifications (owner, round eighteen): the browser's own notification system,
 * requested the way Chrome asks — once, with the chance to ask again from Settings. The
 * product only ever *asks*; permission lives with the browser, the on/off flag in the save.
 */
export function notifySupported(): boolean {
  return typeof Notification !== 'undefined';
}

export function notifyPermission(): NotificationPermission | 'unsupported' {
  return notifySupported() ? Notification.permission : 'unsupported';
}

export async function askNotify(): Promise<NotificationPermission | 'unsupported'> {
  if (!notifySupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Fire one notification when the owner has them on and the browser has been asked to grant. */
export function notify(title: string, body: string, enabled: boolean): void {
  if (!enabled || !notifySupported() || Notification.permission !== 'granted') return;
  try {
    const notice = new Notification(title, { body });
    // the notification is a door back to the studio: clicking it brings the window forward.
    notice.onclick = () => { window.focus(); notice.close(); };
  } catch {
    /* some browsers want a service worker; a missed badge is not a crash */
  }
}
