import { darkTheme, type Theme } from '@rainbow-me/rainbowkit'

/**
 * RainbowKit / account modal styling aligned with EonSwap Uniswap-style theme (pink accent).
 */
export function eonRainbowTheme(): Theme {
  const base = darkTheme({
    accentColor: '#FF007A',
    accentColorForeground: '#ffffff',
    borderRadius: 'large',
    fontStack: 'system',
    overlayBlur: 'large',
  })

  return {
    ...base,
    colors: {
      ...base.colors,
      modalBackground: '#191919',
      modalBorder: 'rgba(255, 0, 122, 0.14)',
      modalBackdrop: 'rgba(0, 0, 0, 0.78)',
      modalText: '#ffffff',
      modalTextSecondary: '#a3a3a3',
      modalTextDim: 'rgba(163, 163, 163, 0.4)',
      closeButton: '#d4d4d4',
      closeButtonBackground: 'rgba(255, 255, 255, 0.07)',
      profileAction: 'rgba(255, 0, 122, 0.1)',
      profileActionHover: 'rgba(255, 0, 122, 0.2)',
      profileForeground: 'rgba(255, 255, 255, 0.04)',
      actionButtonBorder: 'rgba(255, 0, 122, 0.12)',
      actionButtonBorderMobile: 'rgba(255, 0, 122, 0.14)',
      actionButtonSecondaryBackground: 'rgba(255, 255, 255, 0.06)',
      generalBorder: 'rgba(255, 255, 255, 0.09)',
      generalBorderDim: 'rgba(255, 255, 255, 0.05)',
      connectButtonBackground: '#1B1B1B',
      menuItemBackground: 'rgba(255, 0, 122, 0.08)',
    },
    shadows: {
      ...base.shadows,
      dialog:
        '0 28px 80px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 0, 122, 0.07), 0 0 56px -12px rgba(255, 0, 122, 0.12)',
      profileDetailsAction:
        '0 6px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
      connectButton:
        '0 4px 16px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 0, 122, 0.06)',
    },
    fonts: {
      ...base.fonts,
      body: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
  }
}
