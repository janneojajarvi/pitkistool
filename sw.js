const CACHE_NAME = 'pitkistool-v7';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './favicon.ico',
  './favicon.png',
  './kuva.png',
  
  // Sovelluslogiikka ja yleiset nuottikirjastot
  './FinnishTunes.js',
  './FinnishTunes2.js',
  './sekalaista01.js',
  './richardrobinsonbook.js',
  './norway1.js',
  './swedish2.js',
  './korjaustsekki3.js',
  './tarkistusnuotit9.js',
  
  // Esävelmät-sarja
  './esavelmat_hs1.js',
  './esavelmat_kansantanssit.js',
  './esavelmat_kjs.js',
  './esavelmat_ls1.js',
  './esavelmat_ls2.js',
  './esavelmat_ls3.js',
  './esavelmat_ls4.js',
  './esavelmat_rs1.js',
  './esavelmat_rs2.js',
  
  // Folkwiki ja muut kokoelmat
  './folkwikiSet1.js',
  './folkwikiSet2.js',
  './folkwikiSet3.js',
  './fsfolkdiktning01.js',
  './fsfolkdiktning02.js',
  './extrasetti5.js',
  
  // SessionSet-sarja (1-18)
  './sessionSet01.js',
  './sessionSet02.js',
  './sessionSet03.js',
  './sessionSet04.js',
  './sessionSet05.js',
  './sessionSet06.js',
  './sessionSet07.js',
  './sessionSet08.js',
  './sessionSet09.js',
  './sessionSet10.js',
  './sessionSet11.js',
  './sessionSet12.js',
  './sessionSet13.js',
  './sessionSet14.js',
  './sessionSet15.js',
  './sessionSet16.js',
  './sessionSet17.js',
  './sessionSet18.js'
];

// Asennusvaihe: Tallennetaan perustiedostot välimuistiin
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Aktivoituminen
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
