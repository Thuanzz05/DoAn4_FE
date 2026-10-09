// Run real page handlers with mocked React/API: node scripts/check-student-pages.mjs
// No server, email, or academic data is changed.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const jsx = (type, props) => ({ type, props })
const flatten = (value) => value == null || typeof value === 'boolean' ? '' : Array.isArray(value) ? value.map(flatten).join('') : typeof value === 'object' ? flatten(value.props?.children) : String(value)
const nodes = (value) => !value || typeof value !== 'object' ? [] : [...(value.type && value.props ? [value] : []), ...Object.values(value).flatMap(nodes)]
const compile = (path) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8').replaceAll('import.meta.env.DEV', 'false').replaceAll('import.meta.env.VITE_GOOGLE_CLIENT_ID', "''"), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText
const scoreModule = { exports: {} }
vm.runInNewContext(compile('../src/academicScore.ts'), scoreModule)

function harness(path, initial = {}, initialSession = null) {
  let cursor = 0, tree
  let session = initialSession
  const hooks = [], effects = [], calls = [], confirmations = [], notices = [], responses = new Map(Object.entries(initial))
  const same = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
  const slot = (init) => { const index = cursor++; return hooks[index] ??= init() }
  const react = {
    useState: (initialValue) => { const state = slot(() => ({ value: typeof initialValue === 'function' ? initialValue() : initialValue })); return [state.value, (value) => { state.value = typeof value === 'function' ? value(state.value) : value }] },
    useRef: (value) => slot(() => ({ current: value })),
    useMemo: (fn, deps) => { const state = slot(() => ({})); if (!same(state.deps, deps)) { state.value = fn(); state.deps = deps } return state.value },
    useEffect: (fn, deps) => { const state = slot(() => ({})); if (!same(state.deps, deps)) { state.deps = deps; effects.push(() => { state.cleanup?.(); state.cleanup = fn() }) } },
  }
  const antd = Object.fromEntries(['Alert', 'Avatar', 'Button', 'Card', 'Col', 'ConfigProvider', 'Descriptions', 'Divider', 'Drawer', 'Empty', 'Flex', 'InputNumber', 'Progress', 'Row', 'Segmented', 'Select', 'Skeleton', 'Space', 'Table', 'Tabs', 'Tag'].map((name) => [name, name]))
  antd.Space = Object.assign(() => {}, { Compact: 'Compact' })
  antd.Typography = { Text: 'Text', Paragraph: 'Paragraph', Title: 'Title' }
  antd.Input = Object.assign(() => {}, { displayName: 'Input', Password: 'Password', TextArea: 'TextArea' })
  antd.Form = Object.assign(() => {}, { displayName: 'Form', Item: 'FormItem', useForm: () => [slot(() => ({ values: {}, setFieldsValue(value) { Object.assign(this.values, value) }, submit() {} }))] })
  antd.Modal = Object.assign(() => {}, { displayName: 'Modal', useModal: () => [{ confirm: (options) => confirmations.push(options) }, null] })
  antd.message = { useMessage: () => [{ success: (text) => notices.push(text), error: (text) => notices.push(text), warning: (text) => notices.push(text) }, null] }
  const api = async (requestPath, options = {}) => {
    calls.push({ path: requestPath, options })
    const response = responses.get(requestPath)
    if (response instanceof Error) throw response
    return typeof response === 'function' ? response(options) : response
  }
  const exports = {}, window = { location: { pathname: '/' }, history: { pushState: (_, __, url) => { window.location.pathname = url }, replaceState: (_, __, url) => { window.location.pathname = url } }, scrollTo() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} }
  vm.runInNewContext(compile(path), { exports, require: (name) => {
    if (name === 'react') return react
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' }
    if (name === 'antd') return antd
    if (name.endsWith('/api')) return { api, errorMessage: (error) => error.message, json: (method, body) => ({ method, body: JSON.stringify(body) }), getSession: () => session, saveSession: (value) => { session = value }, clearSession: () => { session = null } }
    if (name === '../download') return { downloadFile: api }
    if (name.endsWith('/academicScore')) return scoreModule.exports
    if (name === './enrollmentLabels') return { enrollmentLabels: { hoan_thanh: 'Hoàn thành', dang_hoc: 'Đang học' } }
    if (name === './AdminPageKit') return { AdminPageHeader: 'Header', AdminSummary: 'Summary' }
    if (name === '@phosphor-icons/react') return new Proxy({}, { get: (_, key) => String(key) })
    return { __esModule: true, default: name }
  }, Date, Intl, AbortController, URLSearchParams, Event, window, document: {}, FormData: class { constructor(fields) { this.fields = fields } get(key) { return this.fields[key] } } })
  const render = () => { cursor = 0; tree = exports.default({ onLogout() {}, onNavigate() {}, onNavigateHome() {}, onAuthenticated() {}, onBack() {}, onSignedOut() {} }); for (const effect of effects.splice(0)) effect(); return tree }
  const flush = async () => { for (let index = 0; index < 12; index++) { await Promise.resolve(); render() } }
  const all = (type, predicate = () => true) => nodes(tree).filter((node) => (node.type === type || node.type?.displayName === type) && predicate(node.props)).map((node) => node.props)
  const find = (type, predicate) => { const item = all(type, predicate)[0]; assert.ok(item, `Missing ${type} in ${path}`); return item }
  const button = (label) => find('Button', (props) => flatten(props.children) === label)
  render()
  return { flush, find, all, button, calls, confirmations, notices, window, set: (requestPath, value) => responses.set(requestPath, value), setSession: (value) => { session = value }, session: () => session, unmount: () => hooks.forEach((state) => state.cleanup?.()) }
}

