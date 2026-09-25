import { useMemo, useState } from 'react'
import {
  CheckCircle,
  DownloadSimple,
  Exam,
  PencilSimple,
  Student,
  WarningCircle,
} from '@phosphor-icons/react'
import { Alert, Avatar, Button, Card, Flex, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import TeacherLayout, { type TeacherPage } from './TeacherLayout'
import './TeacherGrades.css'

type TeacherGradesProps = {
  onLogout: () => void
  onNavigate: (page: TeacherPage) => void
  onNavigateHome: () => void
}

type Skill = 'listening' | 'speaking' | 'reading' | 'writing'
type Score = Record<Skill, number | null>
type StudentRow = { id: number; code: string; name: string }

const students: StudentRow[] = [
  'Nguyễn Minh Anh', 'Trần Hải Đăng', 'Lê Thu Hà', 'Phạm Quốc Huy', 'Vũ Ngọc Lan', 'Đỗ Minh Khang', 'Bùi Khánh Linh',
  'Hoàng Gia Bảo', 'Nguyễn Thu Trang', 'Trần Đức Anh', 'Lê Hoàng Nam', 'Phan Ngọc Mai', 'Võ Minh Quân', 'Đặng Thanh Hà',
].map((name, index) => ({ id: index + 1, code: `HV${2501 + index}`, name }))

const emptyScore = (): Score => ({ listening: null, speaking: null, reading: null, writing: null })
const seedScores = Object.fromEntries(students.map((student, index) => [student.id, index < 8
  ? { listening: 7 + (index % 3) * 0.5, speaking: 6.5 + (index % 2), reading: 7.5 - (index % 2) * 0.5, writing: 6 + (index % 3) * 0.5 }
  : index === 8 ? { listening: 6.5, speaking: 7, reading: null, writing: null }
    : emptyScore()])) as Record<number, Score>

const averageScore = (score: Score) => {
  const values = Object.values(score)
  return values.every((value) => value !== null) ? values.reduce<number>((sum, value) => sum + Number(value), 0) / values.length : null
}

if (import.meta.env.DEV && averageScore({ listening: 6, speaking: 7, reading: 8, writing: 9 }) !== 7.5) throw new Error('Grade average check failed')

function TeacherGrades({ onLogout, onNavigate, onNavigateHome }: TeacherGradesProps) {
  const [classId, setClassId] = useState('ielts-65-02')
  const [examId, setExamId] = useState('final-2026-09')
  const [scores, setScores] = useState(seedScores)
  const [saved, setSaved] = useState(false)
  const [messageApi, messageContext] = message.useMessage()
  const [modalApi, modalContext] = Modal.useModal()

  const results = useMemo(() => students.map((student) => averageScore(scores[student.id])), [scores])
  const completed = results.filter((value) => value !== null).length
  const passed = results.filter((value) => value !== null && value >= 5).length
  const classAverage = completed ? results.reduce<number>((sum, value) => sum + (value ?? 0), 0) / completed : 0

  const updateScore = (studentId: number, skill: Skill, value: number | null) => {
    setScores((current) => ({ ...current, [studentId]: { ...current[studentId], [skill]: value } }))
  }

  const persist = () => {
    setSaved(true)
    messageApi.success('Đã lưu bảng điểm lớp IELTS 6.5.')
  }

  const saveGrades = () => {
    if (completed < students.length) {
      messageApi.warning(`Còn ${students.length - completed} học viên chưa đủ điểm bốn kỹ năng.`)
      return
    }
    if (!saved) {
      persist()
      return
    }
    modalApi.confirm({ title: 'Ghi đè bảng điểm?', content: 'Bảng điểm này đã được lưu. Kết quả mới sẽ thay thế dữ liệu trước đó.', okText: 'Ghi đè', cancelText: 'Hủy', onOk: persist })
  }

  const scoreColumn = (title: string, skill: Skill): ColumnsType<StudentRow>[number] => ({
    title, key: skill, width: 116, align: 'center',
    render: (_, student) => <InputNumber aria-label={`${title} - ${student.name}`} min={0} max={10} step={0.5} precision={1} value={scores[student.id][skill]} onChange={(value) => updateScore(student.id, skill, value)} />,
  })

  const columns: ColumnsType<StudentRow> = [
    { title: '#', key: 'index', width: 52, render: (_, __, index) => index + 1 },
    {
      title: 'Học viên', dataIndex: 'name', width: 240,
      render: (_, student) => <div className="admin-entity"><Avatar>{student.name.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><strong>{student.name}</strong><small>{student.code}</small></div></div>,
    },
    scoreColumn('Nghe', 'listening'),
    scoreColumn('Nói', 'speaking'),
    scoreColumn('Đọc', 'reading'),
    scoreColumn('Viết', 'writing'),
    {
      title: 'Trung bình', key: 'average', width: 110, align: 'center',
      render: (_, student) => { const average = averageScore(scores[student.id]); return <strong className="grade-average">{average === null ? '—' : average.toFixed(1)}</strong> },
    },
    {
      title: 'Kết quả', key: 'result', width: 110,
      render: (_, student) => { const average = averageScore(scores[student.id]); return average === null ? <Tag>Chưa nhập</Tag> : average >= 5 ? <Tag color="green">Đạt</Tag> : <Tag color="red">Chưa đạt</Tag> },
    },
  ]

  return (
    <TeacherLayout activePage="teacher-grades" mainId="teacher-grades" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      {messageContext}{modalContext}
      <AdminPageHeader
        kicker="Kết quả học tập"
        title="Nhập điểm thi"
        description="Cập nhật điểm Nghe, Nói, Đọc, Viết và kiểm tra kết quả trước khi xác nhận."
        actions={<Button icon={<DownloadSimple />} onClick={() => messageApi.info('Đã chuẩn bị bảng điểm để xuất.')}>Xuất bảng điểm</Button>}
      />

      <Alert className="teacher-grades-alert" type="info" showIcon title="Thời hạn nhập điểm" description="Bảng điểm cuối khóa được phép chỉnh sửa đến 23:59 ngày 26/09/2026." />

      <Card className="grades-filter-card">
        <Flex align="flex-end" justify="space-between" gap={18} wrap>
          <Space size={14} wrap>
            <label><Typography.Text>Lớp học</Typography.Text><Select value={classId} onChange={(value) => { setClassId(value); setSaved(value !== 'ielts-65-02') }} options={[{ value: 'ielts-65-02', label: 'IELTS 6.5 · IELTS-65-02' }, { value: 'a2-04', label: 'A2 Giao tiếp · TA-A2-04' }, { value: 'b1-07', label: 'B1 Tổng quát · TA-B1-07' }]} /></label>
            <label><Typography.Text>Kỳ đánh giá</Typography.Text><Select value={examId} onChange={setExamId} options={[{ value: 'final-2026-09', label: 'Thi cuối khóa · 09/2026' }, { value: 'mid-2026-08', label: 'Kiểm tra giữa khóa · 08/2026' }]} /></label>
          </Space>
          <Tag color={saved ? 'green' : 'orange'}>{saved ? 'Đã lưu' : 'Đang nhập'}</Tag>
        </Flex>
      </Card>

      <AdminSummary items={[
        { label: 'Sĩ số', value: students.length, detail: 'Học viên trong danh sách thi', icon: <Student weight="duotone" /> },
        { label: 'Đã nhập đủ', value: completed, detail: `${students.length - completed} học viên còn thiếu điểm`, icon: <PencilSimple weight="duotone" /> },
        { label: 'Điểm trung bình', value: classAverage.toFixed(1), detail: 'Tính trên học viên đã đủ điểm', icon: <Exam weight="duotone" /> },
        { label: 'Đạt yêu cầu', value: passed, detail: 'Điểm trung bình từ 5,0', icon: <CheckCircle weight="duotone" />, tone: 'success' },
      ]} />

      <Card
        className="admin-table-card grades-table-card"
        title="Bảng điểm bốn kỹ năng"
        extra={<Button type="primary" icon={completed < students.length ? <WarningCircle /> : <CheckCircle />} onClick={saveGrades}>Lưu bảng điểm</Button>}
      >
        <Table columns={columns} dataSource={students} rowKey="id" pagination={false} scroll={{ x: 1080, y: 540 }} />
      </Card>
    </TeacherLayout>
  )
}

export default TeacherGrades
