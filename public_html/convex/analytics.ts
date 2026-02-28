import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── recordVisit ───────────────────────────────────────────────────────────────
// Automatically merges multiple rows into a single row per type ("website" or "blog")
export const recordVisit = mutation({
    args: {
        type: v.string(),
    },
    handler: async (ctx, args) => {
        // Find ALL rows for this type
        const allRows = await ctx.db
            .query("analytics")
            .withIndex("by_type_bucket", q => q.eq("type", args.type))
            .collect();

        if (allRows.length > 1) {
            // MERGE: multiple rows found, consolidate them
            const totalCount = allRows.reduce((sum, row) => sum + row.count, 0);

            // Delete all old rows
            for (const row of allRows) {
                await ctx.db.delete(row._id);
            }

            // Create fresh consolidated row
            await ctx.db.insert("analytics", {
                type: args.type,
                bucket: Date.now(),
                count: totalCount + 1
            });
        } else if (allRows.length === 1) {
            // NORMAL: just one row, increment it
            await ctx.db.patch(allRows[0]._id, {
                count: allRows[0].count + 1,
                bucket: Date.now()
            });
        } else {
            // EMPTY: first visit of this type
            await ctx.db.insert("analytics", {
                type: args.type,
                bucket: Date.now(),
                count: 1
            });
        }
    }
});

// ── getChartData ──────────────────────────────────────────────────────────────
export const getChartData = query({
    args: {
        type: v.string(),
        startTime: v.number(),
        endTime: v.number(),
    },
    handler: async (ctx, args) => {
        const row = await ctx.db
            .query("analytics")
            .withIndex("by_type_bucket", q => q.eq("type", args.type))
            .first();

        if (!row) return [];
        return [{ t: Date.now(), c: row.count }];
    }
});

// ── getMetrics ────────────────────────────────────────────────────────────────
export const getMetrics = query({
    args: {
        type: v.string(),
        range: v.string(),
    },
    handler: async (ctx, args) => {
        const row = await ctx.db
            .query("analytics")
            .withIndex("by_type_bucket", q => q.eq("type", args.type))
            .first();

        const count = row ? row.count : 0;

        return {
            total: count,
            trend: "0.0",
            activeNow: count > 0 ? 1 : 0
        };
    }
});

// ── clearAnalytics ────────────────────────────────────────────────────────────
export const clearAnalytics = mutation({
    args: {},
    handler: async (ctx) => {
        const all = await ctx.db.query("analytics").collect();
        for (const row of all) {
            await ctx.db.delete(row._id);
        }
        return { success: true };
    }
});
