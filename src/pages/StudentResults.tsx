import {
  CalendarCheck,
  Certificate,
  ChartBar,
  CheckCircle,
  ClockCounterClockwise,
  Exam,
  Receipt,
  WarningCircle,
} from '@phosphor-icons/react'
import { Alert, Card, Col, Flex, Progress, Row, Table, Tabs, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import StudentLayout, { type StudentPage } from './StudentLayout'
import './StudentResults.css'

type StudentResultsProps = {
  onLogout: () => void
  onNavigate: (page: StudentPage) => void
  onNavigateHome: () => void
}

type Score = { key: string; skill: string; score: number; note: string }
type Attendance = { key: string; date: string; session: string; status: 'Có mặt' | 'Đi muộn' | 'Vắng'; note: string }

const scores: Score[] = [
  { key: 'listening', skill: 'Nghe', score: 7, note: 'Nắm ý chính tốt' },
  { key: 'speaking', skill: 'Nói', score: 6.5, note: 'Cần cải thiện độ trôi chảy' },
  { key: 'reading', skill: 'Đọc', score: 7.5, note: 'Từ vựng và tốc độ tốt' },
  { key: 'writing', skill: 'Viết', score: 6, note: 'Cần chú ý cấu trúc câu' },
]

const attendanceRows: Attendance[] = [
  { key: '1', date: '23/09/2026', session: 'Buổi 14', status: 'Có mặt', note: 'Đúng giờ' },
  { key: '2', date: '21/09/2026', session: 'Buổi 13', status: 'Đi muộn', note: 'Muộn 12 phút' },
  { key: '3', date: '18/09/2026', session: 'Buổi 12', status: 'Có mặt', note: 'Đúng giờ' },
  { key: '4', date: '16/09/2026', session: 'Buổi 11', status: 'Vắng', note: 'Có phép' },
  { key: '5', date: '14/09/2026', session: 'Buổi 10', status: 'Có mặt', note: 'Đúng giờ' },
]

const averageScore = (values: Score[]) => values.reduce((total, item) => total + item.score, 0) / values.length
const attendanceRate = (present: number, late: number, absent: number) => Math.round((present / (present + late + absent)) * 100)
const average = averageScore(scores)
const rate = attendanceRate(12, 1, 1)

if (import.meta.env.DEV && (average.toFixed(1) !== '6.8' || attendanceRate(6, 1, 1) !== 75)) throw new Error('Student result calculation check failed')

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
  const gradeTab = <div className="student-result-panel">
    <Alert type="success" showIcon title="Bạn đang đạt yêu cầu giữa khóa" description="Điểm trung bình hiện tại là 6,8/10. Kết quả cuối khóa sẽ được cập nhật sau kỳ thi." />
    <Row gutter={[14, 14]} className="student-skill-cards">
      {scores.map((item) => <Col xs={12} lg={6} key={item.key}><Card size="small"><Flex justify="space-between" align="center"><span>{item.skill}</span><strong>{item.score.toFixed(1)}</strong></Flex><Progress percent={item.score * 10} showInfo={false} strokeColor="#397359" /></Card></Col>)}
    </Row>
    <Card className="admin-table-card" title="Chi tiết điểm giữa khóa" extra={<Tag color="green">Đã công bố</Tag>}><Table columns={scoreColumns} dataSource={scores} pagination={false} scroll={{ x: 620 }} /></Card>
  </div>

  const attendanceTab = <div className="student-result-panel">
    <Row gutter={[14, 14]} className="student-attendance-cards">
      <Col xs={24} md={8}><Card><span className="student-result-label">Có mặt</span><strong>12</strong><small>buổi học</small></Card></Col>
      <Col xs={24} md={8}><Card><span className="student-result-label">Đi muộn</span><strong>1</strong><small>buổi học</small></Card></Col>
      <Col xs={24} md={8}><Card><span className="student-result-label">Vắng</span><strong>1</strong><small>buổi học</small></Card></Col>
    </Row>
    <Card className="student-attendance-progress"><Flex align="center" gap={24} wrap><Progress type="circle" percent={rate} strokeColor="#397359" size={104} /><div><Typography.Title level={4}>Tỷ lệ chuyên cần đạt yêu cầu</Typography.Title><Typography.Paragraph type="secondary">Trung tâm yêu cầu tối thiểu 80% để đủ điều kiện dự thi cuối khóa.</Typography.Paragraph><Tag color="green"><CheckCircle weight="fill" /> Đạt điều kiện</Tag></div></Flex></Card>
    <Card className="admin-table-card" title="Lịch sử điểm danh gần đây"><Table columns={attendanceColumns} dataSource={attendanceRows} pagination={false} scroll={{ x: 620 }} /></Card>
  </div>

  const certificateTab = <div className="student-result-panel">
    <Alert type="warning" showIcon title="Chưa đủ điều kiện nhận chứng chỉ" description="Bạn cần hoàn thành khóa học, thanh toán học phí và đạt kỳ thi cuối khóa." />
    <Card className="student-certificate-card" title="Điều kiện xét chứng chỉ A2">
      <div className="student-condition-list">
        <div><CheckCircle weight="fill" /><span><strong>Chuyên cần từ 80%</strong><small>Hiện tại: 86%</small></span><Tag color="green">Đạt</Tag></div>
        <div><CheckCircle weight="fill" /><span><strong>Điểm trung bình từ 5,0</strong><small>Giữa khóa: 6,8</small></span><Tag color="green">Đạt</Tag></div>
        <div className="pending"><WarningCircle weight="fill" /><span><strong>Hoàn thành đủ 24 buổi học</strong><small>Hiện tại: 14/24 buổi</small></span><Tag color="orange">Đang học</Tag></div>
        <div className="blocked"><Receipt weight="fill" /><span><strong>Hoàn tất học phí</strong><small>Còn phải thanh toán: 2.400.000đ</small></span><Tag color="red">Chưa đạt</Tag></div>
        <div className="pending"><Exam weight="fill" /><span><strong>Đạt kỳ thi cuối khóa</strong><small>Chưa có kết quả</small></span><Tag>Chưa xét</Tag></div>
      </div>
    </Card>
  </div>

  const historyTab = <div className="student-result-panel">
    <Card className="student-history-card">
      <Flex align="flex-start" justify="space-between" gap={16} wrap><div><Tag color="green">Đã hoàn thành</Tag><Typography.Title level={3}>Tiếng Anh căn bản A1</Typography.Title><Typography.Paragraph type="secondary">Lớp TA-A1-12 · 03/2025–06/2025</Typography.Paragraph></div><div className="student-history-score"><small>Điểm cuối khóa</small><strong>7.2</strong></div></Flex>
      <div className="student-history-meta"><span><CalendarCheck />Chuyên cần 92%</span><span><Certificate />Chứng chỉ CC-A1-2025-0182</span></div>
    </Card>
  </div>

  return (
    <StudentLayout activePage="student-results" mainId="student-results" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      <AdminPageHeader kicker="Kết quả học tập" title="Điểm số và chuyên cần" description="Theo dõi kết quả bốn kỹ năng, lịch sử điểm danh và điều kiện nhận chứng chỉ." />
      <AdminSummary items={[
        { label: 'Điểm trung bình', value: average.toFixed(1), detail: 'Kết quả giữa khóa', icon: <ChartBar weight="duotone" /> },
        { label: 'Chuyên cần', value: `${rate}%`, detail: '12 có mặt · 1 muộn · 1 vắng', icon: <CalendarCheck weight="duotone" />, tone: 'success' },
        { label: 'Tiến độ', value: '14/24', detail: 'Buổi học đã hoàn thành', icon: <ClockCounterClockwise weight="duotone" /> },
        { label: 'Chứng chỉ', value: 'Chưa xét', detail: 'Còn 3 điều kiện cần hoàn tất', icon: <Certificate weight="duotone" />, tone: 'danger' },
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
