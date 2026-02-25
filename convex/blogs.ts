import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createBlog = mutation({
    args: {
        id: v.string(),
        title: v.string(),
        slug: v.string(),
        excerpt: v.string(),
        content: v.string(),
        category: v.string(),
        readTime: v.number(),
        imageUrl: v.string(),
        timestamp: v.string()
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("blogs", args);
    }
});

export const getBlogs = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("blogs").order("desc").collect();
    }
});

export const getBlogBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("blogs")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();
    }
});

export const deleteBlog = mutation({
    args: { id: v.string() },
    handler: async (ctx, args) => {
        const blog = await ctx.db
            .query("blogs")
            .filter(q => q.eq(q.field("id"), args.id))
            .first();
        if (blog) {
            await ctx.db.delete(blog._id);
        }
    }
});
