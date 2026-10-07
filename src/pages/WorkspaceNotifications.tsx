import { useEffect, useState } from 'react'
import { Alert, Button, Drawer, Empty, Form, Input, Modal, Select, Space, Typography, message } from 'antd'
import { api, errorMessage, json } from '../api'
import { useWorkspace } from './useWorkspace'

type Props = ReturnType<typeof useWorkspace> & { open: boolean; onClose: () => void; admin?: boolean }
type Values = { target: 'role' | 'user'; role?: string; userId?: number; title: string; content: string }

export default function WorkspaceNotifications({ open, onClose, admin, notifications, unread, total, loading, error, refresh, markRead, loadMore }: Props) {
  const [composing, setComposing] = useState(false)
  const [sending, setSending] = useState(false)
  const [reading, setReading] = useState(false)
  const [users, setUsers] = useState<Array<{ id: number; fullName: string; code: string; active: boolean }>>([])
  const [form] = Form.useForm<Values>()
  const target = Form.useWatch('target', form)
  const [messageApi, contextHolder] = message.useMessage()
  useEffect(() => {
    if (!composing) return
    let active = true
    api<typeof users>('/users').then((rows) => { if (active) setUsers(rows.filter((user) => user.active)) })
      .catch((err) => { if (active) messageApi.error(errorMessage(err)) })
    return () => { active = false }
  }, [composing, messageApi])
  const read = async (ids: number[]) => {
    setReading(true)
    try { await markRead(ids) } catch (err) { messageApi.error(errorMessage(err)) } finally { setReading(false) }
  }
  const send = async (values: Values) => {
    setSending(true)
    try {
      const result = await api<{ sent: number }>('/notifications', json('POST', { title: values.title, content: values.content, ...(values.target === 'role' ? { role: values.role } : { userId: values.userId }) }))
      setComposing(false); form.resetFields(); messageApi.success(`Đã gửi thông báo cho ${result.sent} tài khoản.`); await refresh()
    } catch (err) { messageApi.error(errorMessage(err)) } finally { setSending(false) }
  }
  return <>
    {contextHolder}
    <Drawer title={`Thông báo (${unread} chưa đọc)`} size={440} open={open} onClose={onClose}>
      <Space wrap style={{ marginBottom: 16 }}>
        <Button loading={loading} onClick={() => void refresh()}>Làm mới</Button>
        <Button loading={reading} disabled={!notifications.some((item) => !item.readAt)} onClick={() => void read(notifications.filter((item) => !item.readAt).map((item) => item.id))}>Đọc các mục đang hiển thị</Button>
        {admin && <Button type="primary" onClick={() => { form.setFieldsValue({ target: 'role', role: 'hoc_vien', title: '', content: '' }); setComposing(true) }}>Gửi thông báo</Button>}
      </Space>
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
      {!loading && !notifications.length && !error && <Empty description="Chưa có thông báo" />}
      <Space orientation="vertical" style={{ width: '100%' }}>
        {notifications.map((item) => <div key={item.id} style={{ padding: 14, border: '1px solid #dbe3dc', borderRadius: 8, background: item.readAt ? 'transparent' : '#edf5ef' }}>
          <Typography.Text strong>{item.title}</Typography.Text>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: '8px 0' }}>{item.content}</Typography.Paragraph>
          <Space wrap><Typography.Text type="secondary">{new Date(item.createdAt.replace(' ', 'T')).toLocaleString('vi-VN')}</Typography.Text>{!item.readAt && <Button size="small" disabled={reading} onClick={() => void read([item.id])}>Đánh dấu đã đọc</Button>}</Space>
        </div>)}
      </Space>
      {notifications.length < total && <Button block loading={loading} onClick={loadMore} style={{ marginTop: 16 }}>Xem thêm ({notifications.length}/{total})</Button>}
    </Drawer>
    <Modal title="Gửi thông báo" open={composing} onCancel={() => !sending && setComposing(false)} onOk={() => form.submit()} confirmLoading={sending} okText="Gửi thông báo">
      <Form form={form} layout="vertical" onFinish={send} style={{ marginTop: 16 }}>
        <Form.Item name="target" label="Đối tượng nhận"><Select options={[{ value: 'role', label: 'Theo vai trò' }, { value: 'user', label: 'Một tài khoản' }]} /></Form.Item>
        {target === 'user' ? <Form.Item name="userId" label="Tài khoản" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={users.map((item) => ({ value: item.id, label: `${item.code} · ${item.fullName}` }))} /></Form.Item> : <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}><Select options={[{ value: 'hoc_vien', label: 'Học viên' }, { value: 'giao_vien', label: 'Giáo viên' }, { value: 'quan_tri', label: 'Quản trị viên' }]} /></Form.Item>}
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, whitespace: true }, { max: 150 }]}><Input maxLength={150} /></Form.Item>
        <Form.Item name="content" label="Nội dung" rules={[{ required: true, whitespace: true }, { max: 10000 }]}><Input.TextArea rows={5} maxLength={10000} /></Form.Item>
      </Form>
    </Modal>
  </>
}
