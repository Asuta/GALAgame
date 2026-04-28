const MEDIA_DB_NAME = 'romance-map-chat-game.media';
const MEDIA_DB_VERSION = 1;
const MEDIA_STORE_NAME = 'media';
const MEDIA_URL_PREFIX = 'media://';

export interface StoredMediaRecord {
  key: string;
  blob: Blob;
  contentType: string;
  updatedAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export const isStoredMediaUrl = (value: string): boolean => value.startsWith(MEDIA_URL_PREFIX);

export const createStoredMediaUrl = (key: string): string => `${MEDIA_URL_PREFIX}${key}`;

export const getStoredMediaKey = (url: string): string | null =>
  isStoredMediaUrl(url) ? url.slice(MEDIA_URL_PREFIX.length) : null;

export const dataUrlToBlob = (dataUrl: string): Blob => {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/.exec(dataUrl);

  if (!match) {
    throw new Error('图片数据格式不正确。');
  }

  const contentType = match[1] || 'application/octet-stream';
  const isBase64 = !!match[2];
  const raw = isBase64 ? atob(match[3]) : decodeURIComponent(match[3]);
  const bytes = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return new Blob([bytes], { type: contentType });
};

const openMediaDatabase = async (): Promise<IDBDatabase> => {
  if (typeof indexedDB === 'undefined') {
    throw new Error('当前浏览器不支持 IndexedDB，无法保存图片媒体。');
  }

  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(MEDIA_DB_NAME, MEDIA_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
        db.createObjectStore(MEDIA_STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('图片媒体数据库打开失败。'));
  });

  return await dbPromise;
};

const runMediaTransaction = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void
): Promise<T> => {
  const db = await openMediaDatabase();

  return await new Promise((resolve, reject) => {
    const transaction = db.transaction(MEDIA_STORE_NAME, mode);
    const store = transaction.objectStore(MEDIA_STORE_NAME);

    transaction.onerror = () => reject(transaction.error ?? new Error('图片媒体数据库操作失败。'));
    action(store, resolve, reject);
  });
};

export const saveMediaBlob = async (key: string, blob: Blob): Promise<void> => {
  await runMediaTransaction<void>('readwrite', (store, resolve, reject) => {
    const request = store.put({
      key,
      blob,
      contentType: blob.type || 'application/octet-stream',
      updatedAt: new Date().toISOString()
    } satisfies StoredMediaRecord);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('图片媒体保存失败。'));
  });
};

export const loadMediaBlob = async (key: string): Promise<Blob | null> =>
  await runMediaTransaction<Blob | null>('readonly', (store, resolve, reject) => {
    const request = store.get(key);

    request.onsuccess = () => {
      const record = request.result as StoredMediaRecord | undefined;
      resolve(record?.blob ?? null);
    };
    request.onerror = () => reject(request.error ?? new Error('图片媒体读取失败。'));
  });

export const deleteMediaBlob = async (key: string): Promise<void> => {
  await runMediaTransaction<void>('readwrite', (store, resolve, reject) => {
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('图片媒体删除失败。'));
  });
};

export const clearMediaStore = async (): Promise<void> => {
  await runMediaTransaction<void>('readwrite', (store, resolve, reject) => {
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('图片媒体清理失败。'));
  });
};
