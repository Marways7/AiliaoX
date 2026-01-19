/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Future Medical / SOTA Design System
      colors: {
        // 深邃黑底色
        obsidian: {
          DEFAULT: '#020204',
          50: '#1A1A1E',
          100: '#141418',
          200: '#0E0E11',
          300: '#0A0A0C',
          800: '#050506',
          900: '#020204',
          950: '#000000',
        },
        // 琉璃青高亮 - 核心行动点
        'cyan-ray': {
          DEFAULT: '#00F0FF',
          50: '#E0FFFF',
          100: '#B3FFFF',
          200: '#80FFFF',
          300: '#4DFFFF',
          400: '#1AFFFF',
          500: '#00F0FF',
          600: '#00C0CC',
          700: '#009099',
          800: '#006066',
          900: '#003033',
        },
        // 极光白 - 主标题
        starlight: {
          DEFAULT: '#FFFFFF',
          100: '#FFFFFF',
          200: '#FAFAFA',
          300: '#F5F5F5',
          400: '#E0E0E0',
          500: '#CCCCCC',
          600: '#999999',
        },
        // 兼容旧代码的 primary/secondary 定义 (映射到新色系)
        primary: {
          50: '#E0FFFF',
          100: '#B3FFFF',
          200: '#80FFFF',
          300: '#4DFFFF',
          400: '#1AFFFF',
          500: '#00F0FF', // Mapping cyan-ray as primary
          600: '#00C0CC',
          700: '#009099',
          800: '#006066',
          900: '#003033',
        },
        secondary: {
          50: '#F2F2F2',
          100: '#E6E6E6',
          200: '#CCCCCC',
          300: '#B3B3B3',
          400: '#999999',
          500: '#808080', // Metallic/Silver as secondary
          600: '#666666',
          700: '#4D4D4D',
          800: '#333333',
          900: '#1A1A1A',
        },
        accent: {
          50: '#E6FFFA',
          100: '#B3FFF0',
          200: '#80FFE6',
          300: '#4DFFDB',
          400: '#1AFFD1',
          500: '#00FFC8', // Bright Teal
          600: '#00CC9F',
          700: '#009977',
          800: '#00664F',
          900: '#003328',
        },

        // 边框颜色 (兼容旧代码)
        border: {
          primary: 'rgba(0, 240, 255, 0.3)',   // SOTA Cyan
          secondary: 'rgba(255, 255, 255, 0.2)', // Glass White
          subtle: 'rgba(255, 255, 255, 0.1)',   // Subtle White
        },

        // 状态颜色 (兼容旧代码)
        success: {
          50: '#F6FFED',
          100: '#D9F7BE',
          500: '#52C41A', // Standard Green
          600: '#389E0D',
        },
        warning: {
          50: '#FFFBE6',
          100: '#FFF1B8',
          500: '#FAAD14', // Standard Orange
          600: '#D48806',
        },
        error: {
          50: '#FFF1F0',
          100: '#FFCCC7',
          500: '#F5222D', // Standard Red
          600: '#CF1322',
        },

        // 背景颜色 (兼容旧代码)
        background: {
          primary: '#020204',   // Obsidian (Deep Black)
          secondary: '#0A0A0C', // Obsidian 300
          tertiary: '#141418',  // Obsidian 100
          elevated: '#1A1A1E',  // Obsidian 50
        },

        // 文本颜色 (兼容旧代码)
        text: {
          primary: '#FFFFFF',       // 主文本
          secondary: 'rgba(255, 255, 255, 0.7)', // 次要文本
          tertiary: 'rgba(255, 255, 255, 0.45)', // 三级文本
          disabled: 'rgba(255, 255, 255, 0.25)', // 禁用文本
        },
      },

      // 字体系统
      fontFamily: {
        sans: [
          'Inter',
          'Noto Sans SC',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Consolas',
          'monospace',
        ],
      },

      // 扩展字间距
      letterSpacing: {
        'ultra': '0.35em',
        'mega': '0.5em',
      },

        // SOTA 光效阴影
      boxShadow: {
        'glow': '0 0 20px rgba(0, 240, 255, 0.35)',
        'glow-lg': '0 0 40px rgba(0, 240, 255, 0.25)',
        'glow-text': '0 0 10px rgba(0, 240, 255, 0.5)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-inset': 'inset 0 0 32px 0 rgba(255, 255, 255, 0.05)',
        
        // 霓虹光效 - 兼容旧代码
        'neon-blue': '0 0 10px rgba(64, 169, 255, 0.5), 0 0 20px rgba(64, 169, 255, 0.3), 0 0 30px rgba(64, 169, 255, 0.1)',
        'neon-purple': '0 0 10px rgba(114, 46, 209, 0.5), 0 0 20px rgba(114, 46, 209, 0.3), 0 0 30px rgba(114, 46, 209, 0.1)',
        'neon-cyan': '0 0 10px rgba(19, 194, 194, 0.5), 0 0 20px rgba(19, 194, 194, 0.3), 0 0 30px rgba(19, 194, 194, 0.1)',
      },

      // 动画配置
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
  ],
}
