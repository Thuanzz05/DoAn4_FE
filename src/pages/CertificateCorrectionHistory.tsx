import { useEffect, useState } from 'react'
import { Alert, Button, Card, Collapse, Empty, Table, Typography } from 'antd'
import { api, errorMessage } from '../api'

type Correction = {
  at: string
  userId: number
  adminName: string | null
  reason: string
  before: Record<string, string | null>
  after: Record<string, string | null>
}

const fields = {
  studentCode: 'Mã học viên', studentName: 'Họ tên học viên', courseName: 'Khóa học',
  language: 'Ngoại ngữ', classCode: 'Mã lớp', className: 'Tên lớp',
}

export default function CertificateCorrectionHistory({ certificateId }: { certificateId: number }) {
  const [items, setItems] = useState<Correction[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let current = true
    setLoading(true); setLoadError(null)
    api<Correction[]>(`/certificates/${certificateId}/corrections`)
      .then((rows) => { if (current) setItems([...rows].reverse()) })
      .catch((error) => { if (current) setLoadError(errorMessage(error)) })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [certificateId, retry])

  return <Card size="small" title="Lịch sử đính chính" loading={loading} style={{ marginTop: 20 }}>
    {loadError ? <Alert type="error" showIcon title="Chưa tải được lịch sử" description={loadError} action={<Button onClick={() => setRetry((value) => value + 1)}>Thử lại</Button>} />
      : !items.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có đính chính" />
        : <Collapse items={items.map((item, index) => {
          const changes = Object.entries(fields).filter(([key]) => item.before[key] !== item.after[key])
            .map(([key, label]) => ({ key, label, before: item.before[key] ?? '—', after: item.after[key] ?? '—' }))
          return {
            key: index,
            label: <><Typography.Text strong>{new Date(item.at).toLocaleString('vi-VN')}</Typography.Text><br /><Typography.Text type="secondary">{item.adminName ?? `Quản trị viên #${item.userId}`}</Typography.Text></>,
            children: <><Typography.Paragraph><Typography.Text strong>Lý do: </Typography.Text>{item.reason}</Typography.Paragraph>{changes.length ? <Table size="small" rowKey="key" pagination={false} scroll={{ x: 520 }} dataSource={changes} columns={[{ title: 'Thông tin', dataIndex: 'label', width: 140 }, { title: 'Trước', dataIndex: 'before', width: 190 }, { title: 'Sau', dataIndex: 'after', width: 190 }]} /> : <Typography.Text type="secondary">Thông tin hiển thị không thay đổi.</Typography.Text>}</>,
          }
        })} />}
  </Card>
}
