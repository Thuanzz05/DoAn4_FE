import type { ThemeConfig } from 'antd'

export const workspaceTheme: ThemeConfig = {
  token: {
    colorPrimary: '#12332f',
    colorInfo: '#12332f',
    colorSuccess: '#397359',
    colorWarning: '#c98a2e',
    colorError: '#d44735',
    borderRadius: 10,
    fontFamily: 'Manrope, sans-serif',
    colorBgLayout: '#f3f6f3',
  },
  components: {
    Layout: { siderBg: '#0b2d29', headerBg: '#ffffff' },
    Menu: {
      darkItemBg: '#0b2d29',
      darkSubMenuItemBg: '#0b2d29',
      darkItemSelectedBg: '#dce8dc',
      darkItemSelectedColor: '#12332f',
      darkItemHoverBg: '#17433d',
    },
  },
}
