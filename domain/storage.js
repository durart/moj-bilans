// Small persistence boundary. Never overwrite an unreadable diary.
(() => {
  'use strict';

  function read(storage, key) {
    try {
      const raw = storage.getItem(key);
      if (raw === null) return { data: {}, error: null };
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.entries)) {
        throw Error('Niepoprawny format dziennika');
      }
      return { data, error: null };
    } catch (error) {
      return { data: {}, error: 'Błąd odczytu: ' + (error?.message || 'pamięć niedostępna') + '. Zapis zablokowano, aby nie nadpisać wcześniejszych danych.' };
    }
  }

  function write(storage, key, json) {
    storage.setItem(key, json);
    if (storage.getItem(key) !== json) {
      throw Error('Odczyt po zapisie nie zgadza się z zapisaną treścią.');
    }
  }

  globalThis.MojBilansStorage = Object.freeze({ read, write });
})();
