import { type ReactNode, useState } from 'react'
import {
  Bell,
  CalendarBlank,
  ClipboardText,
  Exam,
  House,
  List,
  SignOut,
} from '@phosphor-icons/react'
import { Avatar, Badge, Button, ConfigProvider, Drawer, Flex, Grid, Layout, Menu, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { workspaceTheme } from './workspaceTheme'
import { useWorkspace } from './useWorkspace'
import WorkspaceNotifications from './WorkspaceNotifications'
import './AdminAnt.css'

type TeacherLayoutProps = {
  activePage: TeacherPage
  children: ReactNode
  mainId?: string
  onLogout: () => void
  onNavigate: (page: TeacherPage) => void
  onNavigateHome: () => void
}

export type TeacherPage = 'teacher' | 'teacher-schedule' | 'teacher-attendance' | 'teacher-grades'

const navItems: MenuProps['items'] = [
  { key: 'teacher', icon: <House weight="duotone" />, label: 'Tổng quan' },
  { key: 'teacher-schedule', icon: <CalendarBlank weight="duotone" />, label: 'Thời khóa biểu' },
  { key: 'teacher-attendance', icon: <ClipboardText weight="duotone" />, label: 'Điểm danh' },
  { key: 'teacher-grades', icon: <Exam weight="duotone" />, label: 'Nhập điểm' },
]

function TeacherLayout({ activePage, children, mainId, onLogout, onNavigate, onNavigateHome }: TeacherLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const screens = Grid.useBreakpoint()
  const desktop = Boolean(screens.lg)
  const today = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
  const workspace = useWorkspace()
  const { user, unread } = workspace

  const navigation = <Menu mode="inline" theme="dark" selectedKeys={[activePage]} items={navItems} onClick={({ key }) => { setMenuOpen(false); onNavigate(key as TeacherPage) }} />
  const brand = <button className="ant-admin-brand" type="button" onClick={onNavigateHome}><strong>Trung tâm</strong><span>Không gian giáo viên</span></button>
  const initials = user?.fullName.split(' ').slice(-2).map((part) => part[0]).join('').toUpperCase() || 'GV'
  const account = <div className="ant-admin-account"><Avatar shape="square">{initials}</Avatar><a className="ant-admin-profile-link" href="/profile"><strong>{user?.fullName ?? 'Giáo viên'}</strong><span>{user?.teachingLanguage ?? user?.code ?? 'Giảng dạy'}</span></a><Button type="text" icon={<SignOut />} onClick={onLogout} aria-label="Đăng xuất" /></div>

  return (
    <ConfigProvider theme={workspaceTheme}>
      <Layout className="ant-admin-shell">
        {desktop && <Layout.Sider className="ant-admin-sider" width={248}>{brand}<div className="ant-admin-nav">{navigation}</div>{account}</Layout.Sider>}

        <Drawer className="ant-admin-menu-drawer" placement="left" size={280} open={!desktop && menuOpen} onClose={() => setMenuOpen(false)} closable={false} styles={{ body: { padding: 0, background: '#0b2d29' } }}>
          {brand}<div className="ant-admin-nav">{navigation}</div>{account}
        </Drawer>

        <Layout>
          <Layout.Header className="ant-admin-header">
            <Flex align="center" justify="space-between" gap={16}>
              <Flex align="center" gap={12}>
                {!desktop && <Button icon={<List weight="bold" />} onClick={() => setMenuOpen(true)} aria-label="Mở điều hướng" />}
                <div className="ant-admin-date"><span>Dữ liệu hệ thống</span><time dateTime={new Date().toISOString()}>{today}</time></div>
              </Flex>
              <Space size={14}><Badge count={unread} size="small"><Button icon={<Bell />} onClick={() => { setNotificationsOpen(true); void workspace.refresh() }} aria-label="Xem thông báo" /></Badge><Typography.Text strong className="ant-admin-role">Giáo viên</Typography.Text></Space>
            </Flex>
          </Layout.Header>
          <Layout.Content className="ant-admin-content"><main id={mainId}>{children}</main></Layout.Content>
        </Layout>

        <WorkspaceNotifications {...workspace} open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      </Layout>
    </ConfigProvider>
  )
}

export default TeacherLayout