const failure = new Error('Mất kết nối')
const dashboard = harness('../src/pages/StudentDashboard.tsx', { '/student/dashboard': failure })
await dashboard.flush()
assert.equal(dashboard.all('Summary').length, 0, 'failed dashboard is not a zero-valued summary')
dashboard.set('/student/dashboard', { user: { fullName: 'Học viên' }, activeClasses: 2, expectedAttendance: 2, recordedAttendance: 1, attendanceRate: 50 })
dashboard.button('Thử lại').onClick(); await dashboard.flush()
assert.equal(dashboard.find('Summary').items[0].value, 2)
dashboard.set('/student/dashboard', failure); dashboard.button('Làm mới').onClick(); await dashboard.flush()
assert.equal(dashboard.all('Summary').length, 0, 'refresh failure hides stale dashboard')

const classes = harness('../src/pages/StudentClasses.tsx', { '/student/classes': failure })
await classes.flush()
assert.equal(classes.all('Table').length, 0, 'failed classes are not an empty roster')
classes.set('/student/classes', [{ enrollmentId: 1, enrollmentStatus: 'hoan_thanh', courseName: 'Tiếng Anh', code: 'A', name: 'Lớp A', status: 'da_huy', totalSessions: 10, completedSessions: 2 }])
classes.button('Thử lại').onClick(); await classes.flush()
const table = classes.find('Table'), row = table.dataSource[0]
assert.equal(flatten(table.columns.find((column) => column.dataIndex === 'enrollmentStatus').render(row.enrollmentStatus)), 'Hoàn thành')
assert.equal(flatten(table.columns.find((column) => column.dataIndex === 'status').render(row.status)), 'Đã hủy', 'class status is independent of enrollment')
table.columns.find((column) => column.key === 'details').render(null, row).props.onClick(); await classes.flush()
assert.equal(classes.find('Drawer').open, true)
classes.set('/student/classes', [{ ...row, status: 'da_ket_thuc' }]); classes.button('Làm mới').onClick(); await classes.flush()
assert.equal(flatten(classes.find('Descriptions').items.find((item) => item.key === 'classStatus').children), 'Đã kết thúc', 'open details use refreshed row')
let releaseOld
classes.set('/student/classes', () => new Promise((resolve) => { releaseOld = resolve }))
classes.button('Làm mới').onClick(); await classes.flush()
const oldRequest = classes.calls.at(-1)
assert.equal(classes.all('Table').length, 0, 'pending refresh never shows stale records')
classes.set('/student/classes', [{ ...row, name: 'Lớp mới nhất' }]); classes.button('Làm mới').onClick(); await classes.flush()
assert.equal(oldRequest.options.signal.aborted, true)
releaseOld([{ ...row, name: 'Phản hồi cũ' }]); await classes.flush()
assert.equal(classes.find('Table').dataSource[0].name, 'Lớp mới nhất', 'aborted response cannot overwrite the latest refresh')

