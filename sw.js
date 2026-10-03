/* Swiss Solar System — Service Worker (notifications push)
   Source : tools/sss-sw.js, copié en /sw.js par tools/build-from-msb.js.
   Le message reçu est volontairement neutre (titre court + « touche pour ouvrir ») : le détail
   ne s'affiche que dans l'application, une fois connecté. */
var SSS_ICON = '/sss-icon-192.png';
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function(e){
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(_) { data = {}; }
  var title = data.title || 'Swiss Solar System';
  var opts = {
    body: data.body || 'Touche pour ouvrir SSS OS',
    icon: SSS_ICON, badge: SSS_ICON,
    tag: data.tag || undefined, renotify: !!data.tag,
    requireInteraction: !!data.urgent,
    data: { url: data.url || '/', id: data.id || null }
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

/* Toucher la notification : si SSS OS est déjà ouvert, on lui demande d'afficher l'élément (sans recharger) ;
   sinon on l'ouvre sur l'adresse /?n=<id>, que l'application lit après la connexion. */
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var d = e.notification.data || {}; var url = d.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(function(cl){
      for (var i=0;i<cl.length;i++){ var c=cl[i];
        if ('focus' in c){ try{ c.postMessage({ type:'sss-notif', id:d.id, url:url }); }catch(_){} return c.focus(); } }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

/* Le navigateur renouvelle parfois l'abonnement tout seul : on se réabonne avec la même clé et on prévient
   l'application, qui enregistre la nouvelle adresse (sinon elle le fera à sa prochaine ouverture). */
self.addEventListener('pushsubscriptionchange', function(e){
  e.waitUntil((async function(){
    try{
      var opt = (e.oldSubscription && e.oldSubscription.options) || null;
      if (opt && opt.applicationServerKey) await self.registration.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: opt.applicationServerKey });
    }catch(_){}
    try{ var cl = await self.clients.matchAll({ type:'window', includeUncontrolled:true }); cl.forEach(function(c){ c.postMessage({ type:'sss-push-renouvele' }); }); }catch(_){}
  })());
});
