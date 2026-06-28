"use client";

import { createClient, type SupabaseClient, type SupportedStorage } from "@supabase/supabase-js";
import {
  readBrowserStorage,
  removeBrowserStorage,
  writeBrowserStorage,
} from "@/lib/browser-storage";

let client: SupabaseClient | null | undefined;
const authMemoryStorage = new Map<string, string>();

export function getSupabaseAuthStorageKey() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return "supabase.auth.token";
  }

  try {
    const { hostname } = new URL(supabaseUrl);
    const projectRef = hostname.split(".")[0];

    return projectRef ? `sb-${projectRef}-auth-token` : "supabase.auth.token";
  } catch {
    return "supabase.auth.token";
  }
}

export function clearSupabaseBrowserSession() {
  const storageKey = getSupabaseAuthStorageKey();
  const keys = [
    storageKey,
    `${storageKey}-code-verifier`,
    `${storageKey}-user`,
  ];

  keys.forEach((key) => {
    authMemoryStorage.delete(key);
    removeBrowserStorage(key);
  });
}

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
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storage: authStorage,
          storageKey: getSupabaseAuthStorageKey(),
        },
      },
    );
  }

  return client;
}
