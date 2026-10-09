// Runs the real page handlers with mocked React hooks/API; never contacts a server.
// Run: node scripts/check-certificate-issuance.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../src/pages/AdminCertificates.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText
const jsx = (type, props, key) => ({ type, props, key })
const flatten = (value) => value == null || typeof value === 'boolean' ? '' : Array.isArray(value)
  ? value.map(flatten).join('') : typeof value === 'object' ? flatten(value.props?.children) : String(value)
const nodes = (value) => !value || typeof value !== 'object' ? [] : [
  ...(value.type ? [value] : []), ...Object.values(value).flatMap(nodes),
]
const row = (id, status = 'da_duyet', classCode = 'A', eligible = true) => ({
  enrollmentId: id, certificateId: status ? id + 100 : null, studentCode: `HV${id}`, studentName: `Học viên ${id}`,
  classCode, className: 'Tên lớp trùng', courseName: 'Tiếng Anh', language: 'Tiếng Anh', attendance: 100,
  expectedAttendance: 2, recordedAttendance: 2, average: 8, requiredExams: 1, completedExams: 1, paid: 1,
  certificateStatus: status, certificateCode: status === 'da_cap' ? `CC${id}` : null,
  issuedAt: status === 'da_cap' ? '2026-10-08' : null, pdfPath: status === 'da_cap' ? `/pdf/${id}` : null,
  eligible, ineligibleReasons: eligible ? [] : ['Hồ sơ chưa đạt'],
})

function harness(initial) {
  let rows = initial, loadFailure = false, cursor = 0, tree
  const hooks = [], effects = [], calls = [], confirmations = [], failures = new Set(), deferred = new Map()
  const slot = (init) => { const index = cursor++; return hooks[index] ??= init() }
  const same = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
  const react = {
    useState: (initialValue) => { const state = slot(() => ({ value: initialValue })); return [state.value, (value) => { state.value = typeof value === 'function' ? value(state.value) : value }] },
    useRef: (value) => slot(() => ({ current: value })),
    useMemo: (fn, deps) => { const state = slot(() => ({})); if (!same(state.deps, deps)) { state.value = fn(); state.deps = deps } return state.value },
    useCallback: (fn, deps) => react.useMemo(() => fn, deps),
    useEffect: (fn, deps) => { const state = slot(() => ({})); if (!same(state.deps, deps)) { state.deps = deps; effects.push(fn) } },
  }
  const api = async (path, options) => {
    calls.push({ path, options })
    if (path === '/certificates/candidates') { if (loadFailure) throw new Error('Mất kết nối'); return rows.map((item) => ({ ...item })) }
    if (path === '/certificates/approve') {
      const { enrollmentIds } = JSON.parse(options.body)
      rows = rows.map((item) => enrollmentIds.includes(item.enrollmentId) ? { ...item, certificateId: item.enrollmentId + 100, certificateStatus: 'da_duyet' } : item)
      return { approved: enrollmentIds.length }
    }
    const id = Number(path.split('/')[2])
    if (deferred.has(id)) await deferred.get(id).promise
    if (failures.has(id)) throw new Error(`Không tạo được PDF ${id}`)
    rows = rows.map((item) => item.certificateId === id ? { ...item, certificateStatus: 'da_cap', certificateCode: `CC${id}`, pdfPath: `/pdf/${id}`, issuedAt: '2026-10-08' } : item)
    return { id }
  }
  const form = { setFieldsValue() {}, submit() {} }
  const antd = Object.fromEntries(['Alert', 'Avatar', 'Button', 'Card', 'Descriptions', 'Drawer', 'Flex', 'Segmented', 'Select', 'Space', 'Table', 'Tabs', 'Tag', 'Tooltip'].map((name) => [name, name]))
  Object.assign(antd, {
    Input: Object.assign(() => {}, { TextArea: 'TextArea' }),
    Typography: { Text: 'Text', Paragraph: 'Paragraph', Title: 'Title' },
    Form: Object.assign(() => {}, { Item: 'FormItem', useForm: () => [form] }),
    Modal: Object.assign(() => {}, { useModal: () => [{ confirm: (options) => confirmations.push(options) }, null] }),
    message: { useMessage: () => [{ success() {}, warning() {}, error() {} }, null] },
  })
  const exports = {}
  vm.runInNewContext(compiled, { exports, require: (name) => {
    if (name === 'react') return react
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' }
    if (name === 'antd') return antd
    if (name === '../api') return { api, json: (method, body) => ({ method, body: JSON.stringify(body) }), errorMessage: (error) => error.message }
    if (name === './AdminPageKit') return { AdminPageHeader: 'Header', AdminSummary: 'Summary' }
    if (name === '@phosphor-icons/react') return new Proxy({}, { get: (_, key) => String(key) })
    return { __esModule: true, default: name }
  }, Intl, Date, window: { open() {} } })
  const render = () => { cursor = 0; tree = exports.default({ onLogout() {}, onNavigate() {}, onNavigateHome() {} }); for (const effect of effects.splice(0)) effect(); return tree }
  const flush = async () => { for (let index = 0; index < 12; index++) { await Promise.resolve(); render() } }
  const find = (type, predicate = () => true) => { const found = nodes(tree).find((node) => node.type === type && predicate(node.props)); assert.ok(found, `Missing ${type}`); return found.props }
  const button = (label) => find('Button', (props) => flatten(props.children).startsWith(label))
  const selectClass = (code) => find('Select', (props) => props.options.some((item) => item.value === 'A')).onChange(code)
  const confirm = () => { const options = confirmations.at(-1); assert.ok(options); const request = options.onOk(); return { request, close: options.afterClose, options } }
  render()
  return { flush, find, button, selectClass, confirm, calls, confirmations, failures, deferred,
    setLoadFailure: (value) => { loadFailure = value }, setRows: (value) => { rows = value } }
}

