import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const sendAdminNotification = internalAction({
    args: {
        name: v.string(),
        url: v.string(),
        description: v.string(),
        email: v.string(),
    },
    handler: async (ctx, args) => {
        const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
        const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
        const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
        const ADMIN_EMAIL = "everyai.com@gmail.com";

        if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
            console.error("Gmail environment variables are not set in Convex.");
            return;
        }

        try {
            // 1. Get Access Token from Refresh Token
            const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    refresh_token: REFRESH_TOKEN,
                    grant_type: "refresh_token",
                }),
            });

            const tokenData = await tokenResponse.json();
            const { access_token } = tokenData;

            if (!access_token) {
                console.error("Failed to obtain access token from Google. Token Data:", tokenData);
                throw new Error("Failed to obtain access token from Google.");
            }

            // 2. Construct the Email (Simple RFC822 format)
            const subject = `New Tool Submission: ${args.name}`;
            const body = `
        Hello Admin,
        
        A new tool has been submitted to EveryAI.
        
        Tool Name: ${args.name}
        Website: ${args.url}
        Submitter Email: ${args.email}
        
        Description:
        ${args.description}
        
        Review this in the admin dashboard.
      `.trim();

            const message = [
                `To: ${ADMIN_EMAIL}`,
                `Subject: ${subject}`,
                "Content-Type: text/plain; charset=utf-8",
                "",
                body,
            ].join("\r\n");

            // 3. Send via Gmail API (Base64URL Safe encoding)
            // Using a helper to ensure compatibility in Convex isolate (no Buffer)
            const base64 = btoa(unescape(encodeURIComponent(message)));
            const encodedMessage = base64
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "");

            const sendResponse = await fetch(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ raw: encodedMessage }),
                }
            );

            if (!sendResponse.ok) {
                const errorData = await sendResponse.json();
                console.error("Gmail API Error:", errorData);
                throw new Error("Failed to send email via Gmail API.");
            }

            console.log(`Notification sent for ${args.name}`);
        } catch (err) {
            console.error("Failed to send admin notification:", err);
        }
    },
});
