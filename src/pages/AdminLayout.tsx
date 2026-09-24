import { type ReactNode, useState } from 'react'
import {
  Bell, Books, CalendarBlank, Certificate, ChartBar, ChalkboardTeacher,
  House, List, Receipt, SignOut, Student, UsersThree, WarningCircle,
} from '@phosphor-icons/react'
import { Avatar, Badge, Button, ConfigProvider, Drawer, Flex, Grid, Layout, Menu, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'
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

const notifications = [
  { title: 'Hai lịch học cần kiểm tra', detail: 'Có khả năng trùng phòng trong khung giờ 18:00.', icon: CalendarBlank },
  { title: 'Năm hóa đơn sắp đến hạn', detail: 'Kế toán cần xác nhận trạng thái trước ngày thi.', icon: Receipt },
  { title: 'Ba học viên chưa đủ điều kiện thi', detail: 'Chuyên cần hoặc học phí chưa đạt yêu cầu.', icon: WarningCircle },
] as const

function AdminLayout({ activePage, children, mainId, onLogout, onNavigate, onNavigateHome }: AdminLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const screens = Grid.useBreakpoint()
  const desktop = Boolean(screens.lg)
  const today = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())

  const changePage = (key: string) => {
    setMenuOpen(false)
    onNavigate(key as AdminPage)
  }

  const navigation = <Menu mode="inline" theme="dark" selectedKeys={[activePage]} items={navItems} onClick={({ key }) => changePage(key)} />
  const brand = <button className="ant-admin-brand" type="button" onClick={onNavigateHome}><strong>Trung tâm</strong><span>Không gian quản trị</span></button>

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#12332f', colorInfo: '#12332f', colorSuccess: '#397359', colorWarning: '#c98a2e', colorError: '#d44735', borderRadius: 10, fontFamily: 'Manrope, sans-serif', colorBgLayout: '#f3f6f3' }, components: { Layout: { siderBg: '#0b2d29', headerBg: '#ffffff' }, Menu: { darkItemBg: '#0b2d29', darkSubMenuItemBg: '#0b2d29', darkItemSelectedBg: '#dce8dc', darkItemSelectedColor: '#12332f', darkItemHoverBg: '#17433d' } } }}>
      <Layout className="ant-admin-shell">
        {desktop && <Layout.Sider className="ant-admin-sider" width={248}>{brand}<div className="ant-admin-nav">{navigation}</div><div className="ant-admin-account"><Avatar shape="square">QT</Avatar><div><strong>Quản trị viên</strong><span>Giáo vụ trung tâm</span></div><Button type="text" icon={<SignOut />} onClick={onLogout} aria-label="Đăng xuất" /></div></Layout.Sider>}

        <Drawer className="ant-admin-menu-drawer" placement="left" size={280} open={!desktop && menuOpen} onClose={() => setMenuOpen(false)} closable={false} styles={{ body: { padding: 0, background: '#0b2d29' } }}>
          {brand}<div className="ant-admin-nav">{navigation}</div><div className="ant-admin-account"><Avatar shape="square">QT</Avatar><div><strong>Quản trị viên</strong><span>Giáo vụ trung tâm</span></div><Button type="text" icon={<SignOut />} onClick={onLogout} aria-label="Đăng xuất" /></div>
        </Drawer>

        <Layout>
          <Layout.Header className="ant-admin-header">
            <Flex align="center" justify="space-between" gap={16}>
              <Flex align="center" gap={12}>
                {!desktop && <Button icon={<List weight="bold" />} onClick={() => setMenuOpen(true)} aria-label="Mở điều hướng" />}
                <div className="ant-admin-date"><span>Dữ liệu minh họa</span><time dateTime={new Date().toISOString()}>{today}</time></div>
              </Flex>
              <Space size={14}><Badge count={notifications.length} size="small"><Button icon={<Bell />} onClick={() => setNotificationsOpen(true)} aria-label="Xem thông báo" /></Badge><Typography.Text strong className="ant-admin-role">Quản trị viên</Typography.Text></Space>
            </Flex>
          </Layout.Header>
          <Layout.Content className="ant-admin-content"><main id={mainId}>{children}</main></Layout.Content>
        </Layout>

        <Drawer title="Thông báo nghiệp vụ" size={400} open={notificationsOpen} onClose={() => setNotificationsOpen(false)}>
          <Space orientation="vertical" size={0} className="ant-admin-notifications">
            {notifications.map((notification) => { const Icon = notification.icon; return <Flex gap={12} key={notification.title}><Icon weight="duotone" /><div><Typography.Text strong>{notification.title}</Typography.Text><Typography.Paragraph type="secondary">{notification.detail}</Typography.Paragraph></div></Flex> })}
          </Space>
        </Drawer>
      </Layout>
    </ConfigProvider>
  )
}

export default AdminLayout
