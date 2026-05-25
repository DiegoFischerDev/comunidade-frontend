/**
 * Persistência local dos ficheiros + estado do formulário entre sessões.
 *
 * Os ficheiros podem ser grandes (PDFs de alguns MB) e o `localStorage` é demasiado pequeno
 * — usamos IndexedDB. O Safari iOS não consegue guardar `File`/`Blob` em IndexedDB, por isso
 * guardamos `ArrayBuffer` + metadados e reconstruímos o `File` na leitura.
 *
 * Tudo o que está aqui corre apenas no browser; chamar do server seria um erro porque
 * `indexedDB` é `undefined` lá. As funções devolvem promessas que rejeitam silenciosamente
 * em SSR, deixando o caller decidir o fallback.
 */

const DB_NAME = 'comunidade_lead_documents';
const DB_VERSION = 1;
const STORE = 'files';
const FORM_KEY_SUFFIX = '_formState';

type StoredFile = {
  key: string;
  buffer: ArrayBuffer;
  fileName: string;
  mimeType: string;
};

type StoredForm = {
  key: string;
  formState: Record<string, unknown>;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available in this environment.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'key' });
    };
  });
}

function fileKey(leadId: string, fieldName: string): string {
  return `${leadId}__${fieldName}`;
}

function formKey(leadId: string): string {
  return `${leadId}${FORM_KEY_SUFFIX}`;
}

/** Guarda (substitui) o ficheiro do campo. */
export async function saveFile(
  leadId: string,
  fieldName: string,
  file: File,
): Promise<void> {
  const buffer = await file.arrayBuffer();
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({
      key: fileKey(leadId, fieldName),
      buffer,
      fileName: file.name || 'documento',
      mimeType: file.type || 'application/octet-stream',
    } satisfies StoredFile);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Lê o ficheiro do campo. Devolve `null` se não existir. */
export async function readFile(
  leadId: string,
  fieldName: string,
): Promise<File | null> {
  const db = await openDb();
  return new Promise<File | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(fileKey(leadId, fieldName));
    req.onsuccess = () => {
      const row = req.result as StoredFile | undefined;
      if (!row) return resolve(null);
      const f = new File([row.buffer], row.fileName, { type: row.mimeType });
      resolve(f);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Lista os `fieldName` já guardados localmente para este lead. */
export async function listSavedFields(leadId: string): Promise<string[]> {
  const db = await openDb();
  return new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAllKeys();
    req.onsuccess = () => {
      const prefix = `${leadId}__`;
      const all = (req.result ?? []) as IDBValidKey[];
      const fields: string[] = [];
      for (const k of all) {
        if (typeof k === 'string' && k.startsWith(prefix)) {
          fields.push(k.slice(prefix.length));
        }
      }
      resolve(fields);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Apaga apenas um campo. */
export async function deleteFile(leadId: string, fieldName: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(fileKey(leadId, fieldName));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Apaga todos os ficheiros e estado do formulário deste lead (após envio). */
export async function clearLeadStorage(leadId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.getAllKeys();
    req.onsuccess = () => {
      const prefix = `${leadId}__`;
      const all = (req.result ?? []) as IDBValidKey[];
      for (const k of all) {
        if (typeof k === 'string' && k.startsWith(prefix)) {
          store.delete(k);
        }
      }
      store.delete(formKey(leadId));
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Guarda o estado do formulário (estado civil, vínculo, etc.). */
export async function saveFormState(
  leadId: string,
  formState: Record<string, unknown>,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({
      key: formKey(leadId),
      formState,
    } satisfies StoredForm);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Lê o estado do formulário. Devolve `null` se não houver nada guardado. */
export async function readFormState(
  leadId: string,
): Promise<Record<string, unknown> | null> {
  const db = await openDb();
  return new Promise<Record<string, unknown> | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(formKey(leadId));
    req.onsuccess = () => {
      const row = req.result as StoredForm | undefined;
      resolve(row ? row.formState : null);
    };
    req.onerror = () => reject(req.error);
  });
}