const exam = (examId, enrollmentId, classId, average) => ({ examId, enrollmentId, classId, classCode: `L${classId}`, className: `Lớp ${classId}`, examName: `Kỳ ${examId}`, examDate: '2026-10-08', listening: average, speaking: average, reading: average, writing: average, average })
const condition = (enrollmentId, classId) => ({ enrollmentId, classId, courseName: 'Tiếng Anh', enrollmentStatus: 'dang_hoc', attendance: 50, expectedAttendance: 2, recordedAttendance: 2, average: 4.9975, requiredExams: 2, completedExams: 2, paid: true, eligible: false, certificateStatus: null, ineligibleReasons: ['Điểm chưa đạt'] })
const results = harness('../src/pages/StudentResults.tsx', { '/student/results': failure, '/student/certificate-eligibility': [] })
await results.flush()
assert.equal(results.all('Summary').length, 0)
assert.equal(results.all('Tabs').length, 0, 'network failure is not an ineligible certificate')
results.set('/student/results', { exams: [exam(1, 10, 100, 0), exam(2, 20, 200, 4.9975), exam(3, 20, 200, null)], attendance: [] })
results.set('/student/certificate-eligibility', [condition(10, 100), condition(20, 200)])
results.button('Thử lại').onClick(); await results.flush()
results.find('Select', (props) => props['aria-label'] === 'Chọn khóa và lớp học').onChange(20); await results.flush()
assert.equal(results.find('Summary').items[0].value, '4.9975', 'failing raw score never displays passing 5.00')
results.find('Select', (props) => props['aria-label'] === 'Chọn kỳ thi').onChange(3); await results.flush()
results.button('Làm mới').onClick(); await results.flush()
assert.equal(results.find('Select', (props) => props['aria-label'] === 'Chọn khóa và lớp học').value, 20)
assert.equal(results.find('Select', (props) => props['aria-label'] === 'Chọn kỳ thi').value, 3, 'refresh preserves existing exam selection')
results.set('/student/results', { exams: [exam(2, 20, 200, 4.9975)], attendance: [] }); results.button('Làm mới').onClick(); await results.flush()
assert.equal(results.find('Select', (props) => props['aria-label'] === 'Chọn kỳ thi').value, 2, 'removed exam falls back to an available exam')
results.set('/student/certificate-eligibility', failure); results.button('Làm mới').onClick(); await results.flush()
assert.equal(results.all('Summary').length, 0)
assert.equal(results.find('Select', (props) => props['aria-label'] === 'Chọn khóa và lớp học').disabled, true)

