import type { ThemeConfig } from 'antd'

export const workspaceTheme: ThemeConfig = {
  token: {
    colorPrimary: '#12332f',
    colorPrimaryBg: '#edf3ed',
    colorPrimaryBgHover: '#e4eee5',
    colorPrimaryBorder: '#cbdccf',
    colorPrimaryBorderHover: '#a8c1ae',
    colorInfo: '#12332f',
    colorInfoBg: '#edf3ed',
    colorInfoBgHover: '#e4eee5',
    colorInfoBorder: '#cbdccf',
    colorInfoBorderHover: '#a8c1ae',
    colorSuccess: '#397359',
    colorSuccessBg: '#edf6ee',
    colorSuccessBgHover: '#e2efe5',
    colorSuccessBorder: '#c6ddcc',
    colorSuccessBorderHover: '#9fc0a8',
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
