import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getProfile = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();
    }
});

export const updateProfile = mutation({
    args: {
        userId: v.string(),
        name: v.string(),
        email: v.optional(v.string()),
        bio: v.optional(v.string()),
        avatar: v.optional(v.string()),
        website: v.optional(v.string()),
        twitter: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                name: args.name,
                email: args.email,
                bio: args.bio,
                avatar: args.avatar,
                website: args.website,
                twitter: args.twitter,
            });
        } else {
            await ctx.db.insert("profiles", args);
        }
    }
});
