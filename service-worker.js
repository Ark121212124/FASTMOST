self.addEventListener("install",e=>{
  e.waitUntil(
    caches.open("fastmost").then(c=>c.addAll([
      "landing.html","index.html","admin.html"
    ]))
  );
});
