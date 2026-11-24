import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
    dest: "public",
    disable: process.env.NODE_ENV === "development",
    workboxOptions: {
        runtimeCaching: [
            {
                urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname === '/api/proxy/image',
                handler: 'CacheFirst',
                options: {
                    cacheName: 'profile-images',
                    cacheableResponse: { statuses: [200] },
                    expiration: { maxEntries: 40, maxAgeSeconds: 7 * 24 * 60 * 60, purgeOnQuotaError: true },
                },
            },
            {
                urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
                handler: 'CacheFirst',
                options: {
                    cacheName: 'images',
                    expiration: {
                        maxEntries: 50,
                        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
                    },
                },
            }
        ],
    },
});

const nextConfig: NextConfig = {
    env: {
        NEXT_PUBLIC_SCHEDULE_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
            || process.env.NEXT_PUBLIC_SCHEDULE_BUILD_ID
            || '',
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    output: "standalone",
};

export default withPWA(nextConfig);
