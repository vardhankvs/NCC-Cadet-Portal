// tailwind.config.js
export default {
    darkMode: ['selector', '[data-theme="dark"]'],
    content: ['./index.html', './src_stable/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                'ncc-navy': '#0A1628',
                'ncc-navy-light': '#112240',
                'ncc-navy-mid': '#1B3A6B',
                'ncc-red': '#C0152A',
                'ncc-red-light': '#E8192E',
                'ncc-red-dark': '#8B0F1E',
                'ncc-gold': '#C9922A',
                'ncc-gold-light': '#F0B845',
                'ncc-gold-dark': '#9A6E1A',
                'ncc-cream': '#FAF6EF',
                'ncc-cream-dark': '#EDE7D9',
            },
            fontFamily: {
                display: ['"Playfair Display"', 'Georgia', 'serif'],
                body: ['"Source Sans 3"', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            boxShadow: {
                ncc: '0 4px 20px rgba(10,22,40,0.15)',
                'ncc-lg': '0 8px 40px rgba(10,22,40,0.25)',
                gold: '0 4px 20px rgba(201,146,42,0.3)',
            },
        },
    },
    plugins: [],
};
