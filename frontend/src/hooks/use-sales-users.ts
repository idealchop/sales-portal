"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { firestore } from "@/lib/firebase/firestore";
import { toIsoString } from "@/lib/firestore-utils";
import type { UserProfile, WithId } from "@/lib/definitions";
import { useAuthUid } from "./use-auth-uid";

export function useSalesUsers() {
  const { uid, authReady } = useAuthUid();
  const [salesUsers, setSalesUsers] = useState<WithId<UserProfile>[]>([]);
  const [loadedForUid, setLoadedForUid] = useState<string | null>(null);
  const shouldSubscribe = authReady && Boolean(uid);

  useEffect(() => {
    if (!shouldSubscribe || !uid) return;

    const q = query(collection(firestore, "sales"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSalesUsers(
          snap.docs.map((docSnap) => {
            const data = docSnap.data() as Omit<UserProfile, "id">;
            return {
              id: docSnap.id,
              ...data,
              createdAt: toIsoString(
                (data as { createdAt?: unknown }).createdAt,
              ),
            } as WithId<UserProfile>;
          }),
        );
        setLoadedForUid(uid);
      },
      () => {
        setSalesUsers([]);
        setLoadedForUid(uid);
      },
    );
    return () => unsub();
  }, [shouldSubscribe, uid]);

  return {
    salesUsers: shouldSubscribe ? salesUsers : [],
    isLoading: !authReady || (shouldSubscribe ? loadedForUid !== uid : false),
  };
}
