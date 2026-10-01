import { type ReactNode, useState } from 'react'
import {
  Bell, Books, CalendarBlank, Certificate, ChartBar, ChalkboardTeacher,
  House, List, Receipt, SignOut, Student, UsersThree,
} from '@phosphor-icons/react'
import { Avatar, Badge, Button, ConfigProvider, Drawer, Flex, Grid, Layout, Menu, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { workspaceTheme } from './workspaceTheme'
import { useWorkspace } from './useWorkspace'
import './AdminAnt.css'

export type AdminPage = 'admin' | 'students' | 'courses' | 'classes' | 'teachers' | 'schedule' | 'invoices' | 'certificates' | 'reports'

type AdminLayoutProps = {
  activePage: AdminPage
  children: ReactNode
  mainId?: string
  onLogout: () => void
  onNavigate: (page: AdminPage) => void
  onNavigateHome: () => void
}

const navItems: MenuProps['items'] = [
  { key: 'admin', icon: <House weight="duotone" />, label: 'Tổng quan' },
  { key: 'students', icon: <Student weight="duotone" />, label: 'Học viên' },
  { key: 'courses', icon: <Books weight="duotone" />, label: 'Khóa học' },
  { key: 'classes', icon: <UsersThree weight="duotone" />, label: 'Lớp học' },
  { key: 'teachers', icon: <ChalkboardTeacher weight="duotone" />, label: 'Giáo viên' },
  { key: 'schedule', icon: <CalendarBlank weight="duotone" />, label: 'Lịch học' },
  { key: 'invoices', icon: <Receipt weight="duotone" />, label: 'Học phí' },
  { key: 'certificates', icon: <Certificate weight="duotone" />, label: 'Thi và chứng chỉ' },
  { key: 'reports', icon: <ChartBar weight="duotone" />, label: 'Báo cáo' },
]

function AdminLayout({ activePage, children, mainId, onLogout, onNavigate, onNavigateHome }: AdminLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const screens = Grid.useBreakpoint()
  const desktop = Boolean(screens.lg)
  const today = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
  const { user, notifications, unread, readAll } = useWorkspace()
  const initials = user?.fullName.split(' ').slice(-2).map((part) => part[0]).join('').toUpperCase() || 'QT'

  const changePage = (key: string) => {
    setMenuOpen(false)
    onNavigate(key as AdminPage)
  }

  const navigation = <Menu mode="inline" theme="dark" selectedKeys={[activePage]} items={navItems} onClick={({ key }) => changePage(key)} />
  const brand = <button className="ant-admin-brand" type="button" onClick={onNavigateHome}><strong>Trung tâm</strong><span>Không gian quản trị</span></button>

  return (
    <ConfigProvider theme={workspaceTheme}>
      <Layout className="ant-admin-shell">
        {desktop && <Layout.Sider className="ant-admin-sider" width={248}>{brand}<div className="ant-admin-nav">{navigation}</div><div className="ant-admin-account"><Avatar shape="square">{initials}</Avatar><a className="ant-admin-profile-link" href="/profile"><strong>{user?.fullName ?? 'Quản trị viên'}</strong><span>{user?.code ?? 'Quản trị hệ thống'}</span></a><Button type="text" icon={<SignOut />} onClick={onLogout} aria-label="Đăng xuất" /></div></Layout.Sider>}

        <Drawer className="ant-admin-menu-drawer" placement="left" size={280} open={!desktop && menuOpen} onClose={() => setMenuOpen(false)} closable={false} styles={{ body: { padding: 0, background: '#0b2d29' } }}>
          {brand}<div className="ant-admin-nav">{navigation}</div><div className="ant-admin-account"><Avatar shape="square">{initials}</Avatar><a className="ant-admin-profile-link" href="/profile"><strong>{user?.fullName ?? 'Quản trị viên'}</strong><span>{user?.code ?? 'Quản trị hệ thống'}</span></a><Button type="text" icon={<SignOut />} onClick={onLogout} aria-label="Đăng xuất" /></div>
        </Drawer>

        <Layout>
          <Layout.Header className="ant-admin-header">
            <Flex align="center" justify="space-between" gap={16}>
              <Flex align="center" gap={12}>
                {!desktop && <Button icon={<List weight="bold" />} onClick={() => setMenuOpen(true)} aria-label="Mở điều hướng" />}
                <div className="ant-admin-date"><span>Dữ liệu hệ thống</span><time dateTime={new Date().toISOString()}>{today}</time></div>
              </Flex>
              <Space size={14}><Badge count={unread} size="small"><Button icon={<Bell />} onClick={() => { setNotificationsOpen(true); void readAll() }} aria-label="Xem thông báo" /></Badge><Typography.Text strong className="ant-admin-role">Quản trị viên</Typography.Text></Space>
            </Flex>
          </Layout.Header>
          <Layout.Content className="ant-admin-content"><main id={mainId}>{children}</main></Layout.Content>
        </Layout>

        <Drawer title="Thông báo nghiệp vụ" size={400} open={notificationsOpen} onClose={() => setNotificationsOpen(false)}>
          <Space orientation="vertical" size={0} className="ant-admin-notifications">
            {notifications.map((notification) => <Flex gap={12} key={notification.id}><Bell weight="duotone" /><div><Typography.Text strong>{notification.title}</Typography.Text><Typography.Paragraph type="secondary">{notification.content}</Typography.Paragraph></div></Flex>)}
          </Space>
        </Drawer>
      </Layout>
    </ConfigProvider>
  )
}

export default AdminLayout