const today = new Date(), key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const session = (id, classCode) => ({ id, classCode, className: 'Tên lớp trùng', startsAt: `${key}T10:00:00`, endsAt: `${key}T11:00:00`, roomCode: 'P101', teacherName: 'Giáo viên', status: 'da_len_lich' })
const schedule = harness('../src/pages/StudentSchedule.tsx', { '/student/sessions': [session(1, 'A'), session(2, 'B')] })
await schedule.flush()
schedule.find('Select').onChange('B'); await schedule.flush()
assert.equal(schedule.all('button', (props) => props.className === 'student-schedule-session').length, 1, 'week filters by code, not identical class name')
schedule.find('button', (props) => props.className === 'student-schedule-session').onClick(); await schedule.flush()
schedule.set('/student/sessions', [session(1, 'A'), { ...session(2, 'B'), roomCode: 'P202', status: 'da_huy' }]); schedule.button('Làm mới').onClick(); await schedule.flush()
assert.match(flatten(schedule.find('Drawer').children), /P202/)
assert.match(flatten(schedule.find('Drawer').children), /Đã hủy/)
schedule.find('Segmented').onChange('month'); await schedule.flush()
assert.equal(schedule.all('button', (props) => flatten(props.children).includes(' · Tên lớp trùng')).length, 1, 'month keeps the same class filter')
schedule.set('/student/sessions', [session(1, 'A')]); schedule.button('Làm mới').onClick(); await schedule.flush()
assert.equal(schedule.find('Select').value, 'all')
assert.equal(schedule.find('Drawer').open, false, 'removed session closes details')
schedule.set('/student/sessions', failure); schedule.button('Làm mới').onClick(); await schedule.flush()
assert.equal(schedule.all('button', (props) => props.className === 'student-schedule-session').length, 0)
assert.equal(schedule.find('Select').disabled, true)

const register = harness('../src/pages/RegisterPage.tsx', { '/auth/register': { token: 'mock', user: {} } })
const phoneInput = register.find('input', (props) => props.name === 'phone')
assert.equal(phoneInput.maxLength, 10)
for (const phone of ['1234567890', '091234567', '09123456789', '09abcdefgh']) {
  await register.find('form').onSubmit({ preventDefault() {}, currentTarget: { phone, password: 'abcdefgh', confirmPassword: 'abcdefgh' } }); await register.flush()
}
assert.equal(register.calls.length, 0, 'invalid phone never reaches the API')
await register.find('form').onSubmit({ preventDefault() {}, currentTarget: { phone: '0912345678', password: 'abcdefgh', confirmPassword: 'abcdefgh' } }); await register.flush()
assert.equal(register.calls.length, 1)
assert.equal(JSON.parse(register.calls[0].options.body).phone, '0912345678')

