// Desliga o service worker da versão antiga do AgilizaProf.
//
// A versão anterior do app (feita com vite-plugin-pwa) registrava /sw.js e
// guardava o site inteiro em cache. Quem instalou o app naquela época
// continuava abrindo a versão antiga, com a logo antiga, porque o navegador
// não achava mais /sw.js e por isso mantinha o worker velho para sempre.
//
// Este arquivo substitui o worker antigo: apaga os caches, se desregistra e
// recarrega as janelas abertas. Assim o app instalado passa a carregar a
// versão atual (e o manifest com a logo do lápis). O app atual não usa
// service worker, então nada é registrado de novo.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch (_) {
        // sem cache para limpar
      }
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        try {
          client.navigate(client.url);
        } catch (_) {
          // a janela será atualizada na próxima abertura
        }
      }
    })(),
  );
});
