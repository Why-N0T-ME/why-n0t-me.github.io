/* 예전 Chirpy 블로그가 방문자 브라우저에 등록해 둔 서비스 워커(PWA 캐시)를 정리하는 파일입니다.
   예전 워커는 이 주소(/sw.min.js)로 등록돼 있어서, 브라우저가 이 파일을 받으면 워커가 교체됩니다.
   교체되면 저장된 캐시를 모두 지우고, 열려 있는 탭을 새로고침한 뒤, 스스로 등록을 해제합니다.
   fetch 핸들러가 없으므로 이후에는 모든 요청이 그대로 네트워크로 나갑니다.
   (모든 방문자가 한 번씩 거친 뒤에는 지워도 됩니다.) */
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    try { await self.clients.claim(); } catch (e) { /* 무시 */ }
    try {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    } catch (e) { /* 무시 */ }
    try {
      var list = await self.clients.matchAll({ type: 'window' });
      list.forEach(function (c) { try { c.navigate(c.url); } catch (e) { /* 무시 */ } });
    } catch (e) { /* 무시 */ }
    try { await self.registration.unregister(); } catch (e) { /* 무시 */ }
  })());
});
