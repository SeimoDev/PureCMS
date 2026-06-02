import { createTheme } from '@mui/material/styles'
import { appearanceDefaults, normalizeAppearanceSettings, type AppearanceSettings } from './appearance'

declare module '@mui/material/styles' {
  interface PaletteColor {
    container: string
    onContainer: string
  }

  interface SimplePaletteColorOptions {
    container?: string
    onContainer?: string
  }
}

const accentPalettes: Record<string, { light: string; dark: string; contrastText: string; container: string; onContainer: string; darkContainer: string; darkOnContainer: string }> = {
  '#256B57': { light: '#79D6B9', dark: '#06382B', contrastText: '#FFFFFF', container: '#D7F2E5', onContainer: '#062018', darkContainer: '#0B4F3D', darkOnContainer: '#B8E9D1' },
  '#B3261E': { light: '#FFB4AB', dark: '#8C1D18', contrastText: '#FFFFFF', container: '#FFDAD6', onContainer: '#410002', darkContainer: '#93000A', darkOnContainer: '#FFDAD6' },
  '#6750A4': { light: '#E8DEF8', dark: '#4F378B', contrastText: '#FFFFFF', container: '#EADDFF', onContainer: '#21005D', darkContainer: '#4F378B', darkOnContainer: '#EADDFF' },
  '#B26A00': { light: '#FFDDB0', dark: '#7A4700', contrastText: '#1F1B16', container: '#FFDCBA', onContainer: '#2C1600', darkContainer: '#663F00', darkOnContainer: '#FFDCBA' },
}

export function createCmsTheme(input?: Partial<AppearanceSettings>) {
  const appearance = normalizeAppearanceSettings({ ...appearanceDefaults, ...input })
  const accent = accentPalettes[appearance.accentColor] ?? accentPalettes[appearanceDefaults.accentColor]
  const dark = appearance.themeMode === 'dark'

  return createTheme({
    palette: {
      mode: appearance.themeMode,
      primary: {
        main: appearance.accentColor,
        light: accent.light,
        dark: accent.dark,
        contrastText: accent.contrastText,
        container: dark ? accent.darkContainer : accent.container,
        onContainer: dark ? accent.darkOnContainer : accent.onContainer,
      },
      secondary: {
        main: dark ? '#D0BCFF' : '#6750A4',
        light: '#E8DEF8',
        dark: '#4F378B',
        contrastText: dark ? '#381E72' : '#FFFFFF',
      },
      background: {
        default: dark ? '#101915' : '#F8FAF7',
        paper: dark ? '#18231F' : '#FFFFFF',
      },
      success: {
        main: dark ? '#8ED98F' : '#2E7D32',
      },
      warning: {
        main: dark ? '#FFD08A' : '#B26A00',
      },
      error: {
        main: dark ? '#FFB4AB' : '#BA1A1A',
      },
      text: {
        primary: dark ? '#E9F1EC' : '#17211D',
        secondary: dark ? '#B7C8BE' : '#53615B',
      },
    },
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontFamily:
        '"Noto Serif SC", "Source Han Serif SC", "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif',
      h1: { fontWeight: 800, letterSpacing: 0 },
      h2: { fontWeight: 800, letterSpacing: 0 },
      h3: { fontWeight: 760, letterSpacing: 0 },
      h4: { fontWeight: 740, letterSpacing: 0 },
      h5: { fontWeight: 720, letterSpacing: 0 },
      h6: { fontWeight: 700, letterSpacing: 0 },
      button: { fontWeight: 700, letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            userSelect: 'none',
            WebkitUserSelect: 'none',
          },
          'input, textarea, [contenteditable="true"], .MuiInputBase-input, .article-content, .article-content *, .user-content, .user-content *, pre, code': {
            userSelect: 'text',
            WebkitUserSelect: 'text',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            whiteSpace: 'nowrap',
            minWidth: 'max-content',
            maxWidth: '100%',
            '& .MuiButton-startIcon, & .MuiButton-endIcon': { flexShrink: 0 },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            whiteSpace: 'nowrap',
            minWidth: 'max-content',
            maxWidth: '100%',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            whiteSpace: 'nowrap',
            minWidth: 'max-content',
            maxWidth: '100%',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: 8, border: `1px solid ${dark ? 'rgba(201, 221, 210, 0.16)' : 'rgba(37, 107, 87, 0.14)'}` },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 700,
            maxWidth: '100%',
          },
          label: {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            whiteSpace: 'nowrap',
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined' },
      },
    },
  })
}

export const theme = createCmsTheme()
