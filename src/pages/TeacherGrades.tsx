import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle,
  DownloadSimple,
  Exam,
  PencilSimple,
  Plus,
  Student,
  WarningCircle,
} from '@phosphor-icons/react'
import { Alert, Avatar, Button, Card, Flex, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import TeacherLayout, { type TeacherPage } from './TeacherLayout'
import './TeacherGrades.css'
import { api, errorMessage, json } from '../api'
import { downloadCsv } from '../download'
import AcademicDetails from './AcademicDetails'
import { academicScore } from '../academicScore'

type TeacherGradesProps = {
  onLogout: () => void
  onNavigate: (page: TeacherPage) => void
  onNavigateHome: () => void
}

type Skill = 'listening' | 'speaking' | 'reading' | 'writing'
type Score = Record<Skill, number | null>
type StudentRow = { id: number; code: string; name: string; certificateId: number | null; eligible: boolean; eligibilityReason: string }
type ClassApi = { id: number; code: string; name: string; examLocked: boolean }
type ExamApi = { id: number; name: string; examDate: string | null; deadline: string | null; deadlinePassed?: boolean; locked?: boolean }
type ResultApi = { exam: ExamApi; students: Array<{ enrollmentId: number; studentCode: string; studentName: string; certificateId: number | null; eligible: boolean; eligibilityReason: string; listening: number | null; speaking: number | null; reading: number | null; writing: number | null }> }
type ExamForm = { name: string; examDate?: string; deadline?: string }

const emptyScore = (): Score => ({ listening: null, speaking: null, reading: null, writing: null })

const averageScore = (score: Score) => {
  const values = Object.values(score)
  return values.every((value) => value !== null) ? values.reduce<number>((sum, value) => sum + Number(value), 0) / values.length : null
}

if (import.meta.env.DEV && (averageScore({ listening: 6, speaking: 7, reading: 8, writing: 9 }) !== 7.5 || averageScore(emptyScore()) !== null || averageScore({ listening: 0, speaking: 0, reading: 0, writing: 0 }) !== 0 || Number(academicScore(4.9975)) >= 5)) throw new Error('Grade average check failed')

function TeacherGrades({ onLogout, onNavigate, onNavigateHome }: TeacherGradesProps) {
  const [classes, setClasses] = useState<ClassApi[]>([])
  const [exams, setExams] = useState<ExamApi[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [classId, setClassId] = useState<number>()
  const [examId, setExamId] = useState<number>()
  const [scores, setScores] = useState<Record<number, Score>>({})
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [revision, setRevision] = useState(0)
  const [now, setNow] = useState(Date.now)
  const [creatingExam, setCreatingExam] = useState(false)
  const [examSubmitting, setExamSubmitting] = useState(false)
  const examSubmittingRef = useRef(false)
  const [examForm] = Form.useForm<ExamForm>()
  const [messageApi, messageContext] = message.useMessage()
  const [modalApi, modalContext] = Modal.useModal()
  useEffect(() => { api<ClassApi[]>('/teacher/classes').then((rows) => { const requested = Number(sessionStorage.getItem('teacher-grades-class')); sessionStorage.removeItem('teacher-grades-class'); setClasses(rows); setClassId((current) => current ?? (rows.some((row) => row.id === requested) ? requested : rows[0]?.id)) }).catch((error) => messageApi.error(errorMessage(error))) }, [messageApi])
  useEffect(() => {
    if (!classId) return
    let active = true
    api<ExamApi[]>(`/teacher/classes/${classId}/exams`).then((rows) => { if (active) { setExams(rows); setExamId(rows[0]?.id) } }).catch((error) => { if (active) messageApi.error(errorMessage(error)) })
    return () => { active = false }
  }, [classId, messageApi])
  useEffect(() => {
    if (!examId) { setStudents([]); setScores({}); setSaved(false); setDirty(false); setLoading(false); return }
    let active = true
    setLoading(true); setSaved(false)
    api<ResultApi>(`/teacher/exams/${examId}/results`).then((result) => {
      if (!active) return
      setExams((current) => current.map((item) => item.id === examId ? { ...item, ...result.exam } : item))
      setStudents(result.students.map((item) => ({ id: item.enrollmentId, code: item.studentCode, name: item.studentName, certificateId: item.certificateId, eligible: item.eligible ?? true, eligibilityReason: item.eligibilityReason ?? '' })))
      setScores(Object.fromEntries(result.students.map((item) => [item.enrollmentId, { listening: item.listening, speaking: item.speaking, reading: item.reading, writing: item.writing }])))
      setSaved(result.students.some((item) => [item.listening, item.speaking, item.reading, item.writing].some((value) => value !== null)))
      setDirty(false)
    }).catch((error) => { if (active) { setStudents([]); setScores({}); messageApi.error(errorMessage(error)) } }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [examId, messageApi])
  useEffect(() => {
    if (!dirty && !examSubmitting) return
    const preventUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const confirmHistoryNavigation = (event: Event) => {
      if (examSubmittingRef.current) { event.preventDefault(); messageApi.warning('Đang tạo kỳ thi, vui lòng chờ.'); return }
      if (!window.confirm('Bảng điểm có thay đổi chưa lưu. Bạn có muốn rời trang?')) event.preventDefault()
      else setDirty(false)
    }
    window.addEventListener('beforeunload', preventUnload)
    window.addEventListener('app:history-navigation', confirmHistoryNavigation)
    return () => {
      window.removeEventListener('beforeunload', preventUnload)
      window.removeEventListener('app:history-navigation', confirmHistoryNavigation)
    }
  }, [dirty, examSubmitting, messageApi])

  const results = useMemo(() => students.map((student) => averageScore(scores[student.id] ?? emptyScore())), [scores, students])
  const completed = results.filter((value) => value !== null).length
  const passed = results.filter((value) => value !== null && value >= 5).length
  const classAverage = completed ? results.reduce<number>((sum, value) => sum + (value ?? 0), 0) / completed : null
  const currentExam = exams.find((item) => item.id === examId)
  const deadline = currentExam?.deadline ? new Date(currentExam.deadline.replace(' ', 'T')).getTime() : null
  const deadlinePassed = Boolean(currentExam?.deadlinePassed || (deadline !== null && deadline <= now))
  const locked = Boolean(currentExam?.locked || deadlinePassed)
  const selectedClass = classes.find((item) => item.id === classId)
  useEffect(() => {
    if (deadline === null || !Number.isFinite(deadline) || deadline <= now) return
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(deadline - now, 2_147_483_647))
    return () => window.clearTimeout(timer)
  }, [deadline, now])

  const updateScore = (studentId: number, skill: Skill, value: number | null) => {
    if (locked || loading || saving || examSubmittingRef.current || students.find((item) => item.id === studentId)?.certificateId || students.find((item) => item.id === studentId)?.eligible === false) return
    setScores((current) => ({ ...current, [studentId]: { ...(current[studentId] ?? emptyScore()), [skill]: value } }))
    setDirty(true)
  }

  const confirmDiscard = (action: () => void) => {
    if (saving) { messageApi.warning('Đang lưu bảng điểm, vui lòng chờ.'); return }
    if (examSubmittingRef.current) { messageApi.warning('Đang tạo kỳ thi, vui lòng chờ.'); return }
    if (!dirty) { action(); return }
    modalApi.confirm({ title: 'Bỏ thay đổi chưa lưu?', content: 'Các điểm đang nhập sẽ bị mất.', okText: 'Bỏ thay đổi', cancelText: 'Ở lại', okButtonProps: { danger: true }, onOk: () => { setDirty(false); action() } })
  }

  const createExam = async (values: ExamForm) => {
    if (!classId || examSubmittingRef.current) return
    if (dirty) { messageApi.warning('Hãy lưu hoặc bỏ thay đổi bảng điểm trước khi tạo kỳ thi mới.'); return }
    examSubmittingRef.current = true
    setExamSubmitting(true)
    try {
      const created = await api<ExamApi>(`/teacher/classes/${classId}/exams`, json('POST', values))
      setExams((current) => [created, ...current]); setDirty(false); setExamId(created.id); setCreatingExam(false); examForm.resetFields(); messageApi.success('Đã tạo kỳ thi.')
    } catch (error) { messageApi.error(errorMessage(error)) }
    finally { examSubmittingRef.current = false; setExamSubmitting(false) }
  }

  const persist = async () => {
    if (!examId || loading || saving || locked || examSubmittingRef.current) return
    if (deadline !== null && deadline <= Date.now()) { setNow(Date.now()); messageApi.warning('Đã hết hạn chỉnh sửa điểm.'); return }
    setSaving(true)
    try {
      await api(`/teacher/exams/${examId}/results`, json('PUT', { items: students.filter((student) => !student.certificateId && student.eligible).map((student) => ({ enrollmentId: student.id, ...(scores[student.id] ?? emptyScore()) })) }))
      setSaved(true); setDirty(false); messageApi.success(completed === students.length ? 'Đã lưu bảng điểm đầy đủ.' : 'Đã lưu điểm đang nhập. Điểm còn trống chưa được tính là 0.')
      setRevision((value) => value + 1)
    } catch (error) { messageApi.error(errorMessage(error)) }
    finally { setSaving(false) }
  }

  const saveGrades = () => {
    if (!saved) {
      void persist()
      return
    }
    modalApi.confirm({ title: 'Ghi đè bảng điểm?', content: 'Bảng điểm này đã được lưu. Kết quả mới sẽ thay thế dữ liệu trước đó.', okText: 'Ghi đè', cancelText: 'Hủy', onOk: persist })
  }

  const scoreColumn = (title: string, skill: Skill): ColumnsType<StudentRow>[number] => ({
    title, key: skill, width: 116, align: 'center',
    render: (_, student) => <InputNumber aria-label={`${title} - ${student.name}`} disabled={locked || loading || saving || examSubmitting || Boolean(student.certificateId) || !student.eligible} min={0} max={10} step={0.5} precision={2} value={(scores[student.id] ?? emptyScore())[skill]} onChange={(value) => updateScore(student.id, skill, value)} />,
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
      render: (_, student) => <strong className="grade-average">{academicScore(averageScore(scores[student.id] ?? emptyScore()))}</strong>,
    },
    {
      title: 'Kết quả', key: 'result', width: 110,
      render: (_, student) => { const average = averageScore(scores[student.id] ?? emptyScore()); return <Space orientation="vertical" size={2}>{average === null ? <Tag>Chưa đủ điểm</Tag> : average >= 5 ? <Tag color="green">Đạt</Tag> : <Tag color="red">Chưa đạt</Tag>}{!student.eligible && <Typography.Text type="warning">{student.eligibilityReason || 'Chưa hoàn tất học phí'}</Typography.Text>}{student.certificateId && <Tag>Đã chốt hồ sơ</Tag>}</Space> },
    },
  ]

  return (
    <TeacherLayout activePage="teacher-grades" mainId="teacher-grades" onLogout={() => confirmDiscard(onLogout)} onNavigate={(page) => confirmDiscard(() => onNavigate(page))} onNavigateHome={() => confirmDiscard(onNavigateHome)}>
      {messageContext}{modalContext}
      <AdminPageHeader
        kicker="Kết quả học tập"
        title="Nhập điểm thi"
        description="Có thể lưu điểm từng phần. Chỉ tính trung bình khi đủ bốn kỹ năng; điểm trống khác điểm 0."
        actions={<Space wrap><Button icon={<Plus />} disabled={!classId || selectedClass?.examLocked || saving || loading || examSubmitting || dirty} onClick={() => { examForm.resetFields(); setCreatingExam(true) }}>Tạo kỳ thi</Button><Button icon={<DownloadSimple />} disabled={!students.length || loading} onClick={() => downloadCsv([['Mã học viên', 'Họ tên', 'Nghe', 'Nói', 'Đọc', 'Viết'], ...students.map((item) => [item.code, item.name, ...Object.values(scores[item.id] ?? emptyScore()).map((value) => value ?? '')])], 'bang-diem-ky-thi.csv')}>Xuất CSV kỳ này</Button></Space>}
      />

      <Alert className="teacher-grades-alert" type={locked ? 'warning' : 'info'} showIcon title={currentExam?.locked ? 'Bảng điểm không được chỉnh sửa' : deadlinePassed ? 'Đã hết hạn chỉnh sửa điểm' : 'Thời hạn nhập điểm'} description={currentExam?.locked ? 'Lớp học không còn cho phép cập nhật bảng điểm.' : `${currentExam?.deadline ? `Hạn chỉnh sửa: ${new Date(currentExam.deadline.replace(' ', 'T')).toLocaleString('vi-VN')}.` : 'Kỳ thi chưa đặt hạn sửa điểm.'} ${selectedClass?.examLocked ? 'Danh sách kỳ thi đã chốt; chỉ sửa điểm học viên chưa được duyệt chứng chỉ.' : 'Điểm học viên đã được duyệt chứng chỉ sẽ bị khóa.'}`} />

      <Card className="grades-filter-card">
        <Flex align="flex-end" justify="space-between" gap={18} wrap>
          <Space size={14} wrap>
            <label><Typography.Text>Lớp học</Typography.Text><Select disabled={saving || examSubmitting} value={classId} onChange={(value) => confirmDiscard(() => { setExamId(undefined); setExams([]); setClassId(value) })} options={classes.map((item) => ({ value: item.id, label: `${item.name} · ${item.code}` }))} /></label>
            <label><Typography.Text>Kỳ đánh giá</Typography.Text><Select disabled={saving || examSubmitting} value={examId} onChange={(value) => confirmDiscard(() => setExamId(value))} options={exams.map((item) => ({ value: item.id, label: item.name }))} /></label>
          </Space>
          <Tag color={dirty ? 'orange' : saved ? 'green' : 'default'}>{dirty ? 'Có thay đổi chưa lưu' : saved ? 'Đã lưu' : 'Chưa nhập điểm'}</Tag>
        </Flex>
      </Card>

      <AdminSummary items={[
        { label: 'Sĩ số', value: students.length, detail: 'Học viên trong danh sách thi', icon: <Student weight="duotone" /> },
        { label: 'Đã nhập đủ', value: completed, detail: `${students.length - completed} học viên còn thiếu điểm`, icon: <PencilSimple weight="duotone" /> },
        { label: 'Điểm trung bình', value: academicScore(classAverage), detail: 'Tính trên học viên đã đủ điểm', icon: <Exam weight="duotone" /> },
        { label: 'Đạt yêu cầu', value: passed, detail: 'Điểm trung bình từ 5,0', icon: <CheckCircle weight="duotone" />, tone: 'success' },
      ]} />

      <Card
        className="admin-table-card grades-table-card"
        title="Bảng điểm bốn kỹ năng"
        extra={<Button type="primary" loading={saving} disabled={!examId || !students.length || loading || locked || students.every((student) => Boolean(student.certificateId) || !student.eligible)} icon={completed < students.length ? <WarningCircle /> : <CheckCircle />} onClick={saveGrades}>Lưu bảng điểm</Button>}
      >
        <Table loading={loading} columns={columns} dataSource={students} rowKey="id" pagination={false} scroll={{ x: 1080, y: 540 }} />
      </Card>
      {classId && <AcademicDetails classId={classId} teacher section="grades" revision={revision} />}
      <Modal title="Tạo kỳ thi" open={creatingExam} onCancel={() => { if (!examSubmittingRef.current) setCreatingExam(false) }} onOk={() => examForm.submit()} confirmLoading={examSubmitting} cancelButtonProps={{ disabled: examSubmitting }} closable={!examSubmitting} keyboard={!examSubmitting} maskClosable={!examSubmitting} okText="Tạo kỳ thi" destroyOnHidden>
        <Form form={examForm} layout="vertical" onFinish={createExam} style={{ marginTop: 20 }}>
          <Form.Item label="Lớp học"><Input value={classes.find((item) => item.id === classId)?.name ?? ''} disabled /></Form.Item>
          <Form.Item name="name" label="Tên kỳ thi" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên kỳ thi.' }]}><Input placeholder="VD: Thi cuối khóa" /></Form.Item>
          <Form.Item name="examDate" label="Ngày thi"><Input type="date" /></Form.Item>
          <Form.Item name="deadline" label="Hạn sửa điểm" dependencies={['examDate']} rules={[{ validator: (_, value) => !value || !examForm.getFieldValue('examDate') || new Date(value).getTime() >= new Date(`${examForm.getFieldValue('examDate')}T00:00`).getTime() ? Promise.resolve() : Promise.reject(new Error('Hạn sửa điểm không được trước ngày thi.')) }]}><Input type="datetime-local" /></Form.Item>
        </Form>
      </Modal>
    </TeacherLayout>
  )
}

export default TeacherGrades
