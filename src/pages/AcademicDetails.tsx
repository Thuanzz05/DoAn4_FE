import { useEffect, useState } from 'react'
import { Alert, Button, Card, Select, Space, Table, Tabs, Tag, Typography } from 'antd'
import type { TableProps } from 'antd'
import { api, errorMessage } from '../api'
import { downloadFile } from '../download'
import { enrollmentLabels } from './enrollmentLabels'
import { academicScore } from '../academicScore'

type ExamResult = { examId: number; listening: number | null; speaking: number | null; reading: number | null; writing: number | null; average: number | null }
type Learner = {
  enrollmentId: number; studentCode: string; studentName: string; email: string; enrollmentStatus: string
  paid: boolean; eligible: boolean; eligibilityReason: string; expectedAttendance: number; recordedAttendance: number
  presentAttendance: number; onTimeAttendance: number; lateAttendance: number; absentAttendance: number
  missingAttendance: number; attendanceRate: number; requiredExams: number; completedExams: number
  average: number | null; examResults: ExamResult[]
}
type Academic = {
  exams: Array<{ id: number; name: string; examDate: string | null; deadline: string | null }>
  students: Learner[]
  missingAttendance: Array<{ sessionId: number; startsAt: string; teacherName: string; roomCode: string; enrollmentId: number; studentCode: string; studentName: string; canMarkAttendance: boolean }>
}
export default function AcademicDetails({ classId, teacher = false, section, revision = 0, onOpenSession }: { classId: number; teacher?: boolean; section?: 'attendance' | 'grades'; revision?: number; onOpenSession?: (sessionId: number) => void }) {
  const [data, setData] = useState<Academic>()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [exportError, setExportError] = useState('')
  const [retry, setRetry] = useState(0)
  const [examId, setExamId] = useState<number>()
  const [tab, setTab] = useState(section ?? 'students')
  const base = `${teacher ? '/teacher' : ''}/classes/${classId}/academic`
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setExportError(''); setData(undefined)
    api<Academic>(base).then((result) => { if (active) { setData(result); setExamId((current) => result.exams.some((exam) => exam.id === current) ? current : result.exams[0]?.id) } })
      .catch((err) => { if (active) setError(errorMessage(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [base, revision, retry])
  const exportSection = async () => {
    if (exporting || loading || !data || error) return
    setExporting(true); setExportError('')
    try { await downloadFile(`${base}/export?section=${tab === 'attendance' || tab === 'missing' ? 'attendance' : tab === 'grades' ? 'grades' : 'all'}`, `hoc-vu-lop-${classId}.xlsx`) }
    catch (err) { setExportError(errorMessage(err)) } finally { setExporting(false) }
  }
  const identity: TableProps<Learner>['columns'] = [
    { title: 'Mã học viên', dataIndex: 'studentCode', width: 135 },
    { title: 'Học viên', dataIndex: 'studentName', width: 200 },
  ]
  const attendanceColumns: TableProps<Learner>['columns'] = [...identity,
    { title: 'Đúng giờ', dataIndex: 'onTimeAttendance' }, { title: 'Muộn', dataIndex: 'lateAttendance' },
    { title: 'Vắng', dataIndex: 'absentAttendance' }, { title: 'Chưa ghi', dataIndex: 'missingAttendance' },
    { title: 'Đã ghi / cần ghi', key: 'recorded', render: (_, row) => `${row.recordedAttendance}/${row.expectedAttendance}` },
    { title: 'Chuyên cần', dataIndex: 'attendanceRate', sorter: (a, b) => a.attendanceRate - b.attendanceRate, render: (value, row) => row.expectedAttendance ? `${Number(value).toFixed(1)}%` : '—' },
  ]
  const selectedScore = (row: Learner) => row.examResults.find((exam) => exam.examId === examId)
  const gradeColumns: TableProps<Learner>['columns'] = [...identity,
    ...(['listening', 'speaking', 'reading', 'writing'] as const).map((key, index) => ({ title: ['Nghe', 'Nói', 'Đọc', 'Viết'][index], key, render: (_: unknown, row: Learner) => academicScore(selectedScore(row)?.[key]) })),
    { title: 'TB kỳ thi', key: 'examAverage', render: (_, row) => academicScore(selectedScore(row)?.average) },
    { title: 'Kỳ đủ điểm', key: 'exams', render: (_, row) => `${row.completedExams}/${row.requiredExams}` },
    { title: 'TB toàn khóa', dataIndex: 'average', sorter: (a, b) => (a.average ?? -1) - (b.average ?? -1), render: academicScore },
    { title: 'Kết quả học tập', key: 'outcome', render: (_, row) => <Tag color={row.average == null ? 'default' : row.average >= 5 ? 'green' : 'red'}>{row.average == null ? 'Chưa đủ điểm' : row.average >= 5 ? 'Đạt' : 'Chưa đạt'}</Tag> },
    { title: 'Dự thi', key: 'eligible', render: (_, row) => <Typography.Text type={row.eligible ? undefined : 'warning'}>{row.eligible ? 'Đủ điều kiện' : row.eligibilityReason || 'Chưa hoàn tất học phí'}</Typography.Text> },
  ]
  const table = (columns: TableProps<Learner>['columns']) => <Table rowKey="enrollmentId" loading={loading} columns={columns} dataSource={data?.students ?? []} pagination={{ pageSize: 10 }} scroll={{ x: 1050 }} />
  const tabs = [
    ...(!section ? [{ key: 'students', label: 'Học viên', children: table([...identity, { title: 'Email', dataIndex: 'email' }, { title: 'Ghi danh', dataIndex: 'enrollmentStatus', render: (value: string) => enrollmentLabels[value] ?? value }, { title: 'Học phí', dataIndex: 'paid', render: (value: boolean) => <Tag color={value ? 'green' : 'orange'}>{value ? 'Đã hoàn tất' : 'Chưa hoàn tất'}</Tag> }]) }] : []),
    ...(!section || section === 'attendance' ? [
      { key: 'attendance', label: 'Chuyên cần toàn khóa', children: table(attendanceColumns) },
      { key: 'missing', label: `Điểm danh còn thiếu (${loading || error ? '—' : data?.missingAttendance.length ?? 0})`, children: <Table loading={loading} rowKey={(row) => `${row.sessionId}-${row.enrollmentId}`} dataSource={data?.missingAttendance ?? []} columns={[{ title: 'Buổi học', dataIndex: 'startsAt', render: (value: string) => new Date(value.replace(' ', 'T')).toLocaleString('vi-VN') }, { title: 'Phòng', dataIndex: 'roomCode' }, { title: 'Giáo viên', dataIndex: 'teacherName' }, { title: 'Mã HV', dataIndex: 'studentCode' }, { title: 'Học viên chưa điểm danh', dataIndex: 'studentName' }, ...(onOpenSession ? [{ title: 'Xử lý', key: 'action', render: (_: unknown, row: Academic['missingAttendance'][number]) => teacher && !row.canMarkAttendance ? <Typography.Text type="secondary">Liên hệ giáo vụ</Typography.Text> : <Button disabled={loading || Boolean(error)} onClick={() => onOpenSession(row.sessionId)}>Bổ sung điểm danh</Button> }] : [])]} pagination={{ pageSize: 10 }} scroll={{ x: 1050 }} /> },
    ] : []),
    ...(!section || section === 'grades' ? [{ key: 'grades', label: 'Điểm toàn khóa', children: <><Space style={{ marginBottom: 16 }}><Typography.Text>Kỳ thi:</Typography.Text><Select disabled={loading || Boolean(error) || !data?.exams.length} style={{ minWidth: 200 }} value={examId} onChange={setExamId} options={data?.exams.map((exam) => ({ value: exam.id, label: exam.name }))} /></Space>{table(gradeColumns)}</> }] : []),
  ]
  return <Card size="small" title="Hồ sơ học vụ" style={{ marginTop: 16 }} extra={<Space><Button loading={loading} disabled={exporting} onClick={() => setRetry((value) => value + 1)}>Tải lại thống kê</Button><Button loading={exporting} disabled={loading || !data || Boolean(error)} onClick={() => void exportSection()}>Xuất Excel</Button></Space>}>
    {error && <Alert type="error" showIcon title="Chưa tải được học vụ của lớp" description={error} action={<Button onClick={() => setRetry((value) => value + 1)}>Thử lại</Button>} style={{ marginBottom: 16 }} />}
    {exportError && <Alert type="error" showIcon title="Chưa xuất được Excel" description={exportError} style={{ marginBottom: 16 }} />}
    <Typography.Paragraph type="secondary">Chuyên cần tính trên tất cả buổi đã đến giờ, không gồm buổi hủy. Điểm trung bình toàn khóa chỉ có khi đủ bốn kỹ năng của tất cả kỳ thi.</Typography.Paragraph>
    {!error && <Tabs activeKey={tab} onChange={setTab} items={tabs} />}
  </Card>
}
