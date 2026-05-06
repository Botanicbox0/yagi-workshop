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
  			// Wave C v2 HIGH-6: Fraunces removed from build path. `display`
  			// token kept with Pretendard fallback so the deferred Cat B
  			// editorial surfaces (~25 hits in marketing/landing/journal/work)
  			// continue to resolve to a sans display family until a separate
  			// editorial-visual-identity wave addresses them per yagi-design-
  			// system v1.0 (Redaction 10/50 italic for EN, Pretendard 600 KO).
  			display: ["Pretendard Variable", "ui-sans-serif", "system-ui"],
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
  			// Phase 4.x Wave C.5b sub_00 ROLLBACK — yagi-design-system v1.0
  			// token vocabulary kept on a light editorial canvas. Colors
  			// resolve via CSS vars defined in globals.css so a future
  			// inverse section that opts into .dark gets the dark variants
  			// of the same names.
  			//
  			// Tailwind utilities: bg-sage / text-sage / bg-sage-soft /
  			// text-ink-primary / bg-surface-card-deep / border-edge-subtle.
  			sage: {
  				DEFAULT: 'var(--ds-sage)',
  				soft:    'var(--ds-sage-soft)',
  				ink:     'var(--ds-sage-ink)',
  			},
  			ink: {
  				primary:   'var(--ds-ink-primary)',
  				secondary: 'var(--ds-ink-secondary)',
  				tertiary:  'var(--ds-ink-tertiary)',
  				disabled:  'var(--ds-ink-disabled)',
  				muted:     'var(--ds-ink-muted)',
  			},
  			surface: {
  				base:        'var(--ds-bg-base)',
  				raised:      'var(--ds-bg-raised)',
  				card:        'var(--ds-bg-card)',
  				'card-deep': 'var(--ds-bg-card-deep)',
  				scrim:       'var(--ds-bg-scrim)',
  			},
  			edge: {
  				subtle: 'var(--ds-border-subtle)',
  				soft:   'var(--ds-border-soft)',
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
