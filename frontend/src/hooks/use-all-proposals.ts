"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { firestore } from "@/lib/firebase/firestore";
import { toIsoString } from "@/lib/firestore-utils";
import type { Proposal, WithId } from "@/lib/definitions";
import { useAuthUid } from "./use-auth-uid";

export function useAllProposals() {
  const { uid, authReady } = useAuthUid();
  const [proposals, setProposals] = useState<WithId<Proposal>[]>([]);
  const [loadedForUid, setLoadedForUid] = useState<string | null>(null);
  const shouldSubscribe = authReady && Boolean(uid);

  useEffect(() => {
    if (!shouldSubscribe || !uid) return;

    const q = query(collection(firestore, "proposals"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setProposals(
          snap.docs.map((docSnap) => {
            const data = docSnap.data() as Omit<Proposal, "id">;
            return {
              ...data,
              id: docSnap.id,
              createdAt: toIsoString(data.createdAt),
              amount: data.amount || 0,
            };
          }),
        );
        setLoadedForUid(uid);
      },
      () => {
        setProposals([]);
        setLoadedForUid(uid);
      },
    );
    return () => unsub();
  }, [shouldSubscribe, uid]);

  return {
    proposals: shouldSubscribe ? proposals : [],
    isLoading: !authReady || (shouldSubscribe ? loadedForUid !== uid : false),
  };
}
