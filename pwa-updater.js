/* User-controlled Service Worker update, never auto-reload during edits. */
(() => {
'use strict';
const status = document.getElementById('np21UpdateStatus');
const check = document.getElementById('np21CheckUpdate');
const reload = document.getElementById('np21ReloadUpdate');
const report = (message, error=false) => {
  status.textContent=message; status.classList.toggle('np21-error',error);
};
reload.addEventListener('click',()=>window.location.reload());
if (!('serviceWorker' in navigator)) {
  check.disabled=true;report('Ta przeglądarka nie obsługuje trybu PWA offline.',true);return;
}
let registration;
check.addEventListener('click',async()=>{
  if (!registration)return report('Service Worker nie jest jeszcze zarejestrowany.');
  check.disabled=true;
  report('Sprawdzam aktualizacje…');
  try {
    await registration.update();
    if(registration.waiting) {
      report('Nowa wersja jest dostępna. Zakończ edycję i odśwież aplikację.');
      reload.classList.remove('hidden');
    } else report('Sprawdzono aktualizacje. Wersja v2.6.2 jest aktualna.');
  } catch(err){report('Nie udało się sprawdzić aktualizacji: '+err.message,true);}
  finally {check.disabled=false;}
});
navigator.serviceWorker.addEventListener('controllerchange',()=>{
  report('Nowa wersja jest gotowa. Odśwież dopiero po zapisaniu danych.');
  reload.classList.remove('hidden');
});
window.addEventListener('load',async()=>{
  try {
    registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
    report('Wersja 2.6.2. Aktualizacje możesz sprawdzić ręcznie.');
    if(registration.waiting&&navigator.serviceWorker.controller) {
      report('Nowa wersja gotowa. Odśwież po zapisaniu danych.');
      reload.classList.remove('hidden');
    }
    registration.addEventListener('updatefound',()=>{
      const installing=registration.installing;
      installing?.addEventListener('statechange',()=>{
        if(installing.state==='installed'&&navigator.serviceWorker.controller) {
          report('Zainstalowano aktualizację. Odśwież po zapisaniu danych.');
          reload.classList.remove('hidden');
        }
      });
    });
  }catch(err){report('Błąd rejestracji PWA: '+err.message,true);}
});
})();