/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5B4FE9',
          light: '#EEF2FF',
          dark: '#4338CA',
        },
        secondary: {
          DEFAULT: '#10B981',
          light: '#ECFDF5',
        },
        tertiary: {
          DEFAULT: '#F59E0B',
          light: '#FFFBEB',
        },
        error: {
          DEFAULT: '#EF4444',
          light: '#FEF2F2',
        },
        neutral: {
          900: '#111827',
          600: '#4B5563',
          300: '#D1D5DB',
          100: '#F3F4F6',
        },
        platform: {
          ebay: '#0064D2',
          facebook: '#1877F2',
          poshmark: '#C13584',
          offerup: '#FF6900',
        },
      },
      fontFamily: {
        'jakarta': ['PlusJakartaSans_700Bold', 'PlusJakartaSans_600SemiBold'],
        'inter': ['Inter_400Regular', 'Inter_500Medium'],
      },
      borderRadius: {
        pill: '9999px',
        card: '12px',
      },
    },
  },
  plugins: [],
};
