// node scripts/check-placement-assessments.mjs — real handlers, mocked API; no database writes.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const jsx = (type, props) => ({ type, props })
const nodes = (value) => !value || typeof value !== 'object' ? [] : [...(value.type && value.props ? [value] : []), ...Object.values(value).flatMap(nodes)]
const text = (value) => value == null || typeof value === 'boolean' ? '' : Array.isArray(value) ? value.map(text).join('') : typeof value === 'object' ? text(value.props?.children) : String(value)
const compiled = ts.transpileModule(readFileSync(new URL('../src/pages/PlacementAssessments.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText

function page(initialProps, initialResponses) {
  let props = initialProps, cursor = 0, tree
  const hooks = [], effects = [], calls = [], events = new Map(), notices = [], responses = new Map(Object.entries(initialResponses))
  const slot = (fn) => { const index = cursor++; return hooks[index] ??= fn() }
  const same = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
  const react = {
    useState: (value) => { const state = slot(() => ({ value: typeof value === 'function' ? value() : value })); return [state.value, (next) => { state.value = typeof next === 'function' ? next(state.value) : next }] },
    useRef: (current) => slot(() => ({ current })),
    useCallback: (fn, deps) => { const state = slot(() => ({})); if (!same(state.deps, deps)) { state.fn = fn; state.deps = deps } return state.fn },
    useEffect: (fn, deps) => { const state = slot(() => ({})); if (!same(state.deps, deps)) { state.deps = deps; effects.push(() => { state.cleanup?.(); state.cleanup = fn() }) } },
  }
  const form = { values: {}, errors: [], resetFields() { this.values = {} }, setFieldsValue(value) { Object.assign(this.values, value) }, setFields(value) { this.errors = value }, submit() {} }
  const antd = Object.fromEntries(['Alert', 'AutoComplete', 'Button', 'Card', 'Descriptions', 'InputNumber', 'Select', 'Space', 'Table', 'Tag'].map((name) => [name, name]))
  antd.Input = Object.assign(() => {}, { TextArea: 'TextArea' })
  antd.Form = Object.assign(() => {}, { displayName: 'Form', Item: 'FormItem', useForm: () => [form], useWatch: (name) => form.values[name] })
  antd.Modal = 'Modal'; antd.Typography = { Text: 'Text', Paragraph: 'Paragraph' }
  antd.message = { useMessage: () => [{ success: (value) => notices.push(value), error: (value) => notices.push(value) }, null] }
  const exports = {}
  vm.runInNewContext(compiled, { exports, require: (name) => name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'Fragment' } : name === 'antd' ? antd : {
    api: async (path, options = {}) => { calls.push({ path, options }); const value = responses.get(path); if (value instanceof Error) throw value; return typeof value === 'function' ? value(options) : value },
    json: (method, body) => ({ method, body: JSON.stringify(body) }), errorMessage: (error) => error.message,
  }, Date, Number, window: { addEventListener: (name, fn) => events.set(name, fn), removeEventListener: (name) => events.delete(name) } })
  const render = () => { cursor = 0; tree = exports.default(props); for (const effect of effects.splice(0)) effect() }
  const flush = async () => { for (let index = 0; index < 12; index++) { await Promise.resolve(); render() } }
  const all = (type, source = tree) => nodes(source).filter((node) => node.type === type || node.type?.displayName === type).map((node) => node.props)
  const find = (type, predicate = () => true) => { const result = all(type).find(predicate); assert.ok(result, `Missing ${type}`); return result }
  const button = (label, source = tree) => { const result = all('Button', source).find((item) => text(item.children) === label); assert.ok(result, `Missing ${label}`); return result }
  render()
  return { flush, find, all, button, form, calls, events, notices, set: (path, value) => responses.set(path, value), setProps: (value) => { props = value; render() }, unmount: () => hooks.forEach((state) => state.cleanup?.()) }
}

const course = { id: 1, code: 'EN-A1', name: 'Tên khóa hiện tại', language: 'Tiếng Anh', level: 'A1', status: 'dang_mo' }
const original = { id: 10, studentId: 1, assessedAt: '2026-01-01', language: 'Tiếng Anh', score: 8, level: 'A1', recommendedCourseId: 1, recommendedCourseCode: 'EN-A1', recommendedCourseName: 'Tên khóa lúc kiểm tra', recommendedCourseLanguage: 'Tiếng Anh', recommendedCourseLevel: 'A1', note: 'Kiểm tra trực tiếp', status: 'da_ghi_nhan', createdByName: 'Quản trị viên', createdAt: '2026-01-01 09:00:00', canceledByName: null, canceledAt: null, cancelReason: null }
const path = '/placement-assessments?studentId=1', failure = new Error('Mất kết nối')
const pending = [], recommended = [], changed = []
const props = { studentId: 1, courses: [course, { ...course, id: 2, status: 'tam_an' }, { ...course, id: 3, language: 'Tiếng Nhật' }], onPendingChange: (value) => pending.push(value), onHistoryChange: () => changed.push(true), onRecommendCourse: (id) => recommended.push(id) }
const admin = page(props, { [path]: failure })
await admin.flush()
assert.equal(admin.all('Table').length, 0, 'load failure is not empty assessment history')
assert.equal(admin.button('Ghi nhận kết quả').disabled, true)
admin.set(path, [original]); admin.button('Thử lại').onClick(); await admin.flush()
const action = (row) => admin.find('Table').columns.find((column) => column.key === 'action').render(null, row)
assert.match(text(admin.find('Table').columns.find((column) => column.key === 'course').render(null, original)), /Tên khóa lúc kiểm tra/, 'display uses the snapshot, not the current course name')
admin.button('Ghi danh khóa đề xuất', action(original)).onClick()
assert.deepEqual(recommended, [1], 'recommendation only opens enrollment through the parent callback')
admin.setProps({ ...props, courses: [{ ...course, level: 'A2' }] }); await admin.flush()
assert.equal(admin.button('Ghi danh khóa đề xuất', action(original)).disabled, true, 'changed course level invalidates the old recommendation')
admin.setProps(props); await admin.flush()
admin.button('Ghi nhận kết quả').onClick(); await admin.flush()
admin.form.setFieldsValue({ language: 'Tiếng Anh' }); await admin.flush()
assert.deepEqual(Array.from(admin.find('Select').options, (item) => item.value), [1], 'only open, same-language courses are selectable')
const values = { assessedAt: '2026-01-01', language: 'Tiếng Anh', score: 0.29, level: 'A1', recommendedCourseId: 1 }
const scoreValidator = admin.find('FormItem', (item) => item.name === 'score').rules[1].validator
for (const score of [0, 0.29, 10]) await scoreValidator(null, score)
for (const score of [-1, 10.01, 7.777, NaN, Infinity, '8']) await admin.find('Form').onFinish({ ...values, score })
for (const assessedAt of ['2026-02-30', '9999-01-01', '0999-12-31']) await admin.find('Form').onFinish({ ...values, assessedAt })
await admin.find('Form').onFinish({ ...values, recommendedCourseId: 3 })
assert.equal(admin.calls.filter((call) => call.options.method === 'POST').length, 0, 'invalid scores/dates/course mismatch never reach the API')
assert.equal(admin.form.errors[0].name, 'recommendedCourseId')
let release
admin.set('/placement-assessments', () => new Promise((resolve) => { release = resolve }))
const save = admin.find('Form').onFinish
const request = save(values); save(values); await admin.flush()
assert.equal(admin.calls.filter((call) => call.path === '/placement-assessments').length, 1, 'duplicate saves send one request')
assert.equal(admin.find('Select').disabled, true)
const modal = admin.find('Modal', (item) => item.title === 'Ghi nhận kiểm tra đầu vào')
modal.onCancel(); await admin.flush()
assert.equal(admin.find('Modal', (item) => item.title === 'Ghi nhận kiểm tra đầu vào').open, true, 'pending write cannot be closed')
let prevented = false
admin.events.get('app:history-navigation')({ preventDefault() { prevented = true } })
assert.equal(prevented, true)
const created = { ...original, id: 11, score: 0.29 }
admin.set(path, [created, original]); release(created); await request; await admin.flush()
assert.deepEqual(pending, [true, false])
assert.equal(changed.length, 1)
assert.equal(admin.find('Table').dataSource.length, 2, 'new result appends without replacing history')

admin.button('Hủy kết quả', action(original)).onClick(); await admin.flush()
admin.find('TextArea', (item) => item['aria-label']).onChange({ target: { value: 'a'.repeat(256) } }); await admin.flush()
admin.find('Modal', (item) => item.title === 'Hủy kết quả kiểm tra đầu vào').onOk(); await admin.flush()
assert.equal(admin.calls.filter((call) => call.path.endsWith('/cancel')).length, 0)
admin.find('TextArea', (item) => item['aria-label']).onChange({ target: { value: '  Nhập nhầm kết quả  ' } }); await admin.flush()
let releaseCancel
admin.set('/placement-assessments/10/cancel', () => new Promise((resolve) => { releaseCancel = resolve }))
const cancelModal = admin.find('Modal', (item) => item.title === 'Hủy kết quả kiểm tra đầu vào')
cancelModal.onOk(); cancelModal.onOk(); await admin.flush()
assert.equal(admin.calls.filter((call) => call.path.endsWith('/cancel')).length, 1)
assert.equal(JSON.parse(admin.calls.find((call) => call.path.endsWith('/cancel')).options.body).reason, 'Nhập nhầm kết quả')
const canceled = { ...original, status: 'da_huy', canceledByName: 'Quản trị viên', canceledAt: '2026-01-02 10:00:00', cancelReason: 'Nhập nhầm kết quả' }
admin.set(path, [created, canceled]); releaseCancel(canceled); await admin.flush()
assert.equal(admin.find('Table').dataSource.length, 2)
assert.equal(text(action(canceled)), '—', 'canceled results cannot be recommended or canceled again')
assert.equal(changed.length, 2)
assert.equal(admin.find('Table').expandable.expandedRowRender(canceled).props.items.find((item) => item.key === 'reason').children, 'Nhập nhầm kết quả')

const lockedRecommended = []
const locked = page({ ...props, studentActive: false, onRecommendCourse: (id) => lockedRecommended.push(id) }, { [path]: failure, '/placement-assessments/10/cancel': canceled })
await locked.flush()
assert.equal(locked.button('Thử lại').disabled, false, 'locked students can retry loading history')
assert.equal(locked.button('Ghi nhận kết quả').disabled, true)
locked.set(path, [original]); locked.button('Thử lại').onClick(); await locked.flush()
const lockedAction = () => locked.find('Table').columns.find((column) => column.key === 'action').render(null, original)
assert.equal(locked.button('Làm mới').disabled, false, 'locked students can refresh history')
assert.equal(locked.button('Ghi danh khóa đề xuất', lockedAction()).disabled, true)
locked.button('Ghi danh khóa đề xuất', lockedAction()).onClick()
locked.button('Ghi nhận kết quả').onClick(); await locked.find('Form').onFinish(values); await locked.flush()
assert.equal(lockedRecommended.length, 0, 'locked students cannot open a new enrollment')
assert.equal(locked.find('Form').disabled, true)
assert.equal(locked.find('Modal', (item) => item.title === 'Ghi nhận kiểm tra đầu vào').open, false)
assert.equal(locked.calls.some((call) => call.path === '/placement-assessments'), false, 'locked students cannot save a new assessment')
assert.equal(locked.button('Hủy kết quả', lockedAction()).disabled, false, 'locking a student does not prevent canceling incorrect history')
locked.button('Hủy kết quả', lockedAction()).onClick(); await locked.flush()
locked.find('TextArea', (item) => item['aria-label']).onChange({ target: { value: 'Nhập nhầm kết quả' } }); await locked.flush()
assert.equal(locked.find('Modal', (item) => item.title === 'Hủy kết quả kiểm tra đầu vào').okButtonProps.disabled, false)
locked.set(path, [canceled]); locked.find('Modal', (item) => item.title === 'Hủy kết quả kiểm tra đầu vào').onOk(); await locked.flush()
assert.equal(locked.calls.filter((call) => call.path.endsWith('/cancel')).length, 1)
assert.equal(locked.find('Table').dataSource[0].status, 'da_huy', 'locked student cancellation keeps its audit history')

let releaseOld
const switching = page({ studentId: 1 }, { [path]: () => new Promise((resolve) => { releaseOld = resolve }), '/placement-assessments?studentId=2': [{ ...original, studentId: 2, id: 20 }] })
switching.setProps({ studentId: 2 }); await switching.flush()
releaseOld([original]); await switching.flush()
assert.equal(switching.find('Table').dataSource[0].studentId, 2, 'late response for a different student cannot overwrite current history')
const student = page({}, { '/student/placement-assessments': [original] })
await student.flush()
assert.equal(student.calls[0].path, '/student/placement-assessments')
assert.equal(student.all('Modal').length, 0)
assert.equal(student.find('Table').columns.some((column) => column.key === 'action'), false, 'student history is read-only')
const forbidden = page({}, { '/student/placement-assessments': new Error('Không có quyền') })
await forbidden.flush()
assert.equal(forbidden.all('Table').length, 0)
assert.equal(forbidden.calls.some((call) => call.path === '/placement-assessments'), false, 'unauthorized student request never falls back to the admin list')
let releaseUnmounted
const unmountPending = []
const unmounted = page({ ...props, onPendingChange: (value) => unmountPending.push(value) }, { [path]: [], '/placement-assessments': () => new Promise((resolve) => { releaseUnmounted = resolve }) })
await unmounted.flush(); unmounted.button('Ghi nhận kết quả').onClick(); await unmounted.flush()
const pendingWrite = unmounted.find('Form').onFinish(values)
unmounted.unmount(); releaseUnmounted(created); await pendingWrite
assert.deepEqual(unmountPending, [true, false], 'parent pending flag is released on unmount')
assert.equal(unmounted.calls.filter((call) => call.path === path).length, 1, 'unmounted write cannot reload a stale student')
assert.equal(unmounted.notices.length, 0, 'unmounted write never displays success in another screen')
console.log('PASS: placement history load/retry, immutable snapshots, valid course scope, score/date bounds, duplicate and navigation guards, cancellation audit, locked student policy, student switch and read-only access')