const home = harness('../src/App.tsx')
await home.flush()
home.find('./pages/HomePage').onVerifyCertificate(); await home.flush()
assert.equal(home.window.location.pathname, '/verify-certificate')
assert.equal(home.all('./pages/CertificateVerification').length, 1, 'public certificate link navigates without authentication')
const invoiceRow = { id: 1, code: 'HD1', enrollmentId: 1, studentCode: 'HV1', studentName: 'Học viên', classId: 1, classCode: 'A', className: 'Lớp A', courseName: 'Tiếng Anh', amount: 1000000, issuedAt: '2026-10-08', dueDate: '2026-10-10', status: 'chua_thanh_toan', paidAt: null, paymentMethod: null, cancellationReason: null }
const invoices = harness('../src/pages/AdminInvoices.tsx', { '/invoices': failure, '/enrollments': [{ id: 2, studentName: 'Học viên', studentCode: 'HV1', courseName: 'Tiếng Nhật', status: 'cho_xep_lop' }] })
await invoices.flush()
assert.equal(invoices.all('Table').length, 0)
assert.equal(invoices.button('Tạo hóa đơn').disabled, true)
assert.equal(invoices.button('Nhắc học phí đến hạn').disabled, true)
invoices.set('/invoices', [invoiceRow]); invoices.button('Thử lại').onClick(); await invoices.flush()
const openInvoice = async () => { const table = invoices.find('Table'); table.columns.find((column) => column.key === 'action').render(null, table.dataSource[0]).props.onClick(); await invoices.flush() }
await openInvoice()
invoices.button('Tạo hóa đơn').onClick(); await invoices.flush()
let releaseCreate
invoices.set('/invoices', (options) => options.method === 'POST' ? new Promise((resolve) => { releaseCreate = resolve }) : [invoiceRow])
const createHandler = invoices.find('Form').onFinish
const creation = createHandler({ enrollmentId: 2, dueDate: '2026-10-10' }); createHandler({ enrollmentId: 2, dueDate: '2026-10-10' }); await invoices.flush()
assert.equal(invoices.calls.filter((call) => call.path === '/invoices' && call.options.method === 'POST').length, 1, 'duplicate creation sends one request')
const createModal = invoices.find('Modal', (props) => props.title === 'Tạo hóa đơn')
assert.equal(createModal.confirmLoading, true)
assert.equal(createModal.closable, false)
createModal.onCancel(); await invoices.flush()
assert.equal(invoices.find('Modal', (props) => props.title === 'Tạo hóa đơn').open, true)
invoices.set('/invoices', failure); releaseCreate({}); await creation; await invoices.flush()
assert.equal(invoices.all('Table').length, 0, 'post-mutation reload failure hides old invoices')
assert.equal(invoices.find('Drawer').open, true)
assert.equal(invoices.all('Alert', (props) => props.title === 'Chưa tải lại được hóa đơn').length, 1)
assert.equal(invoices.all('Descriptions').length, 0, 'failed drawer refresh is not stale invoice data')
invoices.set('/invoices', [invoiceRow]); invoices.button('Thử lại').onClick(); await invoices.flush()
invoices.button('Hủy hóa đơn').onClick(); await invoices.flush()
assert.equal(invoices.find('TextArea').maxLength, 255)
invoices.find('TextArea').onChange({ target: { value: 'a'.repeat(256) } }); await invoices.flush()
invoices.find('Modal', (props) => props.title.startsWith('Hủy hóa đơn')).onOk(); await invoices.flush()
assert.equal(invoices.calls.filter((call) => call.path.endsWith('/cancel')).length, 0, 'overlong cancellation is rejected, not truncated')
invoices.find('TextArea').onChange({ target: { value: '  Ghi danh đã hủy  ' } }); await invoices.flush()
let releaseCancel
invoices.set('/invoices/1/cancel', () => new Promise((resolve) => { releaseCancel = resolve }))
const cancellation = invoices.find('Modal', (props) => props.title.startsWith('Hủy hóa đơn'))
cancellation.onOk(); cancellation.onOk(); await invoices.flush()
assert.equal(invoices.find('TextArea').disabled, true)
assert.equal(invoices.calls.filter((call) => call.path.endsWith('/cancel')).length, 1)
assert.equal(JSON.parse(invoices.calls.find((call) => call.path.endsWith('/cancel')).options.body).reason, 'Ghi danh đã hủy')
releaseCancel({}); await invoices.flush()
await openInvoice(); invoices.button('Xác nhận thanh toán').onClick(); await invoices.flush()
invoices.find('Select', (props) => props.options.some((option) => option.value === 'tien_mat')).onChange('tien_mat'); await invoices.flush()
invoices.set('/invoices/1/payment', {})
const payment = invoices.find('Modal', (props) => props.title.startsWith('Xác nhận thanh toán'))
payment.onOk(); payment.onOk(); await invoices.flush()
assert.equal(invoices.calls.filter((call) => call.path.endsWith('/payment')).length, 1)
assert.equal(JSON.parse(invoices.calls.find((call) => call.path.endsWith('/payment')).options.body).method, 'tien_mat')

