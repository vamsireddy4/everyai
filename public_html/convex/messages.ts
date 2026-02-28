import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const sendMessage = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        subject: v.string(),
        message: v.string(),
        timestamp: v.string(),
    },
    handler: async (ctx, args) => {
        const messageId = await ctx.db.insert("messages", {
            ...args
        });
        return messageId;
    },
});

export const getMessages = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("messages").withIndex("by_timestamp").order("desc").collect();
    },
});
export const deleteMessage = mutation({
    args: { id: v.id("messages") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

export const getMessage = query({
    args: { id: v.id("messages") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
