// Run: node scripts/check-admin-pages.mjs — real page handlers, mocked API, no server/data writes.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const jsx = (type, props) => ({ type, props })
const text = (value) => value == null || typeof value === 'boolean' ? '' : Array.isArray(value) ? value.map(text).join('') : typeof value === 'object' ? text(value.props?.children) : String(value)
const nodes = (value) => !value || typeof value !== 'object' ? [] : [...(value.type && value.props ? [value] : []), ...Object.values(value).flatMap(nodes)]
const same = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]))

function harness(page, initial) {
  let cursor = 0, tree
  const hooks = [], effects = [], calls = [], confirmations = [], responses = new Map(Object.entries(initial))
  const slot = (init) => { const index = cursor++; return hooks[index] ??= init() }
  const react = {
    useState: (initialValue) => { const state = slot(() => ({ value: initialValue })); return [state.value, (value) => { state.value = typeof value === 'function' ? value(state.value) : value }] },
    useRef: (value) => slot(() => ({ current: value })),
    useMemo: (fn, deps) => { const state = slot(() => ({})); if (!same(state.deps, deps)) { state.value = fn(); state.deps = deps } return state.value },
    useEffect: (fn, deps) => { const state = slot(() => ({})); if (!same(state.deps, deps)) { state.deps = deps; effects.push(() => { state.cleanup?.(); state.cleanup = fn() }) } },
  }
  const api = async (path, options = {}) => {
    calls.push({ path, options })
    const result = responses.get(path)
    if (result instanceof Error) throw result
    return typeof result === 'function' ? result(options) : result ?? []
  }
  const form = { setFieldsValue() {}, resetFields() {}, setFields() {}, submit() {}, setFieldValue() {} }
  const antd = Object.fromEntries(['Alert', 'Avatar', 'Button', 'Card', 'Descriptions', 'Drawer', 'Flex', 'InputNumber', 'Popconfirm', 'Progress', 'Select', 'Table', 'Tabs', 'Tag', 'Timeline'].map((key) => [key, key]))
  const Form = Object.assign(() => {}, { Item: 'FormItem', useForm: () => [form], useWatch: () => undefined })
  const messageApi = { success() {}, warning() {}, error() {} }
  Object.assign(antd, {
    Form, Input: Object.assign(() => {}, { TextArea: 'TextArea', Password: 'Password' }),
    Space: Object.assign(() => {}, { Compact: 'Compact' }), Typography: { Text: 'Text', Paragraph: 'Paragraph', Title: 'Title' },
    Modal: Object.assign(() => {}, { useModal: () => [{ confirm: (options) => confirmations.push(options), warning: (options) => confirmations.push(options) }, null] }),
    message: { useMessage: () => [messageApi, null] },
  })
  const compiled = ts.transpileModule(readFileSync(new URL(`../src/pages/${page}.tsx`, import.meta.url), 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText
  const exports = {}
  vm.runInNewContext(compiled, { exports, require: (name) => {
    if (name === 'react') return react
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' }
    if (name === 'antd') return antd
    if (name === '../api') return { api, apiBlob: api, errorMessage: (error) => error.message, json: (method, body) => ({ method, body: JSON.stringify(body) }), ApiError: Error }
    if (name === './AdminPageKit') return { AdminPageHeader: 'Header', AdminSummary: 'Summary' }
    if (name === '@phosphor-icons/react') return new Proxy({}, { get: (_, key) => String(key) })
    return { __esModule: true, default: name }
  }, Date, Intl })
  const render = () => { cursor = 0; tree = exports.default({ onLogout() {}, onNavigate() {}, onNavigateHome() {} }); for (const effect of effects.splice(0)) effect(); return tree }
  const flush = async () => { for (let i = 0; i < 12; i++) { await Promise.resolve(); render() } }
  const all = (type, predicate = () => true) => nodes(tree).filter((node) => node.type === type && predicate(node.props)).map((node) => node.props)
  const find = (type, predicate) => { const found = all(type, predicate)[0]; assert.ok(found, `${page}: missing ${type}`); return found }
  const button = (label) => find('Button', (props) => text(props.children) === label)
  render()
  return { flush, find, all, button, Form, Modal: antd.Modal, calls, confirmations, set: (path, response) => responses.set(path, response) }
}

const routes = ['/users?role=hoc_vien', '/enrollments', '/invoices', '/courses/all', '/classes', '/rooms', '/schedules', '/users?role=giao_vien', '/exams']
for (const [page, failingRoute, action] of [
  ['AdminStudents', '/users?role=hoc_vien', 'Thêm học viên'], ['AdminCourses', '/courses/all', 'Thêm khóa học'],
  ['AdminClasses', '/classes', 'Tạo lớp học'], ['AdminTeachers', '/users?role=giao_vien', 'Thêm giáo viên'],
  ['AdminSchedule', '/schedules', 'Xếp lịch mới'], ['AdminExams', '/exams', 'Tạo kỳ thi'],
]) {
  const mock = Object.fromEntries(routes.map((route) => [route, []])); mock[failingRoute] = new Error('Mất kết nối')
  const pageState = harness(page, mock)
  assert.equal(pageState.all('Summary').length, 0, 'loading never displays zero metrics')
  await pageState.flush()
  assert.equal(pageState.all('Summary').length, 0, 'load failure never displays zero metrics')
  assert.equal(pageState.button(action).disabled, true, 'mutation disabled after failure')
  assert.match(pageState.find('Table').locale.emptyText, /Chưa tải được/, 'failed fetch is not a genuinely empty list')
  pageState.set(failingRoute, []); pageState.button('Thử lại').onClick(); await pageState.flush()
  assert.equal(pageState.all('Alert', (props) => props.type === 'error').length, 0, 'retry recovers in-place')
}

const student = { id: 1, code: 'HV1', fullName: 'Học viên', email: 'hv@example.test', phone: '0912345678', birthDate: '2000-01-01', active: 1, createdAt: '2026-01-01' }
const studentPage = harness('AdminStudents', { '/users?role=hoc_vien': [student], '/enrollments': [{ id: 10, studentId: 1, courseId: 1, courseName: 'Khóa', classId: null, className: null, status: 'da_huy', attendance: 0, canChangeClass: 0, enrolledAt: '2026-01-01' }] })
await studentPage.flush()
let table = studentPage.find('Table'), row = table.dataSource[0]
assert.equal(table.size, 'small', 'student rows use the compact table spacing')
assert.ok(table.scroll.x > 0 && table.scroll.x <= 840, 'student table fits a narrower desktop content area')
assert.deepEqual(Array.from(table.columns, (column) => column.key ?? column.dataIndex), ['student', 'class', 'attendance', 'debt', 'status', 'active', 'action'], 'compact layout keeps every existing column')
assert.equal(table.rowKey(row), '1-10', 'row identity still includes the student and enrollment')
const studentAction = table.columns.find((column) => column.key === 'action')
assert.equal(studentAction.fixed, 'right', 'profile action remains visible when the table overflows')
assert.ok(studentAction.width > 0 && studentAction.width <= 56, 'profile action keeps a narrow column')
const profileButton = studentAction.render(null, row).props
assert.equal(profileButton['aria-label'], `Xem hồ sơ ${row.name}`)
assert.equal(profileButton.disabled, false)
studentPage.find('Select', (props) => props['aria-label'] === 'Trạng thái ghi danh').onChange('Đang học'); await studentPage.flush()
assert.equal(studentPage.find('Table').dataSource.length, 0, 'enrollment status filter still excludes unmatched rows')
studentPage.find('Select', (props) => props['aria-label'] === 'Trạng thái ghi danh').onChange('Đã hủy'); await studentPage.flush()
assert.equal(studentPage.find('Table').dataSource[0], row, 'filter restores the same enrollment row')
profileButton.onClick(); await studentPage.flush()
assert.equal(studentPage.find('Drawer').open, true)
assert.equal(studentPage.find('Tabs').activeKey, 'profile')
assert.equal(studentPage.find('Descriptions').items.find((item) => item.key === 'email').children, row.email, 'profile opens the selected student')
assert.equal(studentPage.button('Xóa hồ sơ').disabled, true, 'any historical enrollment prevents account deletion')
const unlinked = harness('AdminStudents', { '/users?role=hoc_vien': [student] }); await unlinked.flush()
table = unlinked.find('Table'); table.columns.find((column) => column.key === 'action').render(null, table.dataSource[0]).props.onClick(); await unlinked.flush()
assert.equal(unlinked.button('Xóa hồ sơ').disabled, false, 'unlinked account may be deleted')

const course = { id: 1, code: 'K1', name: 'Khóa', language: 'Tiếng Anh', level: 'A1', sessions: 1, tuition: 1000, linkedClasses: 0, description: '', status: 'dang_mo' }
const previewPath = '/enrollments/import/preview?courseId=1'
const importRows = [
  { rowNumber: 2, fullName: 'Học viên hợp lệ', email: 'valid@example.test', phone: '0912345678', birthDate: '2000-01-01', errors: [] },
  { rowNumber: 3, fullName: 'Học viên có lỗi', email: 'invalid@example.test', phone: '123', birthDate: null, errors: ['Số điện thoại phải gồm 10 chữ số'] },
]
const excelImport = harness('AdminStudents', { '/courses/all': [course], [previewPath]: { rows: importRows } })
await excelImport.flush()
excelImport.button('Import Excel').onClick(); await excelImport.flush()
const filePicker = excelImport.find('input', (props) => props.id === 'student-import-file')
assert.equal(filePicker.type, 'file', 'file picker uses the native file input')
assert.equal(Object.hasOwn(filePicker, 'value'), false, 'file picker must not write a controlled filename value')
assert.equal(Object.hasOwn(filePicker, 'defaultValue'), false, 'file picker must not initialize a filename value')
const excelFile = { name: 'mau-import-hoc-vien.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 1000 }
const fileTarget = { files: [excelFile], value: 'C:\\fakepath\\mau-import-hoc-vien.xlsx' }
const selecting = filePicker.onChange({ target: fileTarget })
assert.equal(fileTarget.value, '', 'clear the native picker so the same file can be selected again')
await selecting; await excelImport.flush()
const previewCall = excelImport.calls.find((call) => call.path === previewPath)
assert.equal(previewCall.options.method, 'POST')
assert.equal(previewCall.options.body, excelFile, 'preview sends the file body directly')
assert.equal(previewCall.options.headers['Content-Type'], excelFile.type)
const previewTable = excelImport.find('Table', (props) => props.rowKey === 'rowNumber')
assert.equal(previewTable.dataSource.length, 2, 'preview keeps both valid and invalid rows')
const renderErrors = previewTable.columns.find((column) => column.dataIndex === 'errors').render
assert.equal(text(renderErrors(previewTable.dataSource[0].errors)), 'Hợp lệ')
assert.equal(text(renderErrors(previewTable.dataSource[1].errors)), importRows[1].errors[0])
let importModal = excelImport.find(excelImport.Modal, (props) => props.title === 'Import học viên từ Excel')
assert.equal(importModal.open, true)
assert.equal(importModal.okText, 'Lưu 1 dòng hợp lệ')
assert.equal(importModal.okButtonProps.disabled, false)
fileTarget.value = 'C:\\fakepath\\mau-import-hoc-vien.xlsx'
await excelImport.find('input', (props) => props.id === 'student-import-file').onChange({ target: fileTarget }); await excelImport.flush()
assert.equal(fileTarget.value, '', 'repeat selection also clears the native picker')
assert.equal(excelImport.calls.filter((call) => call.path === previewPath).length, 2, 'the same file can be previewed again')
excelImport.set(previewPath, new Error('File Excel không hợp lệ'))
const fallbackFile = { ...excelFile, type: '' }
await excelImport.find('input', (props) => props.id === 'student-import-file').onChange({ target: { files: [fallbackFile], value: 'C:\\fakepath\\mau-import-hoc-vien.xlsx' } }); await excelImport.flush()
assert.equal(excelImport.calls.filter((call) => call.path === previewPath).at(-1).options.headers['Content-Type'], excelFile.type, 'missing file MIME uses the xlsx content type')
importModal = excelImport.find(excelImport.Modal, (props) => props.title === 'Import học viên từ Excel')
assert.equal(importModal.open, true, 'preview failure keeps the import modal open')
assert.equal(importModal.okButtonProps.disabled, true, 'preview failure cannot confirm stale rows')
assert.equal(excelImport.all('Table', (props) => props.rowKey === 'rowNumber').length, 0, 'preview failure clears the previous rows')
assert.equal(excelImport.calls.some((call) => call.path === '/enrollments/import/confirm'), false, 'preview never confirms an import')

const newStudent = { ...student, id: 2, email: 'new@example.test', phone: '0912345679' }
const intake = harness('AdminStudents', { '/users?role=hoc_vien': [student], '/courses/all': [course],
  '/users': { ...newStudent, emailSent: false, temporaryPassword: 'Synthetic-password-123', emailWarning: 'SMTP thử nghiệm chưa cấu hình' } })
await intake.flush()
intake.button('Thêm học viên').onClick(); await intake.flush()
intake.set('/users?role=hoc_vien', [student, newStudent])
await intake.find(intake.Form).onFinish({ name: 'Học viên', email: newStudent.email, phone: newStudent.phone, birthDate: newStudent.birthDate })
await intake.flush()
assert.equal(intake.calls.filter((call) => call.path === '/users' && call.options.method === 'POST').length, 1)
assert.equal(intake.calls.some((call) => call.path === '/enrollments/import/confirm'), false, 'hồ sơ trước kiểm tra không tạo ghi danh/hóa đơn')
assert.equal(intake.find('Tabs').activeKey, 'placement')
assert.ok(intake.confirmations.some((item) => text(item.content).includes('Synthetic-password-123')), 'mật khẩu tạm phải có đường bàn giao khi email không gửi')
let placement = intake.find('./PlacementAssessments')
placement.onPendingChange(true); await intake.flush()
assert.equal(intake.find('Drawer').maskClosable, false)
intake.find('Drawer').onClose(); intake.find('Tabs').onChange('profile'); await intake.flush()
assert.equal(intake.find('Drawer').open, true)
assert.equal(intake.find('Tabs').activeKey, 'placement')
placement.onPendingChange(false); placement.onHistoryChange(); await intake.flush()
assert.equal(intake.button('Xóa hồ sơ').disabled, true, 'lịch sử đầu vào cũng ngăn xóa tài khoản')
placement = intake.find('./PlacementAssessments')
placement.onRecommendCourse(1); await intake.flush()
assert.equal(intake.find(intake.Modal, (props) => props.title === 'Ghi danh thêm cho Học viên').open, true)
assert.equal(intake.find('Select', (props) => props.placeholder === 'Chọn khóa học').value, 1)
assert.equal(intake.find('Select', (props) => props.placeholder === 'Để trống nếu xếp lớp sau').value, undefined)
assert.equal(intake.calls.some((call) => call.path === '/enrollments' && call.options.method === 'POST'), false, 'tư vấn chỉ mở form, không tự ghi danh')
const changed = harness('AdminStudents', { '/users?role=hoc_vien': [student], '/courses/all': [course] }); await changed.flush()
let intakeTable = changed.find('Table'); intakeTable.columns.find((column) => column.key === 'action').render(null, intakeTable.dataSource[0]).props.onClick(); await changed.flush()
changed.find('Tabs').onChange('placement'); await changed.flush()
changed.set('/courses/all', [{ ...course, level: 'B2' }]); changed.find('./PlacementAssessments').onRecommendCourse(1); await changed.flush()
assert.equal(changed.find(changed.Modal, (props) => props.title === 'Ghi danh khóa học').open, false, 'khóa đổi trình độ không được tự chuyển nghĩa đề xuất cũ')
const classRow = (id, teacherId = 1) => ({ id, code: `L${id}`, name: `Lớp ${id}`, courseId: 1, courseName: 'Khóa', teacherId, teacherName: 'Giáo viên', startDate: '2026-01-01', sessions: 1, generatedSessions: 1, effectiveSessions: 1, completedSessions: 0, capacity: 20, status: 'dang_hoc', enrolled: 1, certificateLocked: 0 })
const schedule = (id, roomCode, classId = 1) => ({ id, classId, className: 'Lớp 1', teacherName: 'Giáo viên', roomId: id, roomCode, dayOfWeek: 2, startTime: '18:00:00', endTime: '19:00:00' })
const classes = harness('AdminClasses', { '/classes': [classRow(1), classRow(2), classRow(3)], '/courses/all': [course], '/users?role=giao_vien': [{ id: 1, fullName: 'Đã khóa', active: 0 }, { id: 2, fullName: 'Hoạt động', active: 1 }, { id: 3, fullName: 'Khóa khác', active: 0 }], '/schedules': [schedule(1, 'P1, khu A'), schedule(2, 'P2'), schedule(3, 'P2', 2)] })
await classes.flush()
assert.equal(classes.find('Summary').items[2].value, 2, 'unique source room codes, not commas/dashes in display text')
table = classes.find('Table'); table.columns.find((column) => column.key === 'action').render(null, table.dataSource[0]).props.onClick(); await classes.flush()
classes.button('Sửa thông tin lớp').onClick(); await classes.flush()
const options = classes.find('Select', (props) => props.options?.some((item) => item.label === 'Đã khóa · Đã khóa')).options
assert.deepEqual(Array.from(options, (item) => item.value), [1, 2]); assert.equal(options[0].disabled, true)

const schedules = harness('AdminSchedule', { '/classes': [{ ...classRow(1), language: 'Tiếng Anh' }], '/schedules': [schedule(1, 'P1')], '/rooms': [{ id: 1, code: 'P1', capacity: 30 }] }); await schedules.flush()
table = schedules.find('Table'); const controls = nodes(table.columns.find((column) => column.key === 'action').render(null, table.dataSource[0])).filter((node) => node.type === 'Button')
assert.equal(controls[0].props.disabled, false, 'generated sessions still allow PATCH room/time')
assert.equal(controls[1].props.disabled, true, 'generated sessions disable schedule deletion')

const courses = harness('AdminCourses', { '/courses/all': [course] }); await courses.flush()
courses.button('Thêm khóa học').onClick(); await courses.flush()
let release
courses.set('/courses', () => new Promise((resolve) => { release = resolve }))
const save = courses.find(courses.Form).onFinish, values = { ...course, code: 'NEW', status: 'Đang mở' }
const first = save(values); const second = save(values)
assert.equal(courses.calls.filter((call) => call.path === '/courses').length, 1, 'pending ref blocks double save before rerender')
release({}); await Promise.all([first, second]); await courses.flush()

// Loading a different class or closing the drawer invalidates the async academic shortcut.
const session = { id: 10, classId: 1, teacherId: 1, teacherName: 'Giáo viên', roomId: 1, roomCode: 'P1', startsAt: '2020-01-01 18:00:00', endsAt: '2020-01-01 19:00:00', status: 'da_len_lich', attendanceCount: 0, missingAttendanceCount: 1 }
const academic = harness('AdminClasses', { '/classes': [classRow(1), classRow(2)], '/classes/1/sessions': [session], '/classes/2/sessions': [] }); await academic.flush()
table = academic.find('Table'); const open = table.columns.find((column) => column.key === 'action').render
open(null, table.dataSource[0]).props.onClick(); await academic.flush()
academic.set('/classes/1/sessions', () => new Promise((resolve) => { release = resolve }))
const shortcut = academic.find('./AcademicDetails').onOpenSession; shortcut(10); await academic.flush()
academic.find('Drawer', (props) => props.title === 'Thông tin lớp học').onClose(); await academic.flush()
open(null, table.dataSource[1]).props.onClick(); await academic.flush()
release([session]); await academic.flush()
assert.equal(academic.calls.filter((call) => call.path === '/sessions/10/attendance').length, 0, 'stale shortcut never opens previous class attendance')
assert.equal(academic.find('Tabs').activeKey, 'overview')
academic.find('Drawer', (props) => props.title === 'Thông tin lớp học').onClose(); await academic.flush()
academic.set('/classes/1/sessions', [session]); academic.set('/sessions/10/attendance', { session, students: [{ enrollmentId: 1, studentCode: 'HV1', studentName: 'Học viên', status: null, note: null, certificateId: null }] })
table = academic.find('Table'); table.columns.find((column) => column.key === 'action').render(null, table.dataSource[0]).props.onClick(); await academic.flush()
academic.set('/classes/1/sessions', new Error('Lỗi tải buổi học')); academic.find('./AcademicDetails').onOpenSession(10); await academic.flush()
assert.equal(academic.find('Alert', (props) => props.title === 'Không tải được buổi học').type, 'error')
assert.equal(academic.calls.filter((call) => call.path === '/sessions/10/attendance').length, 0, 'failed shortcut does not use stale sessions')
academic.set('/classes/1/sessions', [session]); academic.button('Thử lại').onClick(); await academic.flush()
academic.find('./AcademicDetails').onOpenSession(10); await academic.flush()
assert.equal(academic.find('Tabs').activeKey, 'sessions')
assert.equal(academic.calls.filter((call) => call.path === '/sessions/10/attendance').length, 1, 'shortcut loads attendance for the freshly selected session')
console.log('PASS: six-page failure/retry; compact student table/action/filter/profile; native Excel picker/preview/retry; enrollment/schedule guards; active teacher options; unique rooms; double save; stale academic shortcut.')
