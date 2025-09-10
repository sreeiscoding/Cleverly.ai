const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE) {
  throw new Error('Missing Supabase configs');
}

// Simple in-memory cache for performance optimization
class SimpleCache {
  constructor(ttlMinutes = 5) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Create cache instance (5 minute TTL)
const dbCache = new SimpleCache(5);

// Client for user authentication (login, etc.)
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    headers: { 'x-client-info': 'cleverly-app' }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Client for admin operations (create user, etc.)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    headers: { 'x-client-info': 'cleverly-admin' }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Test connection on startup
console.log(`[${new Date().toISOString()}] Supabase configuration loaded:`, {
  url: SUPABASE_URL ? 'present' : 'missing',
  anonKey: SUPABASE_ANON_KEY ? 'present' : 'missing',
  serviceRole: SUPABASE_SERVICE_ROLE ? 'present' : 'missing'
});

// Database operation timeout (30 seconds)
const DB_TIMEOUT = 30000;

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000
};

// Add logging and timeout wrapper for database operations
const logDatabaseOperation = (operation, table, startTime, success = true, retryCount = 0) => {
  const duration = Date.now() - startTime;
  const status = success ? 'SUCCESS' : 'FAILED';
  const retryInfo = retryCount > 0 ? ` (retry ${retryCount})` : '';
  console.log(`[${new Date().toISOString()}] Database ${operation} on ${table} ${status} in ${duration}ms${retryInfo}`);
};

// Timeout wrapper for promises
const withTimeout = (promise, timeoutMs = DB_TIMEOUT) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Database operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

// Retry wrapper with exponential backoff
const withRetry = async (operation, operationName, table, retryCount = 0) => {
  try {
    const startTime = Date.now();
    const result = await withTimeout(operation());
    logDatabaseOperation(operationName, table, startTime, true, retryCount);
    return result;
  } catch (error) {
    logDatabaseOperation(operationName, table, Date.now() - 1000, false, retryCount);

    if (retryCount < RETRY_CONFIG.maxRetries && (
      error.message.includes('timeout') ||
      error.message.includes('network') ||
      error.code === 'PGRST301' // Supabase timeout
    )) {
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(2, retryCount),
        RETRY_CONFIG.maxDelay
      );

      console.log(`[${new Date().toISOString()}] Retrying ${operationName} on ${table} in ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(operation, operationName, table, retryCount + 1);
    }

    throw error;
  }
};

// Export utility functions for manual use in controllers
module.exports.dbUtils = {
  withTimeout,
  withRetry,
  dbCache,
  clearCache: () => {
    dbCache.clear();
    console.log(`[${new Date().toISOString()}] Cache cleared`);
  },
  logOperation: (operation, table, startTime, success = true) => {
    const duration = Date.now() - startTime;
    const status = success ? 'SUCCESS' : 'FAILED';
    console.log(`[${new Date().toISOString()}] Database ${operation} on ${table} ${status} in ${duration}ms`);
  }
};

module.exports = { supabaseClient, supabaseAdmin };
