/** React Native entry exports this at runtime; default web typings omit it. */
import "firebase/auth";

declare module "firebase/auth" {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): import("firebase/auth").Persistence;
}
