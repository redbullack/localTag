import type { Config } from "tailwindcss";

export default {
    content: [
        "./renderer/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./renderer/components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
} satisfies Config;
