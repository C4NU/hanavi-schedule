declare module 'next-pwa' {
    import { NextConfig } from 'next';

    export default function withPWA(config: {
        dest?: string;
        disable?: boolean;
        register?: boolean;
        scope?: string;
        sw?: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any;
    }): (nextConfig: NextConfig) => NextConfig;
}
