import adapter from "@sveltejs/adapter-node";
import { config as dotenvConfig } from "dotenv";

// Load environment variables so we can access ORIGIN
dotenvConfig();

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        adapter: adapter({
            out: "build",
        }),
        csrf: {
            trustedOrigins: process.env.ORIGIN ? [process.env.ORIGIN] : [],
        },
    },
};

export default config;
