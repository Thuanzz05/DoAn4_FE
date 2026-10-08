import { useEffect, useState } from 'react'
import {
  CalendarCheck,
  Certificate,
  ChartBar,
  CheckCircle,
  ClockCounterClockwise,
  Receipt,
} from '@phosphor-icons/react'
import { Alert, Button, Card, Col, Empty, Flex, Progress, Row, Select, Skeleton, Space, Table, Tabs, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import StudentLayout, { type StudentPage } from './StudentLayout'
import './StudentResults.css'
import { api, errorMessage } from '../api'
import { enrollmentLabels } from './enrollmentLabels'
import { academicScore } from '../academicScore'

type StudentResultsProps = {
  onLogout: () => void
  onNavigate: (page: StudentPage) => void
  onNavigateHome: () => void
}

type Score = { key: string; skill: string; score: number | null; note: string }
type Attendance = { key: string; date: string; session: string; status: 'Có mặt' | 'Đi muộn' | 'Vắng' | 'Chưa điểm danh'; note: string }
type ExamResult = { examId: number; enrollmentId: number; examName: string; examDate: string | null; classId: number; classCode: string; className: string; listening: number | null; speaking: number | null; reading: number | null; writing: number | null; average: number | null }
type ResultApi = { exams: ExamResult[]; attendance: Array<{ sessionId: number; enrollmentId: number; classId: number; className: string; startsAt: string; status: 'co_mat' | 'di_muon' | 'vang' | null; note: string | null }> }
type Eligibility = { enrollmentId: number; enrollmentStatus: string; classId: number | null; classCode: string | null; className: string | null; courseName: string; attendance: number; expectedAttendance: number; recordedAttendance: number; average: number | null; requiredExams: number; completedExams: number; paid: boolean; eligible: boolean; certificateStatus: 'da_duyet' | 'da_cap' | null; ineligibleReasons: string[] }
const scoreLabel = academicScore
const attendanceColor = { 'Có mặt': 'green', 'Đi muộn': 'orange', Vắng: 'red', 'Chưa điểm danh': 'default' }
if (import.meta.env.DEV && (scoreLabel(null) !== '—' || scoreLabel(0) !== '0.00' || Number(scoreLabel(4.9975)) >= 5)) throw new Error('Missing and failing scores must retain their meaning')

const scoreColumns: ColumnsType<Score> = [
  { title: 'Kỹ năng', dataIndex: 'skill', render: (skill) => <Typography.Text strong>{skill}</Typography.Text> },
  { title: 'Điểm', dataIndex: 'score', width: 140, render: (score: number | null) => <strong className="student-result-score">{scoreLabel(score)}</strong> },
  { title: 'Ghi chú', dataIndex: 'note' },
]

const attendanceColumns: ColumnsType<Attendance> = [
  { title: 'Ngày học', dataIndex: 'date', width: 150 },
  { title: 'Lớp', dataIndex: 'session', width: 160 },
  { title: 'Trạng thái', dataIndex: 'status', width: 150, render: (status: Attendance['status']) => <Tag color={attendanceColor[status]}>{status}</Tag> },
  { title: 'Ghi chú', dataIndex: 'note' },
]

function StudentResults({ onLogout, onNavigate, onNavigateHome }: StudentResultsProps) {
  const [result, setResult] = useState<ResultApi>({ exams: [], attendance: [] })
  const [eligibility, setEligibility] = useState<Eligibility[]>([])
  const [selection, setSelection] = useState<{ enrollmentId?: number; examId?: number }>({})
  const { enrollmentId, examId } = selection
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    Promise.all([api<ResultApi>('/student/results', { signal: controller.signal }), api<Eligibility[]>('/student/certificate-eligibility', { signal: controller.signal })]).then(([data, conditions]) => {
      if (controller.signal.aborted) return
      setResult(data); setEligibility(conditions)
      setSelection((current) => {
        const nextEnrollment = conditions.some((item) => item.enrollmentId === current.enrollmentId) ? current.enrollmentId : conditions[0]?.enrollmentId ?? data.exams[0]?.enrollmentId
        const classId = conditions.find((item) => item.enrollmentId === nextEnrollment)?.classId
        const available = data.exams.filter((item) => item.enrollmentId === nextEnrollment && item.classId === classId)
        return { enrollmentId: nextEnrollment, examId: available.some((item) => item.examId === current.examId) ? current.examId : available[0]?.examId }
      })
    }).catch((err) => { if (!controller.signal.aborted) setError(errorMessage(err)) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])
  const condition = eligibility.find((item) => item.enrollmentId === enrollmentId)
  const exams = result.exams.filter((item) => item.enrollmentId === enrollmentId && item.classId === condition?.classId)
  const exam = exams.find((item) => item.examId === examId) ?? exams[0]
  const scores: Score[] = exam ? [
    { key: 'listening', skill: 'Nghe', score: exam.listening, note: exam.listening === null ? 'Chưa có điểm' : exam.examName },
    { key: 'speaking', skill: 'Nói', score: exam.speaking, note: exam.speaking === null ? 'Chưa có điểm' : exam.examName },
    { key: 'reading', skill: 'Đọc', score: exam.reading, note: exam.reading === null ? 'Chưa có điểm' : exam.examName },
    { key: 'writing', skill: 'Viết', score: exam.writing, note: exam.writing === null ? 'Chưa có điểm' : exam.examName },
  ] : []
  const attendanceRows: Attendance[] = result.attendance.filter((item) => item.enrollmentId === enrollmentId).map((item) => ({ key: `${item.enrollmentId}-${item.sessionId}`, date: new Date(item.startsAt.replace(' ', 'T')).toLocaleDateString('vi-VN'), session: item.className, status: item.status === 'co_mat' ? 'Có mặt' : item.status === 'di_muon' ? 'Đi muộn' : item.status === 'vang' ? 'Vắng' : 'Chưa điểm danh', note: item.note ?? '—' }))
  const currentAttendance = result.attendance.filter((item) => item.enrollmentId === enrollmentId && item.classId === condition?.classId)
  const present = currentAttendance.filter((item) => item.status === 'co_mat').length
  const late = currentAttendance.filter((item) => item.status === 'di_muon').length
  const absent = currentAttendance.filter((item) => item.status === 'vang').length
  const expectedAttendance = Number(condition?.expectedAttendance ?? 0)
  const recordedAttendance = Number(condition?.recordedAttendance ?? 0)
  const rate = Number(condition?.attendance ?? 0)
  const average = exam?.average === null || !exam ? null : Number(exam.average)
  const gradeTab = <div className="student-result-panel">
    <Alert type={average !== null && average >= 5 ? 'success' : 'info'} showIcon title={exam ? `${exam.examName} · ${exam.className}` : 'Lớp chưa có kỳ thi'} description={average === null ? 'Điểm trung bình chỉ được tính khi đủ điểm cả bốn kỹ năng. Dấu — là chưa có điểm, không phải điểm 0.' : `Điểm trung bình kỳ thi là ${scoreLabel(average)}/10.`} />
    <Row gutter={[14, 14]} className="student-skill-cards">
      {scores.map((item) => <Col xs={12} lg={6} key={item.key}><Card size="small"><Flex justify="space-between" align="center"><span>{item.skill}</span><strong>{scoreLabel(item.score)}</strong></Flex>{item.score !== null ? <Progress percent={Number(item.score) * 10} showInfo={false} strokeColor="#397359" /> : <Typography.Text type="secondary">Chưa có điểm</Typography.Text>}</Card></Col>)}
    </Row>
    <Card className="admin-table-card" title="Điểm bốn kỹ năng" extra={<Tag color={average === null ? 'default' : 'green'}>{average === null ? 'Chưa đủ điểm' : 'Đã đủ điểm'}</Tag>}><Table loading={loading} columns={scoreColumns} dataSource={scores} pagination={false} scroll={{ x: 620 }} /></Card>
  </div>

  const attendanceTab = <div className="student-result-panel">
    <Row gutter={[14, 14]} className="student-attendance-cards">
      <Col xs={24} md={8}><Card><span className="student-result-label">Có mặt</span><strong>{present}</strong><small>buổi học</small></Card></Col>
      <Col xs={24} md={8}><Card><span className="student-result-label">Đi muộn</span><strong>{late}</strong><small>buổi học</small></Card></Col>
      <Col xs={24} md={8}><Card><span className="student-result-label">Vắng</span><strong>{absent}</strong><small>buổi học</small></Card></Col>
    </Row>
    <Card className="student-attendance-progress"><Flex align="center" gap={24} wrap><Progress type="circle" percent={Number(rate.toFixed(1))} format={() => expectedAttendance ? `${rate.toFixed(1)}%` : '—'} strokeColor={rate >= 80 ? '#397359' : '#c43d3d'} size={104} /><div><Typography.Title level={4}>{expectedAttendance ? 'Chuyên cần theo buổi học đã diễn ra' : 'Chưa có buổi học để tính chuyên cần'}</Typography.Title><Typography.Paragraph type="secondary">Đã có điểm danh {recordedAttendance}/{expectedAttendance} buổi phải ghi nhận. Buổi chưa điểm danh không được coi là có mặt. Mức 80% là điều kiện xét chứng chỉ, không phải điều kiện dự thi.</Typography.Paragraph>{expectedAttendance > recordedAttendance && <Tag color="orange">Còn {expectedAttendance - recordedAttendance} buổi chưa điểm danh</Tag>}</div></Flex></Card>
    <Card className="admin-table-card" title="Lịch sử điểm danh của ghi danh"><Table loading={loading} columns={attendanceColumns} dataSource={attendanceRows} pagination={false} scroll={{ x: 620 }} /></Card>
  </div>

  const certificateTitle = condition?.certificateStatus === 'da_cap' ? 'Chứng chỉ đã được cấp' : condition?.certificateStatus === 'da_duyet' ? 'Hồ sơ chứng chỉ đã được duyệt' : condition?.eligible ? 'Đủ điều kiện nhận chứng chỉ' : 'Chưa đủ điều kiện nhận chứng chỉ'
  const certificateTab = <div className="student-result-panel">
    <Alert type={condition?.eligible || condition?.certificateStatus ? 'success' : 'warning'} showIcon title={certificateTitle} description={condition?.certificateStatus ? 'Hồ sơ đã được chốt. Xem chi tiết tại mục Chứng chỉ của tôi.' : condition?.eligible ? 'Hồ sơ đủ điều kiện, đang chờ quản trị viên xét duyệt.' : condition?.ineligibleReasons.join('; ') || 'Chưa có lớp học để xét.'} />
    <Card className="student-certificate-card" title={`Điều kiện xét chứng chỉ ${condition?.courseName ?? ''}`}>
      <div className="student-condition-list">
        <div><CheckCircle weight="fill" /><span><strong>Hoàn thành lớp học</strong><small>Trạng thái được trung tâm xác nhận khi kết thúc lớp.</small></span><Tag color={condition?.enrollmentStatus === 'hoan_thanh' ? 'green' : 'red'}>{condition?.enrollmentStatus === 'hoan_thanh' ? 'Đạt' : 'Chưa đạt'}</Tag></div>
        <div><CheckCircle weight="fill" /><span><strong>Chuyên cần từ 80%, đủ dữ liệu điểm danh</strong><small>Hiện tại: {expectedAttendance ? `${rate.toFixed(1)}%` : 'Chưa có'} · {recordedAttendance}/{expectedAttendance} buổi được ghi nhận</small></span><Tag color={expectedAttendance > 0 && recordedAttendance === expectedAttendance && rate >= 80 ? 'green' : 'red'}>{expectedAttendance > 0 && recordedAttendance === expectedAttendance && rate >= 80 ? 'Đạt' : 'Chưa đạt'}</Tag></div>
        <div><CheckCircle weight="fill" /><span><strong>Điểm trung bình từ 5,0</strong><small>Hiện tại: {condition?.average === null || !condition ? 'Chưa có' : scoreLabel(condition.average)}</small></span><Tag color={condition?.average !== null && Number(condition?.average ?? 0) >= 5 ? 'green' : 'red'}>{condition?.average !== null && Number(condition?.average ?? 0) >= 5 ? 'Đạt' : 'Chưa đạt'}</Tag></div>
        <div><CheckCircle weight="fill" /><span><strong>Hoàn thành tất cả kỳ thi</strong><small>Hiện tại: {condition?.completedExams ?? 0}/{condition?.requiredExams ?? 0} kỳ thi</small></span><Tag color={condition && condition.requiredExams > 0 && condition.completedExams === condition.requiredExams ? 'green' : 'red'}>{condition && condition.requiredExams > 0 && condition.completedExams === condition.requiredExams ? 'Đạt' : 'Chưa đạt'}</Tag></div>
        <div className={condition?.paid ? '' : 'blocked'}><Receipt weight="fill" /><span><strong>Hoàn tất học phí của ghi danh này</strong></span><Tag color={condition?.paid ? 'green' : 'red'}>{condition?.paid ? 'Đạt' : 'Chưa đạt'}</Tag></div>
      </div>
    </Card>
  </div>

  const historyTab = <div className="student-result-panel">{result.exams.length ? <Table rowKey={(item) => `${item.enrollmentId}-${item.examId}`} loading={loading} pagination={false} scroll={{ x: 720 }} dataSource={result.exams} columns={[
    { title: 'Kỳ thi', dataIndex: 'examName', render: (value: string) => <Typography.Text strong>{value}</Typography.Text> },
    { title: 'Lớp học', key: 'class', render: (_: unknown, item: ExamResult) => `${item.classCode} · ${item.className}` },
    { title: 'Ngày thi', dataIndex: 'examDate', render: (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN') : '—' },
    { title: 'Điểm TB', dataIndex: 'average', render: scoreLabel },
    { title: 'Kết quả', dataIndex: 'average', render: (value: number | null) => value === null ? <Tag>Chưa đủ điểm</Tag> : Number(value) >= 5 ? <Tag color="green">Đạt</Tag> : <Tag color="red">Chưa đạt</Tag> },
  ]} /> : <Empty description="Chưa có lịch sử học tập" />}</div>

  return (
    <StudentLayout activePage="student-results" mainId="student-results" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      <AdminPageHeader kicker="Kết quả học tập" title="Điểm số và chuyên cần" description="Theo dõi từng khóa học, kể cả lớp chưa có kỳ thi." actions={<Space wrap><Select aria-label="Chọn khóa và lớp học" value={enrollmentId} loading={loading} onChange={(value) => { const classId = eligibility.find((item) => item.enrollmentId === value)?.classId; setSelection({ enrollmentId: value, examId: result.exams.find((item) => item.enrollmentId === value && item.classId === classId)?.examId }) }} disabled={loading || Boolean(error) || !eligibility.length} placeholder="Chọn khóa / lớp" style={{ minWidth: 240, maxWidth: '100%' }} options={eligibility.map((item) => ({ value: item.enrollmentId, label: `${item.courseName} · ${enrollmentLabels[item.enrollmentStatus] ?? item.enrollmentStatus} · ${item.classCode ?? 'Chưa xếp lớp'}${item.className ? ` · ${item.className}` : ''}` }))} /><Select aria-label="Chọn kỳ thi" value={exam?.examId} onChange={(value) => setSelection((current) => ({ ...current, examId: value }))} disabled={loading || Boolean(error) || !exams.length} placeholder="Chưa có kỳ thi" style={{ minWidth: 200, maxWidth: '100%' }} options={exams.map((item) => ({ value: item.examId, label: item.examName }))} /><Button loading={loading} onClick={() => setReload((value) => value + 1)}>Làm mới</Button></Space>} />
      {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : error ? <Alert type="error" showIcon title="Chưa tải được kết quả học tập" description={error} action={<Button onClick={() => setReload((value) => value + 1)}>Thử lại</Button>} /> : !eligibility.length && !result.exams.length && !result.attendance.length ? <Empty description="Chưa có dữ liệu học tập" /> : <>
      <AdminSummary items={[
        { label: 'Điểm trung bình kỳ thi', value: scoreLabel(average), detail: exam?.examName ?? 'Chưa có kỳ thi', icon: <ChartBar weight="duotone" /> },
        { label: 'Chuyên cần', value: expectedAttendance ? `${rate.toFixed(1)}%` : '—', detail: `${recordedAttendance}/${expectedAttendance} buổi có điểm danh`, icon: <CalendarCheck weight="duotone" />, tone: rate >= 80 ? 'success' : undefined },
        { label: 'Kỳ thi của lớp', value: exams.length, detail: `${exams.filter((item) => item.average !== null).length} kỳ thi đủ điểm`, icon: <ClockCounterClockwise weight="duotone" /> },
        { label: 'Chứng chỉ', value: condition?.certificateStatus === 'da_cap' ? 'Đã cấp' : condition?.certificateStatus === 'da_duyet' ? 'Đã duyệt' : condition?.eligible ? 'Đủ điều kiện' : 'Chưa đạt', detail: condition?.courseName ?? 'Chưa có khóa học', icon: <Certificate weight="duotone" />, tone: condition?.eligible || condition?.certificateStatus ? 'success' : 'danger' },
      ]} />
      <Card className="student-results-tabs"><Tabs defaultActiveKey="grades" items={[
        { key: 'grades', label: 'Điểm số', children: gradeTab },
        { key: 'attendance', label: 'Chuyên cần', children: attendanceTab },
        { key: 'certificate', label: 'Điều kiện chứng chỉ', children: certificateTab },
        { key: 'history', label: 'Lịch sử học tập', children: historyTab },
      ]} /></Card>
      </>}
    </StudentLayout>
  )
}

export default StudentResults
