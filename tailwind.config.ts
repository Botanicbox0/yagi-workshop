import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ["Pretendard Variable", "var(--font-inter)", "ui-sans-serif", "system-ui"],
  			display: ["var(--font-fraunces)", "Pretendard Variable", "ui-serif", "Georgia"],
  			suit: ["var(--font-suit)", "Pretendard Variable", "ui-sans-serif", "system-ui"],
  			// Phase 4.x Wave C.5b sub_00 — yagi-design-system v1.0 font tokens.
  			// `body`/`display-ds`/`accent-ds` resolve via CSS vars so [lang="en"]
  			// can swap families (Pretendard ↔ Geist/Redaction) without touching JSX.
  			"body-ds":    ["var(--ds-font-body)"],
  			"display-ds": ["var(--ds-font-display)"],
  			"accent-ds":  ["var(--ds-font-accent)"],
  			"mono-ds":    ["var(--ds-font-mono)"],
  			pretendard:   ["Pretendard Variable", "Pretendard", "system-ui", "sans-serif"],
  			geist:        ["Geist Variable", "Geist", "system-ui", "sans-serif"],
  			mona12:       ["Mona12", "Pretendard Variable", "monospace"],
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			// v1.0 explicit scale — radius-pill / radius-card etc.
  			pill: '999px',
  			card: '24px',
  			button: '12px',
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: 'hsl(var(--destructive))',
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				foreground: 'hsl(var(--info-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			// Phase 4.x Wave C.5b sub_00 — yagi-design-system v1.0 token surface.
  			// Tailwind utilities: bg-sage / text-sage / bg-sage-soft etc.
  			sage: {
  				DEFAULT: '#71D083',
  				soft:    'rgba(113, 208, 131, 0.12)',
  			},
  			ink: {
  				primary:   '#EEEEEE',
  				secondary: '#B4B4B4',
  				tertiary:  '#7B7B7B',
  				disabled:  'rgba(238, 238, 238, 0.33)',
  				muted:     'rgba(238, 238, 238, 0.35)',
  			},
  			surface: {
  				base:      '#000000',
  				raised:    'rgba(25, 25, 25, 0.9)',
  				card:      'rgba(255, 255, 255, 0.10)',
  				'card-deep':'rgba(255, 255, 255, 0.05)',
  				scrim:     'rgba(0, 0, 0, 0.35)',
  			},
  			edge: {
  				subtle: 'rgba(255, 255, 255, 0.11)',
  				soft:   'rgba(255, 255, 255, 0.06)',
  			},
  			inverse: {
  				bg:  '#FFFFFF',
  				ink: 'rgba(0, 0, 0, 0.95)',
  			},
  		},
  		fontSize: {
  			'11': ['11px', { lineHeight: '1.0' }],
  			'12': ['12px', { lineHeight: '1.37' }],
  			'14': ['14px', { lineHeight: '1.37' }],
  			'16': ['16px', { lineHeight: '1.37' }],
  			'20': ['20px', { lineHeight: '1.37' }],
  			'22': ['22px', { lineHeight: '1.20' }],
  			'30': ['30px', { lineHeight: '1.20', letterSpacing: '-0.02em' }],
  			'42': ['42px', { lineHeight: 'var(--ds-lh-display)', letterSpacing: 'var(--ds-ls-display)' }],
  			'50': ['50px', { lineHeight: 'var(--ds-lh-display)', letterSpacing: 'var(--ds-ls-display)' }],
  			'60': ['60px', { lineHeight: '1.10', letterSpacing: '-0.025em' }],
  			'80': ['80px', { lineHeight: 'var(--ds-lh-display)', letterSpacing: 'var(--ds-ls-display)' }],
  		},
  		letterSpacing: {
  			'display-en': '-0.03em',
  			'display-ko': '-0.01em',
  			'heading':    '-0.02em',
  			'label':       '0.03em',
  		},
  		lineHeight: {
  			'display-en': '1.0',
  			'display-ko': '1.18',
  			'heading':    '1.20',
  			'body':       '1.37',
  			'tight-1':    '1.0',
  		},
  		boxShadow: {
  			'subtle': '0 0.75px 0.75px -0.4px rgba(0, 0, 0, 0.13)',
  		},
  		transitionDuration: {
  			DEFAULT: '400ms',
  			'flora': '400ms',
  		},
  		transitionTimingFunction: {
  			DEFAULT:  'cubic-bezier(0.45, 0, 0, 1)',
  			'flora':  'cubic-bezier(0.45, 0, 0, 1)',
  			'expo-out': 'cubic-bezier(0.45, 0, 0, 1)',
  		},
  		maxWidth: {
  			'narrow':  '720px',
  			'content': '1280px',
  			'cinema':  '1600px',
  		},
  		backdropBlur: {
  			'nav': '12px',
  		},
  		spacing: {
  			'128': '128px',
  		},
  	}
  },
  plugins: [tailwindcssAnimate],
};

export default config;
