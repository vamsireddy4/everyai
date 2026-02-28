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
        planType: v.optional(v.string()), // "free" or "paid"
        transactionId: v.optional(v.string()),
        email: v.string(),
        phone: v.optional(v.string()),
        social: v.optional(v.string()),
        partnership: v.optional(v.string()),
        status: v.string(), // "pending", "approved", "declined"
        timestamp: v.string(),
        bannerUrl: v.optional(v.string()),
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
        content: v.optional(v.string()),
        contentStorageId: v.optional(v.string()),
        category: v.string(),
        readTime: v.number(),
        imageUrl: v.string(),
        timestamp: v.string()
    }).index("by_slug", ["slug"])
        .index("by_timestamp", ["timestamp"]),

    // ── Analytics: Bucketed for performance and separated by type ──────
    analytics: defineTable({
        type: v.string(), // "website" or "blog"
        bucket: v.number(), // Start of the hour (ms)
        count: v.number(),
    }).index("by_type_bucket", ["type", "bucket"]),

    prompts: defineTable({
        title: v.string(),
        content: v.string(),
        category: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        videoUrl: v.optional(v.string()),
        timestamp: v.string(),
    }).index("by_timestamp", ["timestamp"]),

    messages: defineTable({
        name: v.string(),
        email: v.string(),
        subject: v.string(),
        message: v.string(),
        timestamp: v.string(),
    }).index("by_timestamp", ["timestamp"]),

    comments: defineTable({
        name: v.string(),
        email: v.string(),
        website: v.optional(v.string()),
        comment: v.string(),
        blogSlug: v.optional(v.string()),
        blogTitle: v.optional(v.string()),
        adminReply: v.optional(v.string()),
        timestamp: v.string(),
    }).index("by_timestamp", ["timestamp"])
        .index("by_slug", ["blogSlug"])
});

