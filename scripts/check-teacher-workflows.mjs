// Exercise the real page handlers with mocked hooks/API, no browser/server/user data.
// Run: node scripts/check-teacher-workflows.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const compile = (file) => ts.transpileModule(readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8').replaceAll('import.meta.env.DEV', 'false'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText
const jsx = (type, props, key) => ({ type, props, key })
const text = (value) => value == null || typeof value === 'boolean' ? '' : Array.isArray(value) ? value.map(text).join('') : typeof value === 'object' ? text(value.props?.children) : String(value)
const nodes = (value) => !value || typeof value !== 'object' ? [] : [...(value.type ? [value] : []), ...Object.values(value).flatMap(nodes)]
const pure = (file) => { const exports = {}; vm.runInNewContext(compile(file), { exports, Date }); return exports }
const timing = pure('sessionTiming.ts').sessionTiming
const clock = new Date('2026-10-08T09:30:00').getTime()
assert.equal(timing('2026-10-08 08:00:00', '2026-10-08 09:00:00', 'da_len_lich', clock).label, 'Đã kết thúc')
assert.equal(timing('2026-10-08 09:00:00', '2026-10-08 10:00:00', 'da_hoc', clock).label, 'Đang diễn ra')
assert.equal(timing('2026-10-08 10:00:00', '2026-10-08 11:00:00', 'da_len_lich', clock).label, 'Sắp diễn ra')
assert.equal(timing('2026-10-08 08:00:00', '2026-10-08 09:00:00', 'da_huy', clock).label, 'Đã hủy')

function harness(file, routes, extraProps = {}, initialStorage = {}, initialErrors = []) {
  let cursor = 0, tree, props
  const hooks = [], effects = [], calls = [], confirmations = [], navigation = [], errors = new Set(initialErrors), deferred = new Map(), events = new Map()
  const storage = new Map(Object.entries(initialStorage))
  const slot = (init) => { const index = cursor++; return hooks[index] ??= init() }
  const same = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
  const react = {
    useState: (initial) => { const state = slot(() => ({ value: typeof initial === 'function' ? initial() : initial })); return [state.value, (value) => { state.value = typeof value === 'function' ? value(state.value) : value }] },
    useRef: (value) => slot(() => ({ current: value })),
    useMemo: (fn, deps) => { const state = slot(() => ({})); if (!same(state.deps, deps)) { state.value = fn(); state.deps = deps } return state.value },
    useCallback: (fn, deps) => react.useMemo(() => fn, deps),
    useEffect: (fn, deps) => { const state = slot(() => ({})); if (!same(state.deps, deps)) { state.deps = deps; effects.push(() => { state.cleanup?.(); state.cleanup = fn() }) } },
  }
  const api = async (path, options) => {
    calls.push({ path, options })
    const key = `${options?.method ?? 'GET'} ${path}`
    if (deferred.has(key)) await deferred.get(key)
    if (errors.has(key)) throw new Error('Lỗi tải kiểm thử')
    const result = routes[path] ?? routes[path.split('?')[0]]
    if (options?.method === 'PUT') {
      for (const item of JSON.parse(options.body).items) Object.assign(result.students.find((row) => row.enrollmentId === item.enrollmentId), item)
      return { saved: 1 }
    }
    assert.ok(result, `Unexpected API ${key}`)
    return structuredClone(result)
  }
  const form = { resetFields() {}, submit() {}, getFieldValue() {} }
  const messageApi = { success() {}, warning() {}, error() {} }, modalApi = { confirm: (options) => confirmations.push(options) }
  const antd = Object.fromEntries(['Alert', 'Avatar', 'Button', 'Card', 'Col', 'Descriptions', 'Divider', 'Drawer', 'Empty', 'Flex', 'InputNumber', 'Progress', 'Row', 'Segmented', 'Select', 'Skeleton', 'Space', 'Table', 'Tabs', 'Tag'].map((name) => [name, name]))
  Object.assign(antd, { Input: Object.assign(() => {}, { TextArea: 'TextArea' }), Radio: { Group: 'RadioGroup' },
    Typography: { Text: 'Text', Paragraph: 'Paragraph', Title: 'Title' }, Form: Object.assign(() => {}, { Item: 'FormItem', useForm: () => [form] }),
    Modal: Object.assign(() => {}, { useModal: () => [modalApi, null] }), message: { useMessage: () => [messageApi, null] } })
  const exports = {}
  vm.runInNewContext(compile(`pages/${file}.tsx`), { exports, require: (name) => {
    if (name === 'react') return react
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' }
    if (name === 'antd') return antd
    if (name === '../api') return { api, json: (method, body) => ({ method, body: JSON.stringify(body) }), errorMessage: (error) => error.message }
    if (name === '../sessionTiming') return { sessionTiming: timing }
    if (name === '../academicScore') return pure('academicScore.ts')
    if (name === '../download') return { downloadCsv() {}, downloadFile: async () => {} }
    if (name === './enrollmentLabels') return { enrollmentLabels: {} }
    if (name === './AdminPageKit') return { AdminPageHeader: 'Header', AdminSummary: 'Summary' }
    if (name === '@phosphor-icons/react') return new Proxy({}, { get: (_, key) => String(key) })
    return { __esModule: true, default: name }
  }, Intl, Date, sessionStorage: { getItem: (key) => storage.get(key) ?? null, removeItem: (key) => storage.delete(key), setItem: (key, value) => storage.set(key, value) },
  window: { confirm: () => false, setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    addEventListener: (name, fn) => { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(fn) }, removeEventListener: (name, fn) => events.get(name)?.delete(fn) } })
  props = { onLogout: () => navigation.push('logout'), onNavigate: (value) => navigation.push(value), onNavigateHome: () => navigation.push('home'), ...extraProps }
  const render = () => { cursor = 0; tree = exports.default(props); for (const effect of effects.splice(0)) effect(); return tree }
  const flush = async () => { for (let index = 0; index < 18; index++) { await Promise.resolve(); render() } }
  const find = (type, predicate = () => true) => { const found = nodes(tree).find((node) => node.type === type && predicate(node.props)); assert.ok(found, `Missing ${type} in ${file}`); return found.props }
  const button = (label) => find('Button', (props) => text(props.children).startsWith(label))
  const requestCount = (path, method = 'GET') => calls.filter((call) => call.path === path && (call.options?.method ?? 'GET') === method).length
  render()
  return { flush, find, button, requestCount, confirmations, calls, errors, deferred, events, navigation, storage, setProps: (next) => { props = { ...props, ...next } } }
}

