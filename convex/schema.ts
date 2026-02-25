import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    tools: defineTable({
        userId: v.string(), // Clerk ID
        name: v.string(),
        url: v.string(),
        description: v.string(),
        features: v.string(),
        category: v.string(),
        subcategory: v.string(),
        partnership: v.string(), // "yes" or "no"
        transactionId: v.optional(v.string()),
        email: v.string(),
        phone: v.optional(v.string()),
        social: v.optional(v.string()),
        status: v.string(), // "pending", "approved", "declined"
        timestamp: v.string(),
    }).index("by_status", ["status"]),

    profiles: defineTable({
        userId: v.string(),
        name: v.string(),
        email: v.optional(v.string()),
        bio: v.optional(v.string()),
        avatar: v.optional(v.string()),
        website: v.optional(v.string()),
        twitter: v.optional(v.string())
    }).index("by_userId", ["userId"]),

    blogs: defineTable({
        id: v.string(),
        title: v.string(),
        slug: v.string(),
        excerpt: v.string(),
        content: v.string(),
        category: v.string(),
        readTime: v.number(),
        imageUrl: v.string(),
        timestamp: v.string()
    }).index("by_slug", ["slug"]),

    // ── Analytics: one row per hour-bucket, upserted on each visit ─────
    // bucket format: "YYYY-MM-DDTHH" in the visitor's LOCAL timezone
    // e.g. "2026-02-25T14" = 2pm on Feb 25 2026
    analytics: defineTable({
        bucket: v.string(),    // "YYYY-MM-DDTHH" local time
        count: v.number(),     // total visits in this hour
        updatedAt: v.number(), // last visit timestamp (ms)
    }).index("by_bucket", ["bucket"])
});
