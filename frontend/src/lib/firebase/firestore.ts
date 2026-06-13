import { getFirestore } from "firebase/firestore";
import { firebaseApp } from "./app";

const databaseId = process.env.NEXT_PUBLIC_FIRESTORE_DB || "riverdb";

export const firestore = getFirestore(firebaseApp, databaseId);