const sessions = [
  { id: 1, classId: 7, className: 'Lớp 7', startsAt: '2026-01-01 18:00:00', endsAt: '2026-01-01 20:00:00', roomCode: 'P1', students: 1, attendanceMarked: 1, status: 'da_hoc' },
  { id: 2, classId: 8, className: 'Lớp 8', startsAt: '2026-01-02 18:00:00', endsAt: '2026-01-02 20:00:00', roomCode: 'P1', students: 1, attendanceMarked: 0, status: 'da_len_lich' },
  { id: 3, classId: 8, className: 'Lớp 8', startsAt: '2099-01-01 18:00:00', endsAt: '2099-01-01 20:00:00', roomCode: 'P1', students: 1, attendanceMarked: 0, status: 'da_len_lich' },
  { id: 4, classId: 8, className: 'Lớp 8', startsAt: '2026-01-03 18:00:00', endsAt: '2026-01-03 20:00:00', roomCode: 'P1', students: 1, attendanceMarked: 0, status: 'da_huy' },
]
const attendanceStudent = (id) => ({ enrollmentId: id, studentCode: `HV${id}`, studentName: 'Học viên kiểm thử', status: null, note: null, attendanceRate: 0, expectedAttendance: 2, recordedAttendance: 0, certificateId: null })
const attendanceRoutes = { '/teacher/sessions': sessions, '/teacher/sessions/1/attendance': { students: [{ ...attendanceStudent(10), status: 'co_mat' }] }, '/teacher/sessions/2/attendance': { students: [attendanceStudent(20)] } }
const attendance = harness('TeacherAttendance', attendanceRoutes)
await attendance.flush()
assert.equal(attendance.find('Select').value, 2, 'default prefers missing session over older complete session')
assert.equal(attendance.find('./TeacherAcademicSummary').focusedClassId, 8)
assert.equal(attendance.button('Lưu điểm danh').disabled, true, 'unchanged attendance cannot be saved')
attendance.button('Tất cả có mặt').onClick(); await attendance.flush()
const beforeReload = attendance.requestCount('/teacher/sessions/2/attendance')
attendance.button('Tải lại điểm danh').onClick()
assert.equal(attendance.requestCount('/teacher/sessions/2/attendance'), beforeReload, 'dirty retry does not fetch before consent')
assert.match(attendance.confirmations.at(-1).title, /Bỏ thay đổi/)
assert.equal(attendance.button('Lưu điểm danh').disabled, false, 'cancel/disregard confirmation keeps draft')
attendance.errors.add('GET /teacher/sessions/2/attendance')
attendance.confirmations.at(-1).onOk(); await attendance.flush()
assert.equal(attendance.find('Table').dataSource.length, 0)
assert.equal(attendance.button('Lưu điểm danh').disabled, true)
assert.equal(attendance.find('Alert', (props) => props.title === 'Chưa tải được điểm danh buổi này').type, 'error')
attendance.errors.clear(); attendance.button('Thử lại điểm danh').onClick(); await attendance.flush()
assert.equal(attendance.find('Table').dataSource.length, 1)
attendance.button('Tất cả có mặt').onClick(); await attendance.flush()
let releaseAttendance
attendance.deferred.set('PUT /teacher/sessions/2/attendance', new Promise((resolve) => { releaseAttendance = resolve }))
const saveAttendance = attendance.button('Lưu điểm danh').onClick
saveAttendance(); saveAttendance(); await attendance.flush()
assert.equal(attendance.requestCount('/teacher/sessions/2/attendance', 'PUT'), 1, 'pending ref prevents duplicate write')
attendance.find('./TeacherLayout').onNavigate('teacher-grades')
assert.equal(attendance.navigation.length, 0, 'navigation is blocked while saving')
let prevented = false
for (const listener of attendance.events.get('beforeunload') ?? []) listener({ preventDefault: () => { prevented = true } })
assert.equal(prevented, true)
releaseAttendance(); await attendance.flush()
assert.equal(attendance.button('Lưu điểm danh').disabled, true)
assert.equal(attendance.find('Table').columns.find((column) => column.key === 'status').render(null, attendance.find('Table').dataSource[0]).props.value, 'present')
attendance.find('./TeacherAcademicSummary').onOpenSession(1); await attendance.flush()
assert.equal(attendance.find('Select').value, 1)
assert.equal(attendance.find('./TeacherAcademicSummary').focusedClassId, 7)
const requested = harness('TeacherAttendance', attendanceRoutes, {}, { 'teacher-attendance-session': '1' })
await requested.flush(); assert.equal(requested.find('Select').value, 1, 'explicit session context wins')
const sessionsFailure = harness('TeacherAttendance', attendanceRoutes, {}, {}, ['GET /teacher/sessions'])
await sessionsFailure.flush()
assert.equal(sessionsFailure.find('Select').disabled, true)
assert.equal(sessionsFailure.button('Lưu điểm danh').disabled, true)
sessionsFailure.errors.clear(); sessionsFailure.button('Thử lại danh sách buổi').onClick(); await sessionsFailure.flush()
assert.equal(sessionsFailure.find('Select').value, 2)

