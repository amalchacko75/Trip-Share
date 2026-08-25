const DB_NAME = "tripshare-local";
const DB_VERSION = 1;
const STORE_NAME = "originals";

type LocalAssetRecord = {
  assetId: string;
  file: File;
  savedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "assetId",
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ??
          new Error("Could not open IndexedDB."),
      );
    };
  });
}

/**
 * Save the ORIGINAL file locally.
 *
 * This does NOT upload the file to Django.
 */
export async function saveLocalFile(
  assetId: string,
  file: File,
): Promise<void> {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite",
    );

    transaction.objectStore(STORE_NAME).put({
      assetId,
      file,
      savedAt: Date.now(),
    } satisfies LocalAssetRecord);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(
        transaction.error ??
          new Error("Could not save local file."),
      );
    };

    transaction.onabort = () => {
      reject(
        transaction.error ??
          new Error("Local file transaction aborted."),
      );
    };
  });

  db.close();
}

/**
 * Get an ORIGINAL file from local storage.
 */
export async function getLocalFile(
  assetId: string,
): Promise<File | null> {
  const db = await openDb();

  return new Promise<File | null>(
    (resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        "readonly",
      );

      const request = transaction
        .objectStore(STORE_NAME)
        .get(assetId);

      request.onsuccess = () => {
        const record =
          request.result as
            | LocalAssetRecord
            | undefined;

        if (!record) {
          db.close();
          resolve(null);
          return;
        }

        if (record.file instanceof File) {
          db.close();
          resolve(record.file);
          return;
        }

        const blob = record.file as unknown as Blob;

        const file = new File(
          [blob],
          "tripshare-original",
          {
            type:
              blob.type ||
              "application/octet-stream",
          },
        );

        db.close();
        resolve(file);
      };

      request.onerror = () => {
        db.close();

        reject(
          request.error ??
            new Error(
              "Could not read local file.",
            ),
        );
      };
    },
  );
}

/**
 * Check whether the ORIGINAL exists locally.
 */
export async function hasLocalFile(
  assetId: string,
): Promise<boolean> {
  const db = await openDb();

  return new Promise<boolean>(
    (resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        "readonly",
      );

      const request = transaction
        .objectStore(STORE_NAME)
        .getKey(assetId);

      request.onsuccess = () => {
        db.close();
        resolve(
          request.result !== undefined,
        );
      };

      request.onerror = () => {
        db.close();

        reject(
          request.error ??
            new Error(
              "Could not check local file.",
            ),
        );
      };
    },
  );
}

/**
 * Delete a locally stored ORIGINAL.
 */
export async function deleteLocalFile(
  assetId: string,
): Promise<void> {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite",
    );

    transaction
      .objectStore(STORE_NAME)
      .delete(assetId);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(
        transaction.error ??
          new Error(
            "Could not delete local file.",
          ),
      );
    };
  });

  db.close();
}

/**
 * SHA-256 checksum.
 */
export async function sha256(
  file: File,
): Promise<string> {
  const buffer = await file.arrayBuffer();

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      buffer,
    );

  return [...new Uint8Array(digest)]
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

/**
 * Generate a small thumbnail locally.
 */
export async function makeThumbnail(
  file: File,
  maxSize = 320,
): Promise<Blob> {
  const bitmap =
    await createImageBitmap(file);

  const scale = Math.min(
    1,
    maxSize /
      Math.max(
        bitmap.width,
        bitmap.height,
      ),
  );

  const width = Math.max(
    1,
    Math.round(bitmap.width * scale),
  );

  const height = Math.max(
    1,
    Math.round(bitmap.height * scale),
  );

  const canvas =
    document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext("2d");

  if (!context) {
    bitmap.close();

    throw new Error(
      "Canvas is not supported.",
    );
  }

  context.drawImage(
    bitmap,
    0,
    0,
    width,
    height,
  );

  bitmap.close();

  return new Promise<Blob>(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(
              new Error(
                "Could not generate thumbnail.",
              ),
            );
          }
        },
        "image/jpeg",
        0.82,
      );
    },
  );
}