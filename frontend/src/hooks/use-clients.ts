"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { firestore } from "@/lib/firebase/firestore";
import type { Client, WithId } from "@/lib/definitions";

export function useClients(userId?: string) {
  const [clients, setClients] = useState<WithId<Client>[]>([]);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const shouldSubscribe = Boolean(userId);

  useEffect(() => {
    if (!shouldSubscribe || !userId) return;

    const q = query(
      collection(firestore, "clients"),
      where("userId", "==", userId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setClients(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Client, "id">),
          })),
        );
        setLoadedForUserId(userId);
      },
      () => {
        setClients([]);
        setLoadedForUserId(userId);
      },
    );
    return () => unsub();
  }, [shouldSubscribe, userId]);

  return {
    clients: shouldSubscribe ? clients : [],
    isLoading: shouldSubscribe ? loadedForUserId !== userId : false,
  };
}
