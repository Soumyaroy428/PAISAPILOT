import { MongoClient, Db, Collection } from "mongodb";
import type { Document } from "mongodb";

const uri = process.env.MONGODB_URI;

interface MongoGlobal {
  _mongoClientPromise?: Promise<MongoClient>;
}

declare const globalThis: MongoGlobal;

let clientPromise: Promise<MongoClient> | null = null;

if (uri) {
  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so the MongoClient instance
    // is preserved across module reloads caused by HMR.
    if (!globalThis._mongoClientPromise) {
      const client = new MongoClient(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
      });
      globalThis._mongoClientPromise = client.connect();
    }
    clientPromise = globalThis._mongoClientPromise;
  } else {
    // In production mode, create a standard client promise.
    const client = new MongoClient(uri, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });
    clientPromise = client.connect();
  }
}

/**
 * Returns a connected MongoDB client.
 * Throws a helpful configuration error if MONGODB_URI is not set.
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    throw new Error(
      "Database not configured: MONGODB_URI environment variable is missing."
    );
  }
  return clientPromise;
}

/**
 * Returns the default PaisaPilot MongoDB database instance.
 */
export async function getDatabase(): Promise<Db> {
  const client = await getMongoClient();
  return client.db("paisapilot");
}

/**
 * Returns a typed collection from the database.
 */
export async function getCollection<T extends Document = any>(
  collectionName: string
): Promise<Collection<T>> {
  const db = await getDatabase();
  return db.collection<T>(collectionName);
}

let indexesInitialized = false;

/**
 * Ensures required database indexes exist. Runs idempotently.
 */
export async function ensureDatabaseIndexes(): Promise<void> {
  if (indexesInitialized || !uri) return;

  try {
    const db = await getDatabase();
    
    // 1. Users indexes
    await db.collection("users").createIndex(
      { emailNormalized: 1 },
      { unique: true, background: true }
    );

    // 2. Categories indexes
    await db.collection("categories").createIndex(
      { userId: 1, nameNormalized: 1 },
      { background: true }
    );

    // 3. Budgets indexes
    await db.collection("budgets").createIndex(
      { userId: 1, periodStart: 1, categoryId: 1 },
      { background: true }
    );

    // 4. Accounts indexes
    await db.collection("accounts").createIndex(
      { userId: 1, isArchived: 1 },
      { background: true }
    );

    // 5. Transactions indexes
    await db.collection("transactions").createIndex(
      { userId: 1, transactionDate: -1 },
      { background: true }
    );
    await db.collection("transactions").createIndex(
      { userId: 1, type: 1 },
      { background: true }
    );
    await db.collection("transactions").createIndex(
      { userId: 1, accountId: 1 },
      { background: true }
    );

    // 6. Recurring indexes
    await db.collection("recurring").createIndex(
      { userId: 1, status: 1 },
      { background: true }
    );

    // 7. Notifications indexes (fingerprint uniqueness guarantees idempotent alerts)
    await db.collection("notifications").createIndex(
      { userId: 1, fingerprint: 1 },
      { unique: true, background: true }
    );
    await db.collection("notifications").createIndex(
      { userId: 1, isRead: 1, createdAt: -1 },
      { background: true }
    );

    indexesInitialized = true;
  } catch (error) {
    console.error("Warning: Could not initialize database indexes:", error);
  }
}
