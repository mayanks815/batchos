import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminMessaging } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, body: notificationBody, subject, type, link, audience } = body;

        if (!title || !notificationBody || !type || !link || !audience) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        let tokens: string[] = [];
        let targetUsersCount = 0;

        if (audience === "all") {
            const usersSnapshot = await adminDb.collection("users").get();
            targetUsersCount = usersSnapshot.size;
            tokens = usersSnapshot.docs
                .map(doc => doc.data().fcmToken)
                .filter((token): token is string => typeof token === "string" && token.trim() !== "");
        } else if (audience === "subject") {
            if (!subject) {
                return NextResponse.json(
                    { success: false, error: "Subject is required for subject-specific audience" },
                    { status: 400 }
                );
            }
            const usersSnapshot = await adminDb
                .collection("users")
                .where("subjects", "array-contains", subject)
                .get();
            targetUsersCount = usersSnapshot.size;
            tokens = usersSnapshot.docs
                .map(doc => doc.data().fcmToken)
                .filter((token): token is string => typeof token === "string" && token.trim() !== "");
        } else if (audience === "self") {
            const { uid } = body;
            if (!uid) {
                return NextResponse.json(
                    { success: false, error: "UID is required for self audience" },
                    { status: 400 }
                );
            }
            const userDoc = await adminDb.collection("users").doc(uid).get();
            targetUsersCount = userDoc.exists ? 1 : 0;
            if (userDoc.exists) {
                const fcmToken = userDoc.data()?.fcmToken;
                if (typeof fcmToken === "string" && fcmToken.trim() !== "") {
                    tokens = [fcmToken];
                }
            }
        } else {
            return NextResponse.json(
                { success: false, error: "Invalid audience type" },
                { status: 400 }
            );
        }

        console.log(`[Notification API] Target users found: ${targetUsersCount}`);
        console.log(`[Notification API] FCM tokens found: ${tokens.length}`);

        if (tokens.length === 0) {
            return NextResponse.json({
                success: true,
                sent: 0,
            });
        }

        const response = await adminMessaging.sendEachForMulticast({
            tokens: tokens,
            notification: {
                title: title,
                body: notificationBody,
            },
            webpush: {
                notification: {
                    title: title,
                    body: notificationBody,
                    icon: "/batchos-logo.png",
                },
            },
            data: {
                type: type,
                link: link,
            },
        });

        console.log(`[Notification API] Success count: ${response.successCount}`);
        console.log(`[Notification API] Failure count: ${response.failureCount}`);

        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`[Notification API] Failed to send to token ${tokens[idx]}:`, resp.error);
                }
            });
        }

        return NextResponse.json({
            success: true,
            sent: response.successCount,
        });

    } catch (error: any) {
        console.error("[Notification API] Error occurred:", error);
        return NextResponse.json(
            { success: false, error: error.message || error },
            { status: 500 }
        );
    }
}
