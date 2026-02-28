import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createPrompt = mutation({
    args: {
        title: v.string(),
        content: v.string(),
        category: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        videoUrl: v.optional(v.string()),
        timestamp: v.string()
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("prompts", args);
    }
});

export const getPrompts = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("prompts").withIndex("by_timestamp").order("desc").collect();
    }
});

export const getPrompt = query({
    args: { id: v.id("prompts") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    }
});

export const deletePrompt = mutation({
    args: { id: v.id("prompts") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    }
});

// Troubleshooting: Added comment to force re-sync
export const updatePrompt = mutation({
    args: {
        id: v.id("prompts"),
        title: v.optional(v.string()),
        content: v.optional(v.string()),
        category: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        videoUrl: v.optional(v.string()),
        timestamp: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
    }
});
