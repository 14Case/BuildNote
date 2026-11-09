import type { FormulaireLot, ElementFileSynchro } from '../types.js';

const DB_NAME = 'buildnote_offline_db';
const DB_VERSION = 1;

function ouvrirDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('lots')) {
        db.createObjectStore('lots', { keyPath: 'lotId' });
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function sauvegarderLotLocal(lot: FormulaireLot): Promise<void> {
  const db = await ouvrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lots', 'readwrite');
    tx.objectStore('lots').put(lot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function recupererLotLocal(lotId: string): Promise<FormulaireLot | null> {
  const db = await ouvrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lots', 'readonly');
    const req = tx.objectStore('lots').get(lotId);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function listerLotsLocaux(): Promise<FormulaireLot[]> {
  const db = await ouvrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lots', 'readonly');
    const req = tx.objectStore('lots').getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function ajouterFileSynchro(item: ElementFileSynchro): Promise<void> {
  const db = await ouvrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite');
    tx.objectStore('sync_queue').put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listerFileSynchro(): Promise<ElementFileSynchro[]> {
  const db = await ouvrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readonly');
    const req = tx.objectStore('sync_queue').getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function supprimerFileSynchro(id: string): Promise<void> {
  const db = await ouvrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite');
    tx.objectStore('sync_queue').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
