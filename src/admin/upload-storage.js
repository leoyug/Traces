const databaseName = "incessant-content-import";
const storeName = "pending-uploads";
const maxFiles = 100;
const maxBytes = 80_000_000;
const maxAge = 15 * 60_000;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("无法暂存所选文件。"));
  });
}

export async function savePendingUpload(category, files) {
  if (files.length > maxFiles) throw new Error(`一次最多选择 ${maxFiles} 个文件。`);
  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (totalBytes > maxBytes) throw new Error("文件总量超过 80 MB，请分批选择。");

  const id = crypto.randomUUID();
  const entries = files.map((file) => ({
    file,
    path: file.webkitRelativePath || file.name,
  }));
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const existing = store.getAll();
    existing.onsuccess = () => {
      const now = Date.now();
      for (const upload of existing.result) {
        if (!Number.isFinite(upload.createdAt) || now - upload.createdAt > maxAge) store.delete(upload.id);
      }
      store.put({ id, category, entries, createdAt: now });
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(id);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("暂存文件失败，请重试。"));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("暂存文件失败，请重试。"));
    };
  });
}

export async function takePendingUpload(id) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    let upload;
    request.onsuccess = () => {
      upload = request.result;
      if (upload) store.delete(id);
      if (upload && (!Number.isFinite(upload.createdAt) || Date.now() - upload.createdAt > maxAge)) upload = undefined;
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(upload);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("无法读取暂存文件，请重新选择。"));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("无法读取暂存文件，请重新选择。"));
    };
  });
}
