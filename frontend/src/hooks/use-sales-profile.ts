"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/auth";
import { firestore } from "@/lib/firebase/firestore";
import type { UserProfile } from "@/lib/definitions";

export function useSalesProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoadedForUid, setProfileLoadedForUid] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
      if (!user) {
        setProfile(null);
        setProfileLoadedForUid(null);
      }
      setAuthReady(true);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!uid) return;

    const ref = doc(firestore, "sales", uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setProfile(null);
        } else {
          setProfile({ id: snap.id, ...(snap.data() as Omit<UserProfile, "id">) });
        }
        setProfileLoadedForUid(uid);
      },
      () => {
        setProfile(null);
        setProfileLoadedForUid(uid);
      },
    );
    return () => unsub();
  }, [uid]);

  const loading = !authReady || (uid ? profileLoadedForUid !== uid : false);

  return {
    profile,
    uid,
    loading,
    isManager: profile?.role === "manager",
    isAdmin: profile?.role === "admin",
  };
}
