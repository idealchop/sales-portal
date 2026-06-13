"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { firestore } from "@/lib/firebase/firestore";
import type { Client, WithId } from "@/lib/definitions";
import { useAuthUid } from "./use-auth-uid";

export function useAllClients() {
  const { uid, authReady } = useAuthUid();
  const [clients, setClients] = useState<WithId<Client>[]>([]);
  const [loadedForUid, setLoadedForUid] = useState<string | null>(null);
  const shouldSubscribe = authReady && Boolean(uid);

  useEffect(() => {
    if (!shouldSubscribe || !uid) return;

    const q = query(collection(firestore, "clients"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setClients(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Client, "id">),
          })),
        );
        setLoadedForUid(uid);
      },
      () => {
        setClients([]);
        setLoadedForUid(uid);
      },
    );
    return () => unsub();
  }, [shouldSubscribe, uid]);

  return {
    clients: shouldSubscribe ? clients : [],
    isLoading: !authReady || (shouldSubscribe ? loadedForUid !== uid : false),
  };
}
