import { useEffect, useState } from 'react'
import {
  CalendarCheck,
  Certificate,
  ChartBar,
  CheckCircle,
  ClockCounterClockwise,
  Receipt,
} from '@phosphor-icons/react'
import { Alert, Card, Col, Empty, Flex, Progress, Row, Select, Table, Tabs, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import StudentLayout, { type StudentPage } from './StudentLayout'
import './StudentResults.css'
import { api, errorMessage } from '../api'

type StudentResultsProps = {
  onLogout: () => void
  onNavigate: (page: StudentPage) => void
  onNavigateHome: () => void
}

type Score = { key: string; skill: string; score: number; note: string }
type Attendance = { key: string; date: string; session: string; status: 'Có mặt' | 'Đi muộn' | 'Vắng'; note: string }
type ExamResult = { examId: number; enrollmentId: number; examName: string; examDate: string | null; classId: number; classCode: string; className: string; listening: number | null; speaking: number | null; reading: number | null; writing: number | null; average: number | null }
type ResultApi = { exams: ExamResult[]; attendance: Array<{ sessionId: number; enrollmentId: number; classId: number; className: string; startsAt: string; status: 'co_mat' | 'di_muon' | 'vang'; note: string | null }> }
type Eligibility = { enrollmentId: number; classId: number; courseName: string; attendance: number; average: number | null; paid: boolean; eligible: boolean; ineligibleReasons: string[] }

const scoreColumns: ColumnsType<Score> = [
  { title: 'Kỹ năng', dataIndex: 'skill', render: (skill) => <Typography.Text strong>{skill}</Typography.Text> },
  { title: 'Điểm', dataIndex: 'score', width: 140, render: (score) => <strong className="student-result-score">{score.toFixed(1)}</strong> },
  { title: 'Nhận xét', dataIndex: 'note' },
]

const attendanceColumns: ColumnsType<Attendance> = [
  { title: 'Ngày học', dataIndex: 'date', width: 150 },
  { title: 'Buổi', dataIndex: 'session', width: 110 },
  { title: 'Trạng thái', dataIndex: 'status', width: 140, render: (status: Attendance['status']) => <Tag color={status === 'Có mặt' ? 'green' : status === 'Đi muộn' ? 'orange' : 'red'}>{status}</Tag> },
  { title: 'Ghi chú', dataIndex: 'note' },
]

function StudentResults({ onLogout, onNavigate, onNavigateHome }: StudentResultsProps) {
  const [result, setResult] = useState<ResultApi>({ exams: [], attendance: [] })
  const [eligibility, setEligibility] = useState<Eligibility[]>([])
  const [examId, setExamId] = useState<number>()
  const [messageApi, contextHolder] = message.useMessage()
  useEffect(() => { Promise.all([api<ResultApi>('/student/results'), api<Eligibility[]>('/student/certificate-eligibility')]).then(([data, conditions]) => { setResult(data); setEligibility(conditions); setExamId((current) => current ?? data.exams[0]?.examId) }).catch((error) => messageApi.error(errorMessage(error))) }, [messageApi])
  const exam = result.exams.find((item) => item.examId === examId) ?? result.exams[0]
  const scores: Score[] = exam ? [
    { key: 'listening', skill: 'Nghe', score: Number(exam.listening ?? 0), note: exam.listening === null ? 'Chưa có điểm' : exam.examName },
    { key: 'speaking', skill: 'Nói', score: Number(exam.speaking ?? 0), note: exam.speaking === null ? 'Chưa có điểm' : exam.examName },
    { key: 'reading', skill: 'Đọc', score: Number(exam.reading ?? 0), note: exam.reading === null ? 'Chưa có điểm' : exam.examName },
    { key: 'writing', skill: 'Viết', score: Number(exam.writing ?? 0), note: exam.writing === null ? 'Chưa có điểm' : exam.examName },
  ] : []
  const selectedEnrollmentId = exam?.enrollmentId ?? eligibility[0]?.enrollmentId
  const attendanceRows: Attendance[] = result.attendance.filter((item) => selectedEnrollmentId === undefined || item.enrollmentId === selectedEnrollmentId).map((item) => ({ key: `${item.enrollmentId}-${item.sessionId}`, date: new Date(item.startsAt).toLocaleDateString('vi-VN'), session: item.className, status: item.status === 'co_mat' ? 'Có mặt' : item.status === 'di_muon' ? 'Đi muộn' : 'Vắng', note: item.note ?? '—' }))
  const present = attendanceRows.filter((item) => item.status === 'Có mặt').length
  const late = attendanceRows.filter((item) => item.status === 'Đi muộn').length
  const absent = attendanceRows.filter((item) => item.status === 'Vắng').length
  const rate = attendanceRows.length ? Math.round((present + late) * 100 / attendanceRows.length) : 0
  const average = Number(exam?.average ?? 0)
  const condition = eligibility.find((item) => item.enrollmentId === selectedEnrollmentId)
  const gradeTab = <div className="student-result-panel">
    <Alert type={average >= 5 ? 'success' : 'info'} showIcon title={exam ? `${exam.examName} · ${exam.className}` : 'Chưa có kết quả thi'} description={exam ? `Điểm trung bình hiện tại là ${average.toFixed(1)}/10.` : 'Kết quả sẽ hiển thị sau khi giáo viên nhập điểm.'} />
    <Row gutter={[14, 14]} className="student-skill-cards">
      {scores.map((item) => <Col xs={12} lg={6} key={item.key}><Card size="small"><Flex justify="space-between" align="center"><span>{item.skill}</span><strong>{item.score.toFixed(1)}</strong></Flex><Progress percent={item.score * 10} showInfo={false} strokeColor="#397359" /></Card></Col>)}
    </Row>
    <Card className="admin-table-card" title="Chi tiết điểm giữa khóa" extra={<Tag color="green">Đã công bố</Tag>}><Table columns={scoreColumns} dataSource={scores} pagination={false} scroll={{ x: 620 }} /></Card>
  </div>

  const attendanceTab = <div className="student-result-panel">
    <Row gutter={[14, 14]} className="student-attendance-cards">
      <Col xs={24} md={8}><Card><span className="student-result-label">Có mặt</span><strong>{present}</strong><small>buổi học</small></Card></Col>
      <Col xs={24} md={8}><Card><span className="student-result-label">Đi muộn</span><strong>{late}</strong><small>buổi học</small></Card></Col>
      <Col xs={24} md={8}><Card><span className="student-result-label">Vắng</span><strong>{absent}</strong><small>buổi học</small></Card></Col>
    </Row>
    <Card className="student-attendance-progress"><Flex align="center" gap={24} wrap><Progress type="circle" percent={rate} strokeColor={rate >= 80 ? '#397359' : '#c43d3d'} size={104} /><div><Typography.Title level={4}>Tỷ lệ chuyên cần {rate >= 80 ? 'đạt yêu cầu' : 'chưa đạt yêu cầu'}</Typography.Title><Typography.Paragraph type="secondary">Trung tâm yêu cầu tối thiểu 80% để đủ điều kiện dự thi cuối khóa.</Typography.Paragraph><Tag color={rate >= 80 ? 'green' : 'red'}><CheckCircle weight="fill" /> {rate >= 80 ? 'Đạt điều kiện' : 'Chưa đạt'}</Tag></div></Flex></Card>
    <Card className="admin-table-card" title="Lịch sử điểm danh gần đây"><Table columns={attendanceColumns} dataSource={attendanceRows} pagination={false} scroll={{ x: 620 }} /></Card>
  </div>

  const certificateTab = <div className="student-result-panel">
    <Alert type={condition?.eligible ? 'success' : 'warning'} showIcon title={condition?.eligible ? 'Đủ điều kiện nhận chứng chỉ' : 'Chưa đủ điều kiện nhận chứng chỉ'} description={condition?.eligible ? 'Hồ sơ đang chờ quản trị viên xét duyệt.' : condition?.ineligibleReasons.join('; ') || 'Chưa có khóa học để xét.'} />
    <Card className="student-certificate-card" title={`Điều kiện xét chứng chỉ ${condition?.courseName ?? ''}`}>
      <div className="student-condition-list">
        <div><CheckCircle weight="fill" /><span><strong>Chuyên cần từ 80%</strong><small>Hiện tại: {condition?.attendance ?? 0}%</small></span><Tag color={Number(condition?.attendance ?? 0) >= 80 ? 'green' : 'red'}>{Number(condition?.attendance ?? 0) >= 80 ? 'Đạt' : 'Chưa đạt'}</Tag></div>
        <div><CheckCircle weight="fill" /><span><strong>Điểm trung bình từ 5,0</strong><small>Hiện tại: {condition?.average ?? 'Chưa có'}</small></span><Tag color={Number(condition?.average ?? 0) >= 5 ? 'green' : 'red'}>{Number(condition?.average ?? 0) >= 5 ? 'Đạt' : 'Chưa đạt'}</Tag></div>
        <div className={condition?.paid ? '' : 'blocked'}><Receipt weight="fill" /><span><strong>Hoàn tất học phí</strong></span><Tag color={condition?.paid ? 'green' : 'red'}>{condition?.paid ? 'Đạt' : 'Chưa đạt'}</Tag></div>
      </div>
    </Card>
  </div>

  const historyTab = <div className="student-result-panel">{result.exams.length ? <Table rowKey="examId" pagination={false} scroll={{ x: 720 }} dataSource={result.exams} columns={[
    { title: 'Kỳ thi', dataIndex: 'examName', render: (value: string) => <Typography.Text strong>{value}</Typography.Text> },
    { title: 'Lớp học', key: 'class', render: (_: unknown, item: ExamResult) => `${item.classCode} · ${item.className}` },
    { title: 'Ngày thi', dataIndex: 'examDate', render: (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN') : '—' },
    { title: 'Điểm TB', dataIndex: 'average', render: (value: number | null) => value === null ? 'Chưa có' : Number(value).toFixed(1) },
    { title: 'Kết quả', dataIndex: 'average', render: (value: number | null) => value === null ? <Tag>Chưa công bố</Tag> : Number(value) >= 5 ? <Tag color="green">Đạt</Tag> : <Tag color="red">Chưa đạt</Tag> },
  ]} /> : <Empty description="Chưa có lịch sử học tập" />}</div>

  return (
    <StudentLayout activePage="student-results" mainId="student-results" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      {contextHolder}
      <AdminPageHeader kicker="Kết quả học tập" title="Điểm số và chuyên cần" description="Theo dõi kết quả bốn kỹ năng, lịch sử điểm danh và điều kiện nhận chứng chỉ." actions={<Select value={exam?.examId} onChange={setExamId} disabled={!result.exams.length} placeholder="Chọn kỳ thi" style={{ minWidth: 240 }} options={result.exams.map((item) => ({ value: item.examId, label: `${item.examName} · ${item.className}` }))} />} />
      <AdminSummary items={[
        { label: 'Điểm trung bình', value: exam?.average === null || !exam ? '—' : average.toFixed(1), detail: exam?.examName ?? 'Chưa có kết quả', icon: <ChartBar weight="duotone" /> },
        { label: 'Chuyên cần', value: `${rate}%`, detail: `${present} có mặt · ${late} muộn · ${absent} vắng`, icon: <CalendarCheck weight="duotone" />, tone: 'success' },
        { label: 'Kỳ thi', value: result.exams.length, detail: 'Kết quả đã công bố', icon: <ClockCounterClockwise weight="duotone" /> },
        { label: 'Chứng chỉ', value: condition?.eligible ? 'Đủ điều kiện' : 'Chưa đạt', detail: condition?.courseName ?? 'Chưa có khóa học', icon: <Certificate weight="duotone" />, tone: condition?.eligible ? 'success' : 'danger' },
      ]} />
      <Card className="student-results-tabs"><Tabs defaultActiveKey="grades" items={[
        { key: 'grades', label: 'Điểm số', children: gradeTab },
        { key: 'attendance', label: 'Chuyên cần', children: attendanceTab },
        { key: 'certificate', label: 'Điều kiện chứng chỉ', children: certificateTab },
        { key: 'history', label: 'Lịch sử học tập', children: historyTab },
      ]} /></Card>
    </StudentLayout>
  )
}

export default StudentResults
