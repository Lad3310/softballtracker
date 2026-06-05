"use client";

const STORAGE_TEST_KEY = "__training_app_storage_test__";

export function getBrowserLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storage = window.localStorage;
    storage.setItem(STORAGE_TEST_KEY, STORAGE_TEST_KEY);
    storage.removeItem(STORAGE_TEST_KEY);
    return storage;
  } catch {
    return null;
  }
}

export function readBrowserStorage(key: string) {
  try {
    return getBrowserLocalStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeBrowserStorage(key: string, value: string) {
  try {
    getBrowserLocalStorage()?.setItem(key, value);
  } catch {
    return;
  }
}

export function removeBrowserStorage(key: string) {
  try {
    getBrowserLocalStorage()?.removeItem(key);
  } catch {
    return;
  }
}
