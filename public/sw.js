// 웹 푸시 전용 서비스 워커. 오프라인 캐싱 등 다른 역할은 없음.

self.addEventListener('push', (event) => {
  let payload = { title: '뷰티그라운드', body: '', data: {} }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch (e) {
    // ignore malformed payload
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: payload.data || {},
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/app/home'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