const user = { id: 1, fullName: 'Tên mới nhất', code: 'HV1', role: 'hoc_vien', email: 'hocvien@example.com', phone: '0912345678', birthDate: null, hasPassword: true, hasGoogle: false }
const profile = harness('../src/pages/ProfilePage.tsx', { '/auth/me': failure }, { token: 'first', user: { ...user, fullName: 'Tên lưu trong phiên' } })
await profile.flush()
assert.equal(profile.all('Form').length, 0, 'failed profile refresh cannot save cached data')
profile.set('/auth/me', user); profile.button('Thử lại').onClick(); await profile.flush()
assert.equal(profile.session().user.fullName, user.fullName)
let releaseProfile
profile.set('/auth/me', (options) => options.method === 'PATCH' ? new Promise((resolve) => { releaseProfile = resolve }) : user)
const profileHandler = profile.find('Form', (props) => props.initialValues).onFinish
const saving = profileHandler({ fullName: 'Chỉnh tên' }); profileHandler({ fullName: 'Chỉnh tên' }); await profile.flush()
assert.equal(profile.calls.filter((call) => call.options.method === 'PATCH').length, 1)
assert.equal(profile.button('Đổi mật khẩu').disabled, true, 'profile and password writes cannot overlap')
profile.setSession({ token: 'second', user: { ...user, id: 2, fullName: 'Tài khoản khác' } }); releaseProfile({ ...user, fullName: 'Phản hồi cũ' }); await saving; await profile.flush()
assert.equal(profile.session().user.fullName, 'Tài khoản khác', 'late profile save cannot overwrite a new login')
assert.equal(profile.notices.some((text) => text === 'Đã cập nhật hồ sơ.'), false)
let releaseMe
const unmountedProfile = harness('../src/pages/ProfilePage.tsx', { '/auth/me': () => new Promise((resolve) => { releaseMe = resolve }) }, { token: 'first', user })
unmountedProfile.unmount(); releaseMe({ ...user, fullName: 'Kết quả đến muộn' }); await unmountedProfile.flush()
assert.equal(unmountedProfile.session().user.fullName, user.fullName, 'unmounted /me request cannot mutate the session cache')
let releasePassword
const password = harness('../src/pages/ProfilePage.tsx', { '/auth/me': user, '/auth/password': () => new Promise((resolve) => { releasePassword = resolve }) }, { token: 'first', user })
await password.flush()
const passwordHandler = password.find('Form', (props) => !props.initialValues).onFinish
const passwordSave = passwordHandler({ currentPassword: 'oldpassword', newPassword: 'newpassword' }); passwordHandler({ currentPassword: 'oldpassword', newPassword: 'newpassword' }); await password.flush()
assert.equal(password.calls.filter((call) => call.path === '/auth/password').length, 1)
assert.equal(password.button('Lưu thay đổi').disabled, true)
password.setSession({ token: 'second', user }); releasePassword({}); await passwordSave; await password.flush()
assert.equal(password.session().token, 'second', 'late password save cannot sign out a newer login')

const reportPath = `/reports?${new URLSearchParams({ period: 'month', year: String(today.getFullYear()), unit: String(today.getMonth() + 1) })}`
const reports = harness('../src/pages/AdminReports.tsx', { [reportPath]: failure })
await reports.flush()
assert.equal(reports.all('Summary').length, 0)
reports.set(reportPath, { metrics: { revenue: 123, debt: 0, students: 0, activeClasses: 0, certificates: 0 }, academicMetrics: { passed: 0, failed: 0, pending: 0 }, revenueByMonth: [], languageShare: [], coursePerformance: [], classPerformance: [] })
reports.button('Thử lại').onClick(); await reports.flush()
assert.match(reports.find('Summary').items[0].value, /123/)
let releaseExport
const exportPath = `${reportPath.replace('/reports?', '/reports/export?')}&format=xlsx`
reports.set(exportPath, () => new Promise((resolve) => { releaseExport = resolve }))
const exportButton = reports.button('Xuất Excel')
exportButton.onClick(); exportButton.onClick(); await reports.flush()
assert.equal(reports.calls.filter((call) => call.path === exportPath).length, 1)
assert.equal(reports.find('Select', (props) => props['aria-label'] === 'Loại kỳ báo cáo').disabled, true)
assert.equal(reports.find('InputNumber').disabled, true)
releaseExport({}); await reports.flush()
assert.equal(reports.find('InputNumber').disabled, false)
console.log('PASS: student retry/status/selection/scores/filter/phone/public link; invoice duplicate/reason/loading guards; profile stale/unmount guards; report retry/export guards')
