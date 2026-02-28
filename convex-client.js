// This file manages the connection between your front-end and the Convex cloud database
import { ConvexHttpClient } from "https://esm.sh/convex/browser";

// Links to your specific Convex Database
export const convex = new ConvexHttpClient("https://steady-cassowary-239.convex.cloud");

// Example usage to replace localStorage in your other files:
/*
import { convex } from "./convex-client.js";

// Fetch all approved tools:
const tools = await convex.query("tools:getApprovedTools");

// Submit a new tool:
await convex.mutation("tools:createTool", {
    userId: window.Clerk.user.id,
    name: "New Tool",
    ...
});
*/