const page = harness([row(1, null), row(2), row(3, 'da_duyet', 'B'), row(4), row(5, 'da_duyet', 'A', false), row(6, 'da_cap')])
await page.flush()
page.selectClass('A'); await page.flush()
page.find('Segmented').onChange('issue'); await page.flush()
const table = page.find('Table')
assert.equal(table.dataSource.length, 5, 'class code distinguishes identical class names')
for (const id of [1, 5, 6]) assert.equal(table.rowSelection.getCheckboxProps(table.dataSource.find((item) => item.id === id)).disabled, true)
table.rowSelection.onChange([2, 3, 4, 5, 6]); await page.flush()
assert.deepEqual(Array.from(page.find('Table').rowSelection.selectedRowKeys), [2, 4], 'only visible eligible approved rows are selected')
const issueButton = page.button('Phát hành đã chọn')
issueButton.onClick(); issueButton.onClick()
assert.equal(page.confirmations.length, 1, 'duplicate confirmation is blocked')
assert.match(page.confirmations[0].title, /2 chứng chỉ/)
assert.match(page.confirmations[0].content, /lớp A/)
let release
page.deferred.set(102, { promise: new Promise((resolve) => { release = resolve }) })
page.failures.add(104)
const first = page.confirm()
page.confirmations[0].onOk()
await page.flush()
assert.equal(page.button('Phát hành đã chọn').disabled, true)
assert.equal(page.find('Segmented').disabled, true)
assert.equal(page.button('Chọn tất cả hồ sơ hợp lệ').disabled, true)
assert.equal(page.button('Bỏ chọn').disabled, true)
assert.deepEqual(page.calls.filter((call) => call.path.endsWith('/issue')).map((call) => call.path), ['/certificates/102/issue', '/certificates/104/issue'], 'never issues outside selection; duplicate onOk writes nothing')
page.setLoadFailure(true)
release(); await first.request; first.close(); await page.flush()
assert.equal(page.find('Table').dataSource.length, 0, 'refresh failure never exposes stale results')
assert.equal(page.button('Phát hành đã chọn').disabled, true)
page.setLoadFailure(false); page.button('Thử lại').onClick(); await page.flush()
assert.deepEqual(Array.from(page.find('Table').rowSelection.selectedRowKeys), [4], 'partial failure keeps only failed row selected')
assert.match(page.find('Alert', (props) => props.type === 'warning').title, /1 hồ sơ chưa phát hành/)
page.failures.clear(); page.button('Phát hành đã chọn').onClick()
const retry = page.confirm(); await retry.request; retry.close(); await page.flush()
assert.deepEqual(page.calls.filter((call) => call.path.endsWith('/issue')).map((call) => call.path), ['/certificates/102/issue', '/certificates/104/issue', '/certificates/104/issue'], 'retry never reissues successful PDF')
assert.equal(page.find('Table').rowSelection.selectedRowKeys.length, 0)

// Drawer issuance is exactly one certificate, then renders the fresh PDF state.
page.selectClass('Tất cả'); await page.flush()
const drawerTable = page.find('Table'), target = drawerTable.dataSource.find((item) => item.id === 3)
drawerTable.columns.find((column) => column.key === 'action').render(null, target).props.onClick(); await page.flush()
page.button('Phát hành PDF cho học viên này').onClick()
const single = page.confirm(); assert.match(single.options.content, /HV3/)
await single.request; single.close(); await page.flush()
assert.equal(page.calls.filter((call) => call.path === '/certificates/103/issue').length, 1)
assert.equal(page.button('Mở chứng chỉ PDF').disabled, false, 'open drawer reflects refreshed issuance status')

// Load errors hide stale data/actions, keep retry selection, and recover in-place.
page.setLoadFailure(true); page.button('Tải lại hồ sơ').onClick(); await page.flush()
assert.equal(page.find('Table').dataSource.length, 0)
assert.equal(page.button('Phát hành đã chọn').disabled, true)
assert.equal(page.find('Alert', (props) => props.title === 'Chưa tải được hồ sơ').type, 'error')
page.setLoadFailure(false); page.button('Thử lại').onClick(); await page.flush()
assert.equal(page.button('Mở chứng chỉ PDF').disabled, false)

