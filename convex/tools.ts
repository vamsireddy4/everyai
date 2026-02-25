import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const createTool = mutation({
    args: {
        userId: v.string(),
        name: v.string(),
        url: v.string(),
        description: v.string(),
        features: v.string(),
        category: v.string(),
        subcategory: v.string(),
        partnership: v.string(),
        transactionId: v.optional(v.string()),
        email: v.string(),
        phone: v.optional(v.string()),
        social: v.optional(v.string()),
        status: v.string(),
        timestamp: v.string(),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("tools", args);

        /* 
        // Trigger admin email notification via Convex Action (Temporarily Disabled)
        await ctx.scheduler.runAfter(0, internal.notifications.sendAdminNotification, {
            name: args.name,
            url: args.url,
            description: args.description,
            email: args.email
        });
        */

        return id;
    }
});

export const getApprovedTools = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("tools")
            .withIndex("by_status", (q) => q.eq("status", "approved"))
            .order("desc")
            .collect();
    }
});

export const getAllTools = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("tools").order("desc").collect();
    }
});

export const updateToolStatus = mutation({
    args: { id: v.id("tools"), status: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: args.status });
    }
});

export const deleteTool = mutation({
    args: { id: v.id("tools") },
    handler: async (ctx, args) => {
        const doc = await ctx.db.get(args.id);
        if (!doc) {
            throw new Error("Tool not found in database. It may have already been deleted.");
        }
        await ctx.db.delete(args.id);
        return { success: true, deletedId: args.id };
    }
});
