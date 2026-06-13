"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { firestore } from "@/lib/firebase/firestore";
import { toIsoString } from "@/lib/firestore-utils";
import type { Proposal, WithId } from "@/lib/definitions";

export function useProposals(userId?: string) {
  const [proposals, setProposals] = useState<WithId<Proposal>[]>([]);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const shouldSubscribe = Boolean(userId);

  useEffect(() => {
    if (!shouldSubscribe || !userId) return;

    const q = query(
      collection(firestore, "proposals"),
      where("userId", "==", userId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((docSnap) => {
          const data = docSnap.data() as Omit<Proposal, "id">;
          return {
            ...data,
            id: docSnap.id,
            createdAt: toIsoString(data.createdAt),
            amount: data.amount || 0,
          };
        });
        rows.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        );
        setProposals(rows);
        setLoadedForUserId(userId);
      },
      () => {
        setProposals([]);
        setLoadedForUserId(userId);
      },
    );
    return () => unsub();
  }, [shouldSubscribe, userId]);

  return {
    proposals: shouldSubscribe ? proposals : [],
    isLoading: shouldSubscribe ? loadedForUserId !== userId : false,
  };
}
