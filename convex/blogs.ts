import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

export const createBlog = mutation({
    args: {
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
    },
    handler: async (ctx, args) => {
        let { imageUrl, ...rest } = args;

        // If the imageUrl is actually a storageId, convert it to a URL
        if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            const url = await ctx.storage.getUrl(imageUrl);
            if (url) imageUrl = url;
        }

        return await ctx.db.insert("blogs", { ...rest, imageUrl });
    }
});

export const getBlogs = query({
    args: {},
    handler: async (ctx) => {
        const blogs = await ctx.db.query("blogs").withIndex("by_timestamp").order("desc").collect();
        return Promise.all(blogs.map(async (blog) => {
            let imageUrl = blog.imageUrl;
            if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                const url = await ctx.storage.getUrl(imageUrl);
                if (url) imageUrl = url;
            }
            return { ...blog, imageUrl };
        }));
    }
});

export const getBlogBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const blog = await ctx.db
            .query("blogs")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();

        if (!blog) return null;

        let imageUrl = blog.imageUrl;
        if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            const url = await ctx.storage.getUrl(imageUrl);
            if (url) imageUrl = url;
        }

        let contentUrl = null;
        if (blog.contentStorageId) {
            contentUrl = await ctx.storage.getUrl(blog.contentStorageId);
        }

        return { ...blog, imageUrl, contentUrl };
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

export const updateBlog = mutation({
    args: {
        id: v.string(),
        title: v.optional(v.string()),
        slug: v.optional(v.string()),
        excerpt: v.optional(v.string()),
        content: v.optional(v.string()),
        contentStorageId: v.optional(v.string()),
        category: v.optional(v.string()),
        readTime: v.optional(v.number()),
        imageUrl: v.optional(v.string()),
        timestamp: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const blog = await ctx.db
            .query("blogs")
            .filter(q => q.eq(q.field("id"), id))
            .first();
        if (blog) {
            if (updates.imageUrl && !updates.imageUrl.startsWith('http') && !updates.imageUrl.startsWith('data:')) {
                const url = await ctx.storage.getUrl(updates.imageUrl);
                if (url) updates.imageUrl = url;
            }
            await ctx.db.patch(blog._id, updates);
        } else {
            throw new Error("Blog not found");
        }
    }
});
