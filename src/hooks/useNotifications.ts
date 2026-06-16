"use client";

import { useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { useAuth } from "@/store/AuthContext";
import { toast } from "sonner";

let listenerAttached = false;

export function useNotifications() {
    const { user } = useAuth();

    useEffect(() => {
        let isMounted = true;

        const setupNotifications = async () => {
            try {
                if (!user) return;

                // Check browser support
                const supported = await isSupported();
                if (!supported) {
                    console.log("FCM not supported in this browser");
                    return;
                }

                // Check notifications API
                if (!("Notification" in window)) {
                    console.log("Notifications not supported");
                    return;
                }

                // Ask for permission
                const permission = await Notification.requestPermission();

                console.log("Notification permission status:", permission);

                if (permission !== "granted") {
                    console.log("Permission denied");
                    return;
                }

                // Safety check: Prevent duplicate service worker registrations
                let registration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
                if (!registration) {
                    registration = await navigator.serviceWorker.register(
                        "/firebase-messaging-sw.js"
                    );
                    console.log("Service Worker registered successfully:", registration);
                } else {
                    console.log("Service Worker already registered:", registration);
                }

                // Ensure the service worker is active before requesting the FCM token
                const awaitActiveSW = (reg: ServiceWorkerRegistration) => {
                    return new Promise<void>((resolve) => {
                        if (reg.active) {
                            resolve();
                            return;
                        }
                        const worker = reg.installing || reg.waiting;
                        if (worker) {
                            const onStateChange = () => {
                                if (worker.state === "activated") {
                                    worker.removeEventListener("statechange", onStateChange);
                                    resolve();
                                }
                            };
                            worker.addEventListener("statechange", onStateChange);
                        } else {
                            resolve();
                        }
                    });
                };

                await awaitActiveSW(registration);

                if (!isMounted) return;

                const messaging = getMessaging();

                // Generate token
                const token = await getToken(messaging, {
                    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
                    serviceWorkerRegistration: registration,
                });

                if (token) {
                    await updateDoc(doc(db, "users", user.uid), {
                        fcmToken: token,
                    });

                    console.log("FCM Token saved successfully:", token);

                    if (!listenerAttached) {
                        listenerAttached = true;
                        onMessage(messaging, (payload) => {
                            console.log("Foreground message received:", payload);

                            const title =
                                payload.notification?.title ||
                                payload.data?.title ||
                                "BatchOS";

                            const body =
                                payload.notification?.body ||
                                payload.data?.body ||
                                "New update";

                            toast(title, {
                                description: body,
                                action: {
                                    label: "Open",
                                    onClick: () => {
                                        const link =
                                            payload.data?.link || "/dashboard";

                                        window.location.href = link;
                                    },
                                },
                            });
                        });
                    }
                } else {
                    console.log("No FCM token generated");
                }
            } catch (error) {
                console.error("Error retrieving FCM token:", error);
            }
        };

        setupNotifications();

        return () => {
            isMounted = false;
        };
    }, [user]);
}