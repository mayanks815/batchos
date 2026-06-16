import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!getApps().length) {
    if (projectId && clientEmail && privateKey) {
        initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey: privateKey.replace(/\\n/g, "\n"),
            }),
        });
    } else {
        console.warn("Firebase Admin credentials not found. Initializing dummy app configuration for build safety.");
        initializeApp({
            projectId: "dummy-project-id",
        });
    }
}

export const adminDb = getFirestore();
export const adminMessaging = getMessaging();