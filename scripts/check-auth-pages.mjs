// Run real auth handlers with mocked API, storage and timers; no accounts or email are created.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const jsx = (type, props) => ({ type, props })
const nodes = (value) => !value || typeof value !== 'object' ? [] : [...(value.type && value.props ? [value] : []), ...Object.values(value).flatMap(nodes)]
const text = (value) => value == null || typeof value === 'boolean' ? '' : Array.isArray(value) ? value.map(text).join('') : typeof value === 'object' ? text(value.props?.children) : String(value)
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done }); return { promise, resolve } }
const session = { token: 'synthetic-token', user: { id: 1, role: 'hoc_vien', fullName: 'Học viên kiểm thử' } }
const authStyles = readFileSync(new URL('../src/pages/LoginPage.css', import.meta.url), 'utf8')
assert.match(authStyles, /\.auth-page \.login-form \.password-field input\s*\{\s*padding-right:\s*52px;/, 'password padding wins over generic input padding')
assert.match(authStyles, /html:has\(\.auth-page\), body:has\(\.auth-page\)\s*\{\s*min-width:\s*0;/, 'auth pages fit narrow viewports even when the scrollbar takes space')

function harness(page, { google = false, responses = {} } = {}) {
  const source = readFileSync(new URL(`../src/pages/${page}.tsx`, import.meta.url), 'utf8').replaceAll('import.meta.env.VITE_GOOGLE_CLIENT_ID', JSON.stringify(google ? 'synthetic-client-id' : ''))
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  let cursor = 0, tree, mounted = true, lateUpdates = 0, nextTimer = 0
  const hooks = [], effects = [], calls = [], saved = [], authenticated = [], navigation = [], timers = new Map(), answers = new Map(Object.entries(responses))
  const slot = (init) => hooks[cursor++] ??= init()
  const react = {
    useState: (initial) => { const state = slot(() => ({ value: typeof initial === 'function' ? initial() : initial })); return [state.value, (value) => { if (!mounted) lateUpdates++; state.value = typeof value === 'function' ? value(state.value) : value }] },
    useRef: (current) => slot(() => ({ current })),
    useEffect: (fn, deps) => { const state = slot(() => ({})); if (!state.deps || !deps || deps.some((value, index) => !Object.is(value, state.deps[index]))) { state.deps = deps; effects.push(() => { state.cleanup?.(); state.cleanup = fn() }) } },
  }
  const antd = { Alert: 'Alert', Button: 'Button', ConfigProvider: 'ConfigProvider', Input: Object.assign(() => {}, { displayName: 'Input', Password: 'InputPassword' }), Modal: Object.assign(() => {}, { displayName: 'Modal' }), Space: 'Space', Typography: { Text: 'Text' } }
  const api = async (path, options = {}) => { calls.push({ path, options }); const answer = answers.get(path); if (answer instanceof Error) throw answer; return typeof answer === 'function' ? answer(options) : answer }
  const exports = {}
  vm.runInNewContext(compiled, { exports, require: (name) => {
    if (name === 'react') return react
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' }
    if (name === 'antd') return antd
    if (name === '@phosphor-icons/react') return new Proxy({}, { get: (_, key) => String(key) })
    if (name.endsWith('/api')) return { api, errorMessage: (error) => error.message, json: (method, body) => ({ method, body: JSON.stringify(body) }), saveSession: (value, remember) => saved.push({ value, remember }) }
    if (name.endsWith('/GoogleIdentityButton')) return { __esModule: true, default: 'GoogleIdentityButton' }
    if (/\.(css|png|webp)$/.test(name)) return name
    throw new Error(`Unexpected ${page} import: ${name}`)
  }, FormData: class { constructor(fields) { this.fields = fields } get(name) { return this.fields[name] ?? null } }, window: { setTimeout: (fn) => { const id = ++nextTimer; timers.set(id, fn); return id }, clearTimeout: (id) => timers.delete(id) } })
  const render = () => { if (!mounted) return; cursor = 0; tree = exports.default({ onNavigateHome: () => navigation.push('/'), onNavigateRegister: () => navigation.push('/register'), onNavigateLogin: () => navigation.push('/login'), onAuthenticated: (value) => authenticated.push(value) }); for (const effect of effects.splice(0)) effect() }
  const all = (type, match = () => true) => nodes(tree).filter((node) => (node.type === type || node.type?.displayName === type) && match(node.props)).map((node) => node.props)
  const find = (type, match = () => true) => { const item = all(type, match)[0]; assert.ok(item, `Missing ${type} in ${page}`); return item }
  const flush = async () => { for (let index = 0; index < 12; index++) { await Promise.resolve(); render() } }
  render()
  return { all, find, calls, saved, authenticated, navigation, flush, render, set: (path, answer) => answers.set(path, answer), button: (label) => find('button', (props) => text(props.children) === label), submit: (fields) => find('form').onSubmit({ preventDefault() {}, currentTarget: fields }), modal: () => find('Modal'), change: (type, match, value) => { find(type, match).onChange({ target: { value } }); render() }, tick: (seconds) => { for (let index = 0; index < seconds; index++) { const due = [...timers.values()]; timers.clear(); for (const fn of due) fn(); render() } }, unmount: () => { mounted = false; for (const state of hooks) state.cleanup?.() }, lateUpdates: () => lateUpdates }
}

function checkNavigation(page, current) {
  const nav = page.find('nav')
  assert.ok(nav['aria-label'], 'auth navigation has an accessible name')
  const currentLink = page.find('a', (props) => props.href === current && props['aria-current'] === 'page')
  assert.ok(text(currentLink.children).trim(), 'current auth tab has a visible label')
  for (const link of page.all('a', (props) => ['/', '/login', '/register'].includes(props.href) && props.href !== current)) {
    assert.equal(typeof link.onClick, 'function', `${link.href} uses the App navigation callback`)
    const count = page.navigation.length
    let prevented = false
    link.onClick({ button: 0, preventDefault() { prevented = true } })
    assert.equal(prevented, true)
    assert.deepEqual(page.navigation.slice(count), [link.href])
    for (const modifier of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { button: 2 }]) {
      const before = page.navigation.length
      prevented = false
      link.onClick({ button: 0, ...modifier, preventDefault() { prevented = true } })
      assert.equal(prevented, false, 'modified clicks retain native browser navigation')
      assert.equal(page.navigation.length, before)
    }
  }
}

function checkFields(page, expected) {
  assert.equal(page.all('h1').length, 1, 'auth page has one primary heading')
  assert.equal(page.all('main').length, 1)
  const form = page.find('form')
  const fields = nodes(form).filter((node) => node.type === 'input').map((node) => node.props)
  assert.deepEqual(fields.map((field) => field.name), expected.map(([name]) => name), 'field names and order remain stable')
  const labels = page.all('label')
  for (const [name, autocomplete, required] of expected) {
    const field = fields.find((item) => item.name === name)
    if (autocomplete) assert.equal(field.autoComplete, autocomplete, `${name} supports password managers and autofill`)
    assert.equal(Boolean(field.required), required, `${name} keeps its validation`)
    assert.ok(labels.some((label) => field.id && label.htmlFor === field.id || nodes(label).some((node) => node.props?.name === name)), `${name} has an explicit or wrapping label`)
  }
  assert.equal(page.find('button', (props) => props.type === 'submit').disabled, false)
}

const loginFields = { username: 'HV-TEST', password: 'synthetic-password' }
const login = harness('LoginPage', { responses: { '/auth/login': session } })
checkNavigation(login, '/login')
checkFields(login, [['username', 'username', true], ['password', 'current-password', true], ['remember', null, false]])
assert.equal(login.all('GoogleIdentityButton').length, 0, 'Google is hidden without a configured client ID')
login.find('button', (props) => props['aria-label'] === 'Hiện mật khẩu').onClick(); login.render()
assert.equal(login.find('input', (props) => props.name === 'password').type, 'text')
login.find('button', (props) => props['aria-label'] === 'Ẩn mật khẩu').onClick(); login.render()
assert.equal(login.find('input', (props) => props.name === 'password').type, 'password')
await login.submit(loginFields); await login.flush()
assert.deepEqual(JSON.parse(login.calls[0].options.body), { account: loginFields.username, password: loginFields.password })
assert.equal(login.calls[0].options.method, 'POST')
assert.equal(login.saved[0].remember, false, 'unchecked remember explicitly selects session storage')
assert.equal(login.authenticated[0], session)

const remembered = harness('LoginPage', { responses: { '/auth/login': session } })
remembered.find('input', (props) => props.name === 'remember').onChange({ target: { checked: true } }); remembered.render()
await remembered.submit(loginFields); await remembered.flush()
assert.equal(remembered.saved[0].remember, true, 'checked remember explicitly selects persistent storage')

const pendingLogin = deferred()
const retryLogin = harness('LoginPage', { google: true, responses: { '/auth/login': () => pendingLogin.promise } })
const firstLogin = retryLogin.submit(loginFields)
retryLogin.submit(loginFields)
retryLogin.find('GoogleIdentityButton').onCredential('synthetic-credential')
await retryLogin.flush()
assert.equal(retryLogin.calls.length, 1, 'password and Google login share a duplicate-submit guard')
assert.equal(retryLogin.find('button', (props) => props.type === 'submit').disabled, true)
pendingLogin.resolve(session); await firstLogin; await retryLogin.flush()
assert.equal(retryLogin.saved.length, 1)
retryLogin.set('/auth/login', new Error('Sai tài khoản kiểm thử'))
await retryLogin.submit(loginFields); await retryLogin.flush()
assert.match(text(retryLogin.find('p', (props) => props.role === 'status').children), /Sai tài khoản kiểm thử/)
assert.equal(retryLogin.find('button', (props) => props.type === 'submit').disabled, false)
retryLogin.set('/auth/login', session)
await retryLogin.submit(loginFields); await retryLogin.flush()
assert.equal(retryLogin.authenticated.length, 2, 'a failed login can be retried')

const pendingGoogle = deferred()
const google = harness('LoginPage', { google: true, responses: { '/auth/google': () => pendingGoogle.promise } })
google.find('input', (props) => props.name === 'remember').onChange({ target: { checked: true } }); google.render()
const firstGoogle = google.find('GoogleIdentityButton').onCredential('synthetic-credential')
google.find('GoogleIdentityButton').onCredential('synthetic-credential')
google.submit(loginFields); await google.flush()
assert.equal(google.calls.length, 1)
assert.deepEqual(JSON.parse(google.calls[0].options.body), { credential: 'synthetic-credential' })
pendingGoogle.resolve(session); await firstGoogle; await google.flush()
assert.equal(google.saved[0].remember, true)
assert.equal(google.authenticated[0], session)
google.set('/auth/google', new Error('Google kiểm thử không thành công'))
await google.find('GoogleIdentityButton').onCredential('synthetic-credential'); await google.flush()
assert.match(text(google.find('p', (props) => props.role === 'status').children), /Google kiểm thử không thành công/)
assert.equal(google.find('button', (props) => props.type === 'submit').disabled, false)

const emailInput = (props) => props.type === 'email'
const codeInput = (props) => props.autoComplete === 'one-time-code'
const openForgot = (page) => { page.button('Quên mật khẩu?').onClick(); page.render(); assert.equal(page.modal().open, true) }
const otp = harness('LoginPage')
openForgot(otp)
const resetEmail = otp.find('Input', emailInput)
assert.equal(resetEmail.autoComplete, 'email')
assert.ok(resetEmail.id && otp.all('label', (props) => props.htmlFor === resetEmail.id).length, 'reset email has a persistent visible label')
for (const value of ['', 'khong-hop-le']) { otp.change('Input', emailInput, value); otp.modal().onOk(); await otp.flush() }
assert.equal(otp.calls.length, 0, 'invalid reset email never reaches the API')
assert.match(otp.find('Alert', (props) => props.type === 'error').title, /email/)
otp.change('Input', emailInput, '  hocvien@example.com  ')
otp.set('/auth/forgot-password', new Error('Không gửi được mã kiểm thử'))
otp.modal().onOk(); await otp.flush()
assert.match(otp.find('Alert', (props) => props.type === 'error').title, /Không gửi được/)
const pendingOtp = deferred()
otp.set('/auth/forgot-password', () => pendingOtp.promise)
otp.modal().onOk(); otp.modal().onOk(); await otp.flush()
assert.equal(otp.calls.length, 2, 'retry sends once; duplicate OTP requests are blocked')
assert.deepEqual(JSON.parse(otp.calls.at(-1).options.body), { email: 'hocvien@example.com' })
assert.equal(otp.modal().confirmLoading, true)
assert.equal(otp.modal().closable, false)
assert.equal(otp.modal().maskClosable, false)
assert.equal(otp.modal().keyboard, false)
assert.equal(otp.modal().cancelButtonProps.disabled, true)
otp.modal().onCancel(); otp.render()
assert.equal(otp.modal().open, true, 'pending OTP cannot be dismissed')
pendingOtp.resolve({ message: 'Đã gửi mã kiểm thử', devCode: '123456' }); await otp.flush()
assert.equal(otp.modal().title, 'Đặt lại mật khẩu')
assert.equal(otp.find('Input', emailInput).disabled, true)
assert.match(otp.find('Alert', (props) => props.type === 'info').title, /123456/)
for (const [type, match] of [['Input', codeInput], ['InputPassword', () => true]]) {
  const field = otp.find(type, match)
  assert.ok(field.id && otp.all('label', (props) => props.htmlFor === field.id).length, 'OTP and new password have visible labels')
}
assert.equal(otp.find('Input', codeInput).maxLength, 6)
assert.equal(otp.find('Input', codeInput).inputMode, 'numeric')
assert.equal(otp.find('InputPassword').autoComplete, 'new-password')
const countBeforeCooldown = otp.calls.length
otp.find('Button', (props) => text(props.children).startsWith('Gửi lại mã')).onClick(); await otp.flush()
assert.equal(otp.calls.length, countBeforeCooldown, 'cooldown is enforced in the handler, not only the button')
otp.find('Button', (props) => text(props.children) === 'Sửa email').onClick(); otp.render()
assert.equal(otp.modal().okButtonProps.disabled, true)
assert.equal(otp.find('Input', emailInput).disabled, false)
assert.equal(otp.all('Input', codeInput).length, 0)
otp.change('Input', emailInput, 'moi@example.com')
otp.modal().onOk(); await otp.flush()
assert.equal(otp.calls.length, countBeforeCooldown, 'editing email does not bypass the resend cooldown')
otp.tick(60)
assert.equal(otp.modal().okButtonProps.disabled, false)
otp.set('/auth/forgot-password', { message: 'Đã gửi lại mã' })
otp.modal().onOk(); await otp.flush()
assert.equal(JSON.parse(otp.calls.at(-1).options.body).email, 'moi@example.com')
assert.equal(otp.all('Alert', (props) => props.type === 'info').length, 0, 'new response clears the previous development code')
const resetCalls = () => otp.calls.filter((call) => call.path === '/auth/reset-password')
for (const code of ['', '12345', 'abcdef', '1234567']) { otp.change('Input', codeInput, code); otp.modal().onOk(); await otp.flush() }
assert.equal(resetCalls().length, 0)
otp.change('Input', codeInput, '123456')
otp.change('InputPassword', () => true, 'short')
otp.modal().onOk(); await otp.flush()
assert.equal(resetCalls().length, 0, 'short password never reaches the API')
otp.change('InputPassword', () => true, 'synthetic-new-password')
otp.set('/auth/reset-password', new Error('Mã kiểm thử đã hết hạn'))
otp.modal().onOk(); await otp.flush()
assert.equal(otp.modal().open, true)
assert.match(otp.find('Alert', (props) => props.type === 'error').title, /hết hạn/)
const pendingReset = deferred()
otp.set('/auth/reset-password', () => pendingReset.promise)
otp.modal().onOk(); otp.modal().onOk(); await otp.flush()
assert.equal(resetCalls().length, 2, 'password reset retry is guarded against double submission')
assert.equal(otp.find('Input', codeInput).disabled, true)
assert.equal(otp.find('InputPassword').disabled, true)
assert.deepEqual(JSON.parse(resetCalls().at(-1).options.body), { email: 'moi@example.com', code: '123456', newPassword: 'synthetic-new-password' })
otp.modal().onCancel(); otp.render(); assert.equal(otp.modal().open, true)
pendingReset.resolve({ message: 'Đã đổi mật khẩu kiểm thử' }); await otp.flush()
assert.equal(otp.modal().open, false)
assert.match(text(otp.find('p', (props) => props.role === 'status').children), /Đã đổi mật khẩu kiểm thử/)
assert.equal(otp.saved.length, 0, 'resetting a password does not create an authenticated session')
assert.equal(otp.find('Input', emailInput).value, '', 'successful reset clears sensitive form state')

for (const request of ['forgot', 'reset']) {
  const late = deferred()
  const stale = harness('LoginPage', { responses: { '/auth/forgot-password': request === 'forgot' ? () => late.promise : { message: 'Đã gửi' }, '/auth/reset-password': () => late.promise } })
  openForgot(stale); stale.change('Input', emailInput, 'hocvien@example.com'); stale.modal().onOk(); await stale.flush()
  if (request === 'reset') { stale.change('Input', codeInput, '123456'); stale.change('InputPassword', () => true, 'synthetic-new-password'); stale.modal().onOk(); await stale.flush() }
  stale.unmount(); late.resolve({ message: 'Phản hồi đến muộn', devCode: '123456' }); await stale.flush()
  assert.equal(stale.lateUpdates(), 0, `unmounted ${request} response cannot update the form`)
  assert.equal(stale.saved.length, 0)
}

const registration = { fullName: 'Học viên kiểm thử', email: 'hocvien@example.com', phone: '0912345678', password: 'synthetic-password', confirmPassword: 'synthetic-password', confirmInformation: 'on' }
const register = harness('RegisterPage', { responses: { '/auth/register': session } })
checkNavigation(register, '/register')
checkFields(register, [['fullName', 'name', true], ['email', 'email', true], ['phone', 'tel', true], ['password', 'new-password', true], ['confirmPassword', 'new-password', true], ['confirmInformation', null, true]])
assert.equal(register.find('input', (props) => props.name === 'email').type, 'email')
const phone = register.find('input', (props) => props.name === 'phone')
assert.equal(phone.maxLength, 10)
assert.equal(phone.pattern, '0[0-9]{9}')
for (const name of ['password', 'confirmPassword']) assert.equal(register.find('input', (props) => props.name === name).minLength, 8)
register.find('button', (props) => props['aria-label'] === 'Hiện mật khẩu').onClick(); register.render()
for (const name of ['password', 'confirmPassword']) assert.equal(register.find('input', (props) => props.name === name).type, 'text')
for (const phone of ['1234567890', '091234567', '09123456789', '09abcdefgh']) { await register.submit({ ...registration, phone }); await register.flush() }
await register.submit({ ...registration, confirmPassword: 'different-password' }); await register.flush()
assert.equal(register.calls.length, 0, 'invalid phone and mismatched passwords never reach the API')
assert.match(text(register.find('p', (props) => props.role === 'status').children), /chưa trùng khớp/)
register.set('/auth/register', new Error('Email kiểm thử đã tồn tại'))
await register.submit(registration); await register.flush()
assert.match(text(register.find('p', (props) => props.role === 'status').children), /đã tồn tại/)
assert.equal(register.saved.length, 0)
assert.equal(register.find('button', (props) => props.type === 'submit').disabled, false)
const pendingRegister = deferred()
register.set('/auth/register', () => pendingRegister.promise)
const firstRegister = register.submit({ ...registration, phone: ' 0912345678 ' })
register.submit(registration); await register.flush()
assert.equal(register.calls.length, 2, 'registration retry sends one request even when submitted twice')
assert.equal(register.find('button', (props) => props.type === 'submit').disabled, true)
assert.deepEqual(JSON.parse(register.calls.at(-1).options.body), { fullName: registration.fullName, email: registration.email, phone: registration.phone, password: registration.password })
pendingRegister.resolve(session); await firstRegister; await register.flush()
assert.equal(register.saved.length, 1)
assert.equal(register.authenticated[0], session)
assert.equal(register.find('button', (props) => props.type === 'submit').disabled, false)

console.log('PASS: auth labels/field order/native links; login and Google remember/pending/retry; OTP validation/cooldown/pending/reset/stale guards; registration validation/pending/retry/session')
