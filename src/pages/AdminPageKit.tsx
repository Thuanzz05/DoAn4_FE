import type { ReactNode } from 'react'
import { Card, Col, Flex, Row, Statistic, Typography } from 'antd'
import './AdminPageKit.css'

type SummaryItem = { label: string; value: string | number; detail: string; icon: ReactNode; tone?: 'default' | 'success' | 'danger' }

export function AdminPageHeader({ kicker, title, description, actions }: { kicker: string; title: string; description: string; actions?: ReactNode }) {
  return <Flex className="admin-page-heading" align="flex-end" justify="space-between" gap={24} wrap><div><Typography.Text className="admin-page-kicker">{kicker}</Typography.Text><Typography.Title level={1}>{title}</Typography.Title><Typography.Paragraph type="secondary">{description}</Typography.Paragraph></div>{actions}</Flex>
}

export function AdminSummary({ items }: { items: SummaryItem[] }) {
  return <Row className="admin-summary" gutter={[14, 14]}>{items.map((item) => <Col xs={24} sm={12} xl={24 / items.length} key={item.label}><Card className={`admin-summary-card ${item.tone ?? 'default'}`}><Flex align="flex-start" justify="space-between"><Statistic title={item.label} value={item.value} /><span className="admin-summary-icon">{item.icon}</span></Flex><Typography.Text type="secondary">{item.detail}</Typography.Text></Card></Col>)}</Row>
}