const classes = [{ id: 7, name: 'Lớp 7', code: 'L7', examLocked: false }, { id: 8, name: 'Lớp 8', code: 'L8', examLocked: false }]
const exam = (id) => ({ id, name: `Thi ${id}`, examDate: '2026-10-10', deadline: '2099-01-01 18:00:00' })
const result = (id) => ({ exam: exam(id), students: [{ enrollmentId: id, studentCode: `HV${id}`, studentName: `Học viên ${id}`, certificateId: null, eligible: true, eligibilityReason: '', listening: null, speaking: null, reading: null, writing: null }] })
const gradeRoutes = { '/teacher/classes': classes, '/teacher/classes/7/exams': [exam(71)], '/teacher/classes/8/exams': [exam(81)], '/teacher/exams/71/results': result(71), '/teacher/exams/81/results': result(81) }
const grades = harness('TeacherGrades', gradeRoutes, {}, { 'teacher-grades-class': '8' })
await grades.flush()
assert.equal(grades.find('Select', (props) => props.value === 8).value, 8)
assert.match(grades.find('Select', (props) => props.value === 81).options[0].label, /10\/10\/2026/)
assert.match(grades.find('Alert', (props) => props.title === 'Thông tin kỳ thi').description, /Ngày thi: 10\/10\/2026/)
assert.equal(grades.button('Lưu bảng điểm').disabled, true)
const gradeTable = grades.find('Table')
gradeTable.columns.find((column) => column.key === 'listening').render(null, gradeTable.dataSource[0]).props.onChange(0); await grades.flush()
const beforeGrades = grades.requestCount('/teacher/exams/81/results')
grades.button('Tải lại bảng điểm').onClick()
assert.equal(grades.requestCount('/teacher/exams/81/results'), beforeGrades)
assert.match(grades.confirmations.at(-1).title, /Bỏ thay đổi/)
grades.errors.add('GET /teacher/exams/81/results'); grades.confirmations.at(-1).onOk(); await grades.flush()
assert.equal(grades.find('Table').dataSource.length, 0)
assert.equal(grades.button('Lưu bảng điểm').disabled, true)
assert.equal(grades.button('Tạo kỳ thi').disabled, true)
grades.errors.clear(); grades.button('Thử lại bảng điểm').onClick(); await grades.flush()
let releaseGrades
grades.deferred.set('GET /teacher/exams/81/results', new Promise((resolve) => { releaseGrades = resolve }))
grades.button('Tải lại bảng điểm').onClick(); await grades.flush()
grades.find('Select', (props) => props.value === 8).onChange(7); await grades.flush()
releaseGrades(); await grades.flush()
assert.equal(grades.find('Select', (props) => props.value === 71).value, 71)
assert.equal(grades.find('Table').dataSource[0].id, 71, 'late response from prior exam never replaces selected class')
const classFailure = harness('TeacherGrades', gradeRoutes, {}, {}, ['GET /teacher/classes'])
await classFailure.flush(); assert.equal(classFailure.button('Tạo kỳ thi').disabled, true)
classFailure.errors.clear(); classFailure.button('Thử lại lớp học').onClick(); await classFailure.flush()
assert.equal(classFailure.find('Select', (props) => props.value === 7).disabled, false)
const examsFailure = harness('TeacherGrades', gradeRoutes, {}, {}, ['GET /teacher/classes/7/exams'])
await examsFailure.flush(); assert.equal(examsFailure.button('Tạo kỳ thi').disabled, true)
examsFailure.errors.clear(); examsFailure.button('Thử lại kỳ thi').onClick(); await examsFailure.flush()
assert.equal(examsFailure.find('Select', (props) => props.value === 71).disabled, false)

