// node scripts/check-home-page.mjs — real homepage handlers; no browser or API writes.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { ESLint } from 'eslint'

const source = readFileSync(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/pages/HomePage.css', import.meta.url), 'utf8')
const advisorSource = readFileSync(new URL('../src/CourseAdvisor.tsx', import.meta.url), 'utf8')
const jsx = (type, props) => ({ type, props })
const nodes = (value) => !value || typeof value !== 'object' ? [] : [...(value.type && value.props ? [value] : []), ...Object.values(value).flatMap(nodes)]
const text = (value) => value == null || typeof value === 'boolean' ? '' : Array.isArray(value) ? value.map(text).join('') : typeof value === 'object' ? text(value.props?.children) : String(value)
const antd = { ConfigProvider: 'ConfigProvider', Tabs: 'Tabs', Collapse: 'Collapse' }
const pageRef = { current: null }
let scrollEffect
let motionListener
let observer
const motion = {
  matches: false,
  addEventListener: (_, listener) => { motionListener = listener },
  removeEventListener: (_, listener) => { if (motionListener === listener) motionListener = null },
}
class MockObserver {
  constructor(callback) { this.callback = callback; this.targets = new Set(); observer = this }
  observe(target) { this.targets.add(target) }
  unobserve(target) { this.targets.delete(target) }
  disconnect() { this.targets.clear() }
}
const browser = { innerHeight: 800, matchMedia: () => motion, IntersectionObserver: MockObserver }
const exports = {}
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
vm.runInNewContext(compiled, { exports, window: browser, IntersectionObserver: MockObserver, require: (name) => {
  if (name === 'react') return { useRef: () => pageRef, useEffect: (effect) => { scrollEffect = effect } }
  if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' }
  if (name === 'antd') return antd
  if (name === '@phosphor-icons/react') return new Proxy({}, { get: (_, key) => key })
  if (/\.(?:css|png|jpg|jpeg|webp|svg)$/.test(name)) return name
  if (name.endsWith('/CourseAdvisor')) return 'CourseAdvisor'
  throw new Error(`Unexpected homepage import: ${name}`)
} })
const calls = { login: 0, register: 0, verify: 0 }
const tree = exports.default({ onLogin: () => calls.login++, onRegister: () => calls.register++, onVerifyCertificate: () => calls.verify++ })
const all = nodes(tree)
const anchors = all.filter((node) => node.type === 'a').map((node) => node.props)
assert.ok(all.some((node) => node.props.className?.split(/\s+/).includes('home-page')), 'homepage has its own CSS scope')
for (const tag of ['h1', 'main', 'nav']) assert.equal(all.filter((node) => node.type === tag).length, 1, `homepage has exactly one ${tag}`)
const navigation = nodes(all.find((node) => node.type === 'nav')).filter((node) => node.type === 'a')
for (const [href, label] of [['#tong-quan', 'Tổng quan'], ['#van-hanh', 'Vận hành'], ['#vai-tro', 'Vai trò'], ['/verify-certificate', 'Xác thực chứng chỉ']]) {
  assert.ok(navigation.some((link) => link.props.href === href && text(link) === label), `Primary navigation preserves ${label}`)
}
for (const [href, callback] of [['/login', 'login'], ['/register', 'register'], ['/verify-certificate', 'verify']]) {
  const links = anchors.filter((link) => link.href === href)
  assert.ok(links.length, `Missing public link ${href}`)
  for (const link of links) {
    assert.equal(typeof link.onClick, 'function', `${href} uses the App callback`)
    const before = { ...calls }
    let prevented = false
    link.onClick({ button: 0, preventDefault() { prevented = true } })
    assert.equal(prevented, true, `${href} avoids a full-page reload on a plain click`)
    for (const key of Object.keys(calls)) assert.equal(calls[key], before[key] + Number(key === callback), `${href} calls only ${callback}`)
    for (const modifier of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { button: 2 }]) {
      const after = { ...calls }
      prevented = false
      link.onClick({ button: 0, ...modifier, preventDefault() { prevented = true } })
      assert.equal(prevented, false, `${href} preserves browser behavior for modified or non-left clicks`)
      assert.deepEqual(calls, after, 'modified clicks do not navigate the current tab')
    }
  }
}
const declaredIds = all.map((node) => node.props.id).filter(Boolean)
const ids = new Set(declaredIds)
assert.equal(ids.size, declaredIds.length, 'homepage has no duplicate IDs')
for (const id of ['top', 'tong-quan', 'van-hanh', 'vai-tro']) {
  assert.ok(ids.has(id), `Missing section ${id}`)
  assert.ok(anchors.some((link) => link.href === `#${id}`), `Missing anchor #${id}`)
}
for (const link of anchors) {
  assert.ok(link.href && link.href !== '#', 'no empty or dead placeholder links')
  if (link.href.startsWith('#')) assert.ok(ids.has(link.href.slice(1)), `${link.href} resolves to an existing section`)
  else assert.ok(['/login', '/register', '/verify-certificate'].includes(link.href), `${link.href} is an existing public route`)
}
const tabs = all.filter((node) => node.type === 'Tabs')
assert.equal(tabs.length, 1, 'roles use the accessible Ant Design Tabs component')
assert.equal(tabs[0].props.items.length, 3)
assert.equal(new Set(tabs[0].props.items.map((item) => item.key)).size, 3)
for (const label of ['Quản trị viên', 'Giáo viên', 'Học viên']) assert.ok(tabs[0].props.items.some((item) => text(item.label) === label), `Missing role ${label}`)
for (const item of tabs[0].props.items) assert.ok(text(item.children).trim(), `Role ${item.key} has real explanatory content`)
const accordions = all.filter((node) => node.type === 'Collapse')
assert.equal(accordions.length, 1, 'operations use the accessible Ant Design Collapse component')
assert.notEqual(accordions[0].props.accordion, true, 'operations use button headers, not the Ant accordion mode with an invalid tablist hierarchy')
const accordionItems = accordions[0].props.items
assert.equal(accordionItems.length, 3, 'operations have three topic groups')
assert.equal(new Set(accordionItems.map((item) => item.key)).size, 3, 'accordion items have unique keys')
assert.equal(new Set(accordionItems.map((item) => text(item.label))).size, 3, 'accordion labels are distinct')
for (const item of accordionItems) {
  assert.ok(text(item.label).trim(), `Accordion ${item.key} has a meaningful label`)
  assert.ok(text(item.children).trim(), `Accordion ${item.key} has explanatory content`)
}
const accordionContent = accordionItems.flatMap((item) => nodes(item.children))
const featureHeadings = accordionContent.filter((node) => node.type === 'h3').map(text)
assert.equal(featureHeadings.length, 6, 'accordion contains all six feature headings')
const featureDescriptions = accordionContent.filter((node) => node.type === 'p').map(text)
assert.equal(featureDescriptions.length, 6, 'each feature includes a description inside the accordion')
for (const description of featureDescriptions) assert.ok(description.trim(), 'feature descriptions are not empty')
for (const title of ['Học viên và ghi danh', 'Lớp học và lịch học', 'Điểm danh và kết quả', 'Học phí', 'Kỳ thi', 'Chứng chỉ']) {
  assert.equal(featureHeadings.filter((heading) => heading === title).length, 1, `Accordion explains ${title} exactly once`)
}
assert.doesNotMatch(all.map(text).join('') + [...tabs[0].props.items, ...accordionItems].map((item) => text(item.label)).join(''), /—/, 'visible homepage copy has no em dash')
const hero = all.find((node) => node.type === 'img' && node.props.loading === 'eager')?.props
assert.ok(hero, 'above-the-fold hero is not lazy-loaded')
assert.equal(hero.fetchPriority, 'high')
assert.ok(hero.src && hero.alt?.trim(), 'hero has an image source and descriptive alternative text')
assert.ok(Number.isInteger(hero.width) && hero.width > 0 && Number.isInteger(hero.height) && hero.height > 0, 'hero declares intrinsic dimensions to reserve layout space')
const image = readFileSync(new URL(`../src/pages/${hero.src}`, import.meta.url))
const imageDimensions = (buffer) => {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)]
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF', 'hero is PNG or WebP')
  assert.equal(buffer.toString('ascii', 8, 12), 'WEBP')
  const chunk = buffer.toString('ascii', 12, 16)
  if (chunk === 'VP8X') return [buffer.readUIntLE(24, 3) + 1, buffer.readUIntLE(27, 3) + 1]
  if (chunk === 'VP8L') {
    assert.equal(buffer[20], 0x2f, 'lossless WebP has its required signature')
    const bits = buffer.readUInt32LE(21)
    return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1]
  }
  assert.equal(chunk, 'VP8 ', 'WebP contains a supported image header')
  assert.equal(buffer.subarray(23, 26).toString('hex'), '9d012a', 'lossy WebP has its required frame signature')
  return [buffer.readUInt16LE(26) & 0x3fff, buffer.readUInt16LE(28) & 0x3fff]
}
for (const [chunk, payload] of [['VP8 ', '0000009d012a41017b00'], ['VP8L', '2f40811e00'], ['VP8X', '000000004001007a0000']]) {
  const fixture = Buffer.alloc(30)
  fixture.write('RIFF', 0); fixture.write('WEBP', 8); fixture.write(chunk, 12)
  Buffer.from(payload, 'hex').copy(fixture, 20)
  assert.deepEqual(imageDimensions(fixture), [321, 123], `${chunk.trim()} dimensions are decoded correctly`)
}
assert.deepEqual([hero.width, hero.height], imageDimensions(image), 'declared intrinsic dimensions match the actual hero asset')
assert.match(css, /\.home-page \.advisor-trigger\s*\{[^}]*position:\s*fixed;[^}]*right:\s*24px;[^}]*bottom:\s*24px;/s, 'course advisor stays pinned to the bottom-right corner')
assert.doesNotMatch(advisorSource, /length\s*<\s*5|minLength=\{5\}/, 'course advisor accepts short non-empty questions')
assert.match(advisorSource, /disabled=\{!question\.trim\(\) \|\| loading\}/, 'send is disabled only for blank or pending questions')
const blocks = [100, 900, 1500].map((top) => ({
  classList: { values: new Set(), add(value) { this.values.add(value) }, remove(value) { this.values.delete(value) } },
  getBoundingClientRect: () => ({ top }),
}))
pageRef.current = { querySelectorAll: () => blocks }
const pending = (block) => block.classList.values.has('home-reveal-pending')
const cleanupScroll = scrollEffect()
assert.equal(pending(blocks[0]), false, 'initially visible content stays visible')
assert.equal(observer.targets.size, 2, 'only offscreen content is observed')
observer.callback([{ target: blocks[1], isIntersecting: false }])
assert.equal(pending(blocks[1]), true, 'offscreen content waits for entry')
observer.callback([{ target: blocks[1], isIntersecting: true }])
assert.equal(pending(blocks[1]), false, 'entering content is revealed')
assert.equal(observer.targets.has(blocks[1]), false, 'revealed content does not animate again')
cleanupScroll()
assert.equal(observer.targets.size, 0, 'unmount disconnects observation')
assert.ok(blocks.every((block) => !pending(block)), 'cleanup leaves no hidden content')
assert.equal(motionListener, null, 'unmount removes the preference listener')
const cleanupRemount = scrollEffect()
assert.equal(observer.targets.size, 2, 'StrictMode remount observes offscreen content again')
motion.matches = true
motionListener()
assert.ok(blocks.every((block) => !pending(block)), 'switching to reduced motion reveals all content')
cleanupRemount()
assert.equal(scrollEffect(), undefined, 'reduced motion skips animation setup')
motion.matches = false
delete browser.IntersectionObserver
assert.equal(scrollEffect(), undefined, 'unsupported browsers keep content visible')
assert.doesNotMatch(source, /TODO|FIXME|tự code tiếp/i, 'no unfinished placeholder implementation')
const config = await new ESLint().calculateConfigForFile('src/pages/HomePage.tsx')
assert.equal(config.rules['no-warning-comments'][0], 2, 'unfinished comments fail lint')
for (const term of ['todo', 'fixme']) assert.ok(config.rules['no-warning-comments'][1].terms.includes(term))
const selectors = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)].map((match) => match[1].trim()).filter((selector) => !selector.startsWith('@'))
assert.ok(selectors.length, 'homepage stylesheet is not empty')
for (const selector of selectors) for (const part of selector.split(',')) assert.match(part.trim(), /^\.home-page(?=[\s.#:\[>+~]|$)/, `unscoped homepage CSS selector: ${part.trim()}`)
console.log('PASS: homepage navigation and content, scroll reveal lifecycle and fallbacks, eager hero dimensions, scoped CSS and no unfinished placeholders')
