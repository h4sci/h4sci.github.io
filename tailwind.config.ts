/** @type {import('tailwindcss').Config} */
import themer from "@tailus/themer";

module.exports = {
    content: [
        './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
        "./node_modules/@tailus/themer-**/dist/**/*.{js,ts}"
    ],
    // sets actual colors to light or dark (not just button)
    darkMode: 'class',
    plugins: [
        themer({
            palette: {
                extend: "oz",
            },
            radius: "smoothest",
            background: "light",
            border: "light",
            padding: "large"
        })
    ],
};
