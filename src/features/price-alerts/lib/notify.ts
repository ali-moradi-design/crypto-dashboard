export type NotifyPermission = NotificationPermission | 'unsupported'

export function notificationPermission(): NotifyPermission {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

/** Asks once; returns the resulting permission. */
export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export function showNotification(title: string, body: string, tag: string): void {
  if (notificationPermission() !== 'granted') return
  try {
    new Notification(title, { body, tag, icon: '/favicon.svg' })
  } catch {
    // Some browsers only allow notifications from a service worker.
  }
}