let opened
const academic = harness('AcademicDetails', { '/teacher/classes/8/academic': { exams: [], students: [], missingAttendance: [
  { sessionId: 2, enrollmentId: 20, startsAt: '2026-01-02 18:00:00', teacherName: 'Bạn', studentName: 'A', canMarkAttendance: true },
  { sessionId: 1, enrollmentId: 10, startsAt: '2026-01-01 18:00:00', teacherName: 'Giáo viên trước', studentName: 'B', canMarkAttendance: false },
] } }, { classId: 8, teacher: true, section: 'attendance', onOpenSession: (id) => { opened = id } })
await academic.flush()
const missing = academic.find('Table', (props) => props.dataSource[0]?.sessionId)
const missingAction = missing.columns.find((column) => column.key === 'action')
missingAction.render(null, missing.dataSource[0]).props.onClick(); assert.equal(opened, 2)
assert.equal(text(missingAction.render(null, missing.dataSource[1])), 'Liên hệ giáo vụ')
academic.errors.add('GET /teacher/classes/8/academic'); academic.button('Tải lại thống kê').onClick(); await academic.flush()
assert.throws(() => academic.find('Tabs'), /Missing Tabs/, 'load failure does not render empty data tabs')
assert.equal(academic.button('Xuất Excel').disabled, true)
academic.errors.clear(); academic.button('Thử lại').onClick(); await academic.flush()
assert.equal(academic.find('Tabs').items.length, 2)
const summary = harness('TeacherAcademicSummary', { '/teacher/classes': classes }, { section: 'attendance', revision: 0, focusedClassId: 8 })
await summary.flush(); assert.equal(summary.find('./AcademicDetails').classId, 8)
summary.setProps({ focusedClassId: 7 }); await summary.flush(); assert.equal(summary.find('./AcademicDetails').classId, 7)
summary.setProps({ focusedClassId: 999 }); await summary.flush()
assert.equal(summary.find('Select').value, undefined)
assert.throws(() => summary.find('./AcademicDetails'), /Missing/, 'unassigned focused class never silently shows another class')
summary.find('Select').onChange(8); await summary.flush()
assert.equal(summary.find('./AcademicDetails').classId, 8, 'explicitly choosing a permitted class remains allowed')
console.log('PASS: session timing, missing-session/context selection, dirty retry, load errors, save pending/unload, stale grades, ownership links, focused class')
