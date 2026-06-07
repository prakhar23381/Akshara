import { supabase } from "./supabase";
import type { SessionPayload } from "../types/levelConfig";

const STORAGE_KEY = "akshara_offline_sessions_queue";

export function getOfflineQueue(): SessionPayload[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: SessionPayload[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error("Failed to save offline queue", err);
  }
}

export function queueOfflineSession(payload: SessionPayload) {
  console.log("[OfflineSync] Queueing session for sync:", payload.session_id);
  const queue = getOfflineQueue();
  // Avoid duplicate queueing of same session
  if (!queue.some(item => item.session_id === payload.session_id)) {
    queue.push(payload);
    saveOfflineQueue(queue);
  }
}

export async function syncOfflineSessions(baseUrl: string) {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  console.log(`[OfflineSync] Found ${queue.length} sessions to sync...`);

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    console.warn("[OfflineSync] Sync deferred: User not logged in.");
    return;
  }

  const failedToSync: SessionPayload[] = [];

  for (const payload of queue) {
    try {
      console.log(`[OfflineSync] Syncing session ${payload.session_id}...`);
      const response = await fetch(`${baseUrl}/analyze_session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`[OfflineSync] Successfully synced session ${payload.session_id}`);
      } else {
        console.warn(`[OfflineSync] Server returned error for session ${payload.session_id}:`, response.status);
        failedToSync.push(payload);
      }
    } catch (err) {
      console.error(`[OfflineSync] Network error syncing session ${payload.session_id}:`, err);
      failedToSync.push(payload);
    }
  }

  saveOfflineQueue(failedToSync);
}

// Automatically sync when browser returns online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5050";
    syncOfflineSessions(baseUrl).catch(err => {
      console.error("[OfflineSync] Auto-sync triggered on online event failed:", err);
    });
  });
}
