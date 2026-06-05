"use client";

import { createClient, type SupabaseClient, type SupportedStorage } from "@supabase/supabase-js";
import {
  readBrowserStorage,
  removeBrowserStorage,
  writeBrowserStorage,
} from "@/lib/browser-storage";

let client: SupabaseClient | null | undefined;
const authMemoryStorage = new Map<string, string>();

const authStorage: SupportedStorage = {
  getItem(key) {
    return readBrowserStorage(key) ?? authMemoryStorage.get(key) ?? null;
  },
  setItem(key, value) {
    authMemoryStorage.set(key, value);
    writeBrowserStorage(key, value);
  },
  removeItem(key) {
    authMemoryStorage.delete(key);
    removeBrowserStorage(key);
  },
};

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export function getSupabaseBrowserClient() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  if (client === undefined) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
      {
        auth: {
          storage: authStorage,
        },
      },
    );
  }

  return client;
}
