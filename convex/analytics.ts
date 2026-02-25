import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── recordVisit ───────────────────────────────────────────────────────────────
// Accepts BOTH the new format { bucket } AND the old format { page, referrer, userAgent }
// so cached/old frontend code still records traffic correctly.
// Upserts into the current hour-bucket row — one row per hour, forever.
export const recordVisit = mutation({
    args: {
        // New format (browser sends local-timezone bucket key)
        bucket: v.optional(v.string()),
        // Old/legacy format — still accepted for backward compat
        page: v.optional(v.string()),
        referrer: v.optional(v.string()),
        userAgent: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Resolve bucket key
        let bucketKey = args.bucket;
        if (!bucketKey) {
            // Fall back: derive from server UTC time (close enough for hourly buckets)
            const now = new Date();
            const pad = (n: number) => String(n).padStart(2, '0');
            bucketKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}`;
        }

        // Upsert: find the existing hour row and increment, or create a new one
        const existing = await ctx.db
            .query("analytics")
            .withIndex("by_bucket", q => q.eq("bucket", bucketKey!))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                count: existing.count + 1,
                updatedAt: Date.now()
            });
        } else {
            await ctx.db.insert("analytics", {
                bucket: bucketKey,
                count: 1,
                updatedAt: Date.now()
            });
        }
    }
});

// ── getChartData ──────────────────────────────────────────────────────────────
// Returns all bucket rows in a date range for the chart.
export const getChartData = query({
    args: {
        startBucket: v.string(), // e.g. "2026-02-25T00"
        endBucket: v.string(),   // e.g. "2026-02-25T23"
    },
    handler: async (ctx, args) => {
        const rows = await ctx.db
            .query("analytics")
            .withIndex("by_bucket", q =>
                q.gte("bucket", args.startBucket).lte("bucket", args.endBucket)
            )
            .collect();
        return rows.map(r => ({ bucket: r.bucket, count: r.count }));
    }
});

// ── getMetrics ────────────────────────────────────────────────────────────────
// Returns totals, trend, and activeNow for the stat cards.
export const getMetrics = query({
    args: {
        range: v.string(),
    },
    handler: async (ctx, args) => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const bucketKey = (d: Date) => `${dateStr(d)}T${pad(d.getHours())}`;

        let startBucket: string, endBucket: string;
        let prevStartBucket: string, prevEndBucket: string;

        if (args.range === 'daily') {
            const today = dateStr(now);
            startBucket = `${today}T00`;
            endBucket = `${today}T23`;
            const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
            const yest = dateStr(yesterday);
            prevStartBucket = `${yest}T00`;
            prevEndBucket = `${yest}T23`;

        } else if (args.range === 'weekly') {
            const sun = new Date(now); sun.setHours(0, 0, 0, 0);
            sun.setDate(now.getDate() - now.getDay());
            const sat = new Date(sun); sat.setDate(sun.getDate() + 6); sat.setHours(23);
            startBucket = bucketKey(sun);
            endBucket = bucketKey(sat);
            const prevSun = new Date(sun); prevSun.setDate(sun.getDate() - 7);
            const prevSat = new Date(prevSun); prevSat.setDate(prevSun.getDate() + 6); prevSat.setHours(23);
            prevStartBucket = bucketKey(prevSun);
            prevEndBucket = bucketKey(prevSat);

        } else if (args.range === 'monthly') {
            const first = new Date(now.getFullYear(), now.getMonth(), 1, 0);
            const last = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23);
            startBucket = bucketKey(first);
            endBucket = bucketKey(last);
            const pFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0);
            const pLast = new Date(now.getFullYear(), now.getMonth(), 0, 23);
            prevStartBucket = bucketKey(pFirst);
            prevEndBucket = bucketKey(pLast);

        } else {
            // yearly
            const first = new Date(now.getFullYear(), 0, 1, 0);
            const last = new Date(now.getFullYear(), 11, 31, 23);
            startBucket = bucketKey(first);
            endBucket = bucketKey(last);
            const pFirst = new Date(now.getFullYear() - 1, 0, 1, 0);
            const pLast = new Date(now.getFullYear() - 1, 11, 31, 23);
            prevStartBucket = bucketKey(pFirst);
            prevEndBucket = bucketKey(pLast);
        }

        const rows = await ctx.db
            .query("analytics")
            .withIndex("by_bucket", q => q.gte("bucket", startBucket).lte("bucket", endBucket))
            .collect();

        const prevRows = await ctx.db
            .query("analytics")
            .withIndex("by_bucket", q => q.gte("bucket", prevStartBucket).lte("bucket", prevEndBucket))
            .collect();

        const count = rows.reduce((s, r) => s + r.count, 0);
        const prevCount = prevRows.reduce((s, r) => s + r.count, 0);

        let trend = 0;
        if (prevCount > 0) trend = ((count - prevCount) / prevCount) * 100;
        else if (count > 0) trend = 100;

        const currentBucket = bucketKey(now);
        const activeRow = rows.find(r => r.bucket === currentBucket);
        const activeNow = activeRow ? activeRow.count : 0;

        return {
            total: count,
            trend: trend.toFixed(1),
            activeNow
        };
    }
});
