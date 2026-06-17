/**
 * Seeds Auth + Firestore (riverdb) for Sales Portal BDD and local QA.
 * Run inside: firebase emulators:exec --only functions,firestore,auth
 */
const path = require("path");
const admin = require(path.join(__dirname, "functions/node_modules/firebase-admin"));
const { getFirestore } = require(path.join(
  __dirname,
  "functions/node_modules/firebase-admin/firestore",
));

const PROJECT_ID = "aquaflow-management-suite";
const FIRESTORE_DB = "riverdb";

process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";

/** @type {const} */
const TEST_PASSWORD = "SalesPortalTest1!";

/** @type {Array<{ uid: string; email: string; role: "sales" | "manager" | "admin"; displayName: string; team?: string; location?: string }>} */
const TEST_USERS = [
  {
    uid: "sp-test-sales-001",
    email: "sales.portal.test@example.com",
    role: "sales",
    displayName: "Test Sales Rep",
    team: "Alpha",
  },
  {
    uid: "sp-test-manager-001",
    email: "manager.portal.test@example.com",
    role: "manager",
    displayName: "Test Manager",
    location: "Manila",
  },
  {
    uid: "sp-test-admin-001",
    email: "admin.portal.test@example.com",
    role: "admin",
    displayName: "Test Admin",
  },
];

async function ensureAuthUser(user) {
  try {
    await admin.auth().getUser(user.uid);
    await admin.auth().updateUser(user.uid, {
      email: user.email,
      password: TEST_PASSWORD,
      displayName: user.displayName,
      emailVerified: true,
    });
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      await admin.auth().createUser({
        uid: user.uid,
        email: user.email,
        password: TEST_PASSWORD,
        displayName: user.displayName,
        emailVerified: true,
      });
      return;
    }
    throw error;
  }
}

async function seedFirestoreUser(db, user) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection("users").doc(user.uid).set(
    {
      email: user.email,
      displayName: user.displayName,
      appAccess: [
        {
          appId: "sales-portal",
          role: user.role,
          onboardingComplete: true,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  await db
    .collection("sales")
    .doc(user.uid)
    .set(
      {
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        team: user.team ?? null,
        location: user.location ?? null,
        onboardingCompleted: true,
        updatedAt: now,
      },
      { merge: true },
    );
}

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROJECT_ID });
  }

  const db = getFirestore(admin.app(), FIRESTORE_DB);

  for (const user of TEST_USERS) {
    await ensureAuthUser(user);
    await seedFirestoreUser(db, user);
  }

  console.log("Sales Portal emulator seed complete:");
  for (const user of TEST_USERS) {
    console.log(`  ${user.role}: ${user.email} / ${TEST_PASSWORD}`);
  }
}

main().catch((error) => {
  console.error("Sales Portal emulator seed failed:", error);
  process.exit(1);
});
