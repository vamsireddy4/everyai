import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const postComment = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        website: v.optional(v.string()),
        comment: v.string(),
        blogSlug: v.optional(v.string()),
        blogTitle: v.optional(v.string()),
        timestamp: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("comments", { ...args });
    },
});

export const getComments = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("comments").withIndex("by_timestamp").order("desc").collect();
    },
});

export const getCommentsBySlug = query({
    args: { blogSlug: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db.query("comments").withIndex("by_slug", q => q.eq("blogSlug", args.blogSlug)).order("desc").collect();
    },
});

export const deleteComment = mutation({
    args: { id: v.id("comments") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

export const replyToComment = mutation({
    args: { id: v.id("comments"), adminReply: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { adminReply: args.adminReply });
    },
});

export const getComment = query({
    args: { id: v.id("comments") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