// Approve selection is independent; changing filter removes hidden selected rows.
const approval = harness([row(10, null), row(11, null, 'B'), row(12)])
await approval.flush()
approval.find('Table').rowSelection.onChange([10, 11, 12]); await approval.flush()
approval.find('Segmented').onChange('issue'); await approval.flush()
assert.equal(approval.find('Table').rowSelection.selectedRowKeys.length, 0)
approval.find('Segmented').onChange('approve'); await approval.flush()
approval.selectClass('A'); await approval.flush()
assert.deepEqual(Array.from(approval.find('Table').rowSelection.selectedRowKeys), [10])
approval.selectClass('Tất cả'); await approval.flush()
assert.deepEqual(Array.from(approval.find('Table').rowSelection.selectedRowKeys), [10], 'hidden selection does not reappear')
approval.button('Xác nhận đã chọn').onClick()
const approved = approval.confirm(); await approved.request; approved.close(); await approval.flush()
assert.deepEqual(JSON.parse(approval.calls.find((call) => call.path === '/certificates/approve').options.body).enrollmentIds, [10])
assert.equal(approval.find('Table').rowSelection.selectedRowKeys.length, 0, 'approved row is pruned from approval selection')

const bulkRows = Array.from({ length: 8 }, (_, index) => row(20 + index, null, index === 7 ? 'B' : 'A'))
bulkRows[1].studentCode = bulkRows[0].studentCode
bulkRows[1].studentName = bulkRows[0].studentName
const bulk = harness([...bulkRows, row(28, 'da_cap'), row(29, null, 'A', false), row(30), { ...row(31), certificateId: null }])
await bulk.flush()
bulk.find('Table').rowSelection.onChange([20]); await bulk.flush()
bulk.find('Table').rowSelection.onChange([20, 21]); await bulk.flush()
assert.deepEqual(Array.from(bulk.find('Table').rowSelection.selectedRowKeys), [20, 21], 'same student in two enrollments can be selected independently')
bulk.button('Chọn tất cả hồ sơ hợp lệ').onClick(); await bulk.flush()
assert.deepEqual(Array.from(bulk.find('Table').rowSelection.selectedRowKeys), bulkRows.map((item) => item.enrollmentId), 'select-all includes eligible records beyond page size and excludes issued/ineligible/approved records')
assert.equal(bulk.button('Chọn tất cả hồ sơ hợp lệ').disabled, true, 'select-all reports that all eligible records are selected')
bulk.selectClass('A'); await bulk.flush()
assert.equal(bulk.find('Table').rowSelection.selectedRowKeys.length, 7, 'filter removes selected records outside its scope')
bulk.find('Segmented').onChange('issue'); await bulk.flush()
bulk.button('Chọn tất cả hồ sơ hợp lệ').onClick(); await bulk.flush()
assert.deepEqual(Array.from(bulk.find('Table').rowSelection.selectedRowKeys), [30], 'PDF selection requires approved record with a certificate ID')
bulk.button('Bỏ chọn').onClick(); await bulk.flush()
assert.equal(bulk.find('Table').rowSelection.selectedRowKeys.length, 0, 'clear removes the current mode selection')
bulk.find('Segmented').onChange('approve'); await bulk.flush()
assert.equal(bulk.find('Table').rowSelection.selectedRowKeys.length, 7, 'clearing PDF selection does not clear approval selection')
bulk.button('Xác nhận đã chọn').onClick()
const bulkApproval = bulk.confirm(); await bulkApproval.request; bulkApproval.close(); await bulk.flush()
assert.deepEqual(JSON.parse(bulk.calls.find((call) => call.path === '/certificates/approve').options.body).enrollmentIds, bulkRows.slice(0, 7).map((item) => item.enrollmentId), 'batch approval sends only the selected eligible filtered enrollment IDs')
assert.equal(bulk.find('Table').pagination.showTotal(12), '12 hồ sơ', 'pagination counts enrollment records rather than distinct students')

const locked = harness([row(40, null, 'A', false), row(41, 'da_cap')])
await locked.flush()
assert.equal(locked.button('Chọn tất cả hồ sơ hợp lệ').disabled, true, 'the screenshot scenario has no selectable records')
const lockedTable = locked.find('Table')
assert.ok(locked.find('Alert', (props) => String(props.title).startsWith('Không có hồ sơ có thể')))
for (const item of lockedTable.dataSource) {
  assert.equal(lockedTable.rowSelection.getCheckboxProps(item).disabled, true)
  const cell = lockedTable.rowSelection.renderCell(false, item, 0, 'checkbox')
  assert.match(cell.props.title, item.status === 'Đã cấp' ? /Chứng chỉ đã cấp/ : /Hồ sơ chưa đạt/, 'disabled checkbox explains its reason')
  assert.equal(cell.props.children.props.tabIndex, 0, 'disabled reason is accessible by keyboard')
}
console.log('PASS: multi-selection across filtered pages, selection reasons, selected scope, separate approvals, duplicate/pending guards, partial retry, drawer refresh, load failure/retry')
