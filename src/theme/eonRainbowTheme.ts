import { darkTheme, type Theme } from '@rainbow-me/rainbowkit'

/**
 * RainbowKit / account modal styling aligned with EonSwap (cyan accent, glassy depth).
 */
export function eonRainbowTheme(): Theme {
  const base = darkTheme({
    accentColor: '#00d2ff',
    accentColorForeground: '#05060f',
    borderRadius: 'large',
    fontStack: 'system',
    overlayBlur: 'large',
  })

  return {
    ...base,
    colors: {
      ...base.colors,
      modalBackground:
        'linear-gradient(165deg, #16182f 0%, #0f1128 42%, #0a0b1c 100%)',
      modalBorder: 'rgba(0, 210, 255, 0.14)',
      modalBackdrop: 'rgba(4, 5, 12, 0.78)',
      modalText: '#f8fafc',
      modalTextSecondary: '#94a3b8',
      modalTextDim: 'rgba(148, 163, 184, 0.4)',
      closeButton: '#cbd5e1',
      closeButtonBackground: 'rgba(255, 255, 255, 0.07)',
      profileAction: 'rgba(0, 210, 255, 0.1)',
      profileActionHover: 'rgba(0, 210, 255, 0.2)',
      profileForeground: 'rgba(255, 255, 255, 0.04)',
      actionButtonBorder: 'rgba(0, 210, 255, 0.12)',
      actionButtonBorderMobile: 'rgba(0, 210, 255, 0.14)',
      actionButtonSecondaryBackground: 'rgba(255, 255, 255, 0.06)',
      generalBorder: 'rgba(255, 255, 255, 0.09)',
      generalBorderDim: 'rgba(255, 255, 255, 0.05)',
      connectButtonBackground: '#12142a',
      menuItemBackground: 'rgba(0, 210, 255, 0.08)',
    },
    shadows: {
      ...base.shadows,
      dialog:
        '0 28px 80px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 210, 255, 0.07), 0 0 56px -12px rgba(34, 211, 238, 0.12)',
      profileDetailsAction:
        '0 6px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
      connectButton:
        '0 4px 16px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 210, 255, 0.06)',
    },
    fonts: {
      ...base.fonts,
      body: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
  }
}
