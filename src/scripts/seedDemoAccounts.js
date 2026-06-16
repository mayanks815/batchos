const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path = require('path');

// Resolve path to service account key relative to src/scripts
const serviceAccountPath = path.resolve(__dirname, '../lib/firebase-admin.json');
const serviceAccount = require(serviceAccountPath);

// Initialize Admin SDK
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const auth = getAuth();
const db = getFirestore();

async function createOrUpdateUser(email, password, displayName, role, extraFields) {
  let userRecord;
  try {
    // Check if user already exists
    userRecord = await auth.getUserByEmail(email);
    console.log(`User ${email} already exists in Auth. Updating password and name...`);
    userRecord = await auth.updateUser(userRecord.uid, {
      password: password,
      displayName: displayName
    });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log(`User ${email} does not exist in Auth. Creating...`);
      userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: displayName,
        emailVerified: true
      });
    } else {
      throw error;
    }
  }

  // Create or update Firestore user document
  const userRef = db.collection('users').doc(userRecord.uid);
  const docData = {
    uid: userRecord.uid,
    name: displayName,
    email: email,
    role: role,
    createdAt: FieldValue.serverTimestamp(),
    completedTasks: [],
    ...extraFields
  };

  await userRef.set(docData, { merge: true });
  console.log(`Successfully synced Firestore user document for ${email} (UID: ${userRecord.uid})`);
}

async function main() {
  try {
    console.log("Seeding Demo Admin...");
    await createOrUpdateUser(
      'admin@batchos.test',
      'BatchOS@Admin123',
      'Test Admin',
      'admin',
      {
        semester: 'MBA Sem 3',
        specialization: 'Finance & Analytics',
        subjects: ['Corporate Finance', 'Investment Analysis']
      }
    );

    console.log("\nSeeding Demo Student...");
    await createOrUpdateUser(
      'student@batchos.test',
      'BatchOS@Student123',
      'Test Student',
      'student',
      {
        rollNo: 'MBA001',
        rollNumber: 'MBA001', // for compatibility
        section: 'A', // standard section
        semester: 'MBA Sem 3',
        specialization: 'Finance & Analytics',
        subjects: ['Corporate Finance', 'Investment Analysis']
      }
    );

    console.log("\nDemo Accounts seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed with error:", err);
    process.exit(1);
  }
}

main();
