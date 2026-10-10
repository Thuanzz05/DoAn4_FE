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
const state = []
let stateIndex = 0
let effects = []
let committedEffects = []
let observer
const motionListeners = new Set()
const visibilityListeners = new Set()
const timers = new Map()
let timerId = 0
const motion = {
  matches: false,
  addEventListener: (_, listener) => motionListeners.add(listener),
  removeEventListener: (_, listener) => motionListeners.delete(listener),
}
const document = {
  hidden: false,
  addEventListener: (_, listener) => visibilityListeners.add(listener),
  removeEventListener: (_, listener) => visibilityListeners.delete(listener),
}
class MockObserver {
  constructor(callback) { this.callback = callback; this.targets = new Set(); observer = this }
  observe(target) { this.targets.add(target) }
  unobserve(target) { this.targets.delete(target) }
  disconnect() { this.targets.clear() }
}
const browser = {
  innerHeight: 800, matchMedia: () => motion, IntersectionObserver: MockObserver,
  setInterval: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id },
  clearInterval: (id) => timers.delete(id),
}
const exports = {}
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
vm.runInNewContext(compiled, { exports, window: browser, document, IntersectionObserver: MockObserver, require: (name) => {
  if (name === 'react') return {
    useRef: () => pageRef,
    useState: (initial) => {
      const index = stateIndex++
      if (index === state.length) state.push(typeof initial === 'function' ? initial() : initial)
      return [state[index], (value) => { state[index] = typeof value === 'function' ? value(state[index]) : value }]
    },
    useEffect: (effect, deps) => effects.push({ effect, deps }),
  }
  if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' }
  if (name === 'antd') return antd
  if (name === '@phosphor-icons/react') return new Proxy({}, { get: (_, key) => key })
  if (/\.(?:css|png|jpg|jpeg|webp|svg)$/.test(name)) return name
  if (name.endsWith('/CourseAdvisor')) return 'CourseAdvisor'
  throw new Error(`Unexpected homepage import: ${name}`)
} })
const calls = { login: 0, register: 0, verify: 0 }
const render = () => {
  stateIndex = 0
  effects = []
  return exports.default({ onLogin: () => calls.login++, onRegister: () => calls.register++, onVerifyCertificate: () => calls.verify++ })
}
const commit = () => {
  const rendered = render()
  effects.forEach((next, index) => {
    const previous = committedEffects[index]
    if (previous && next.deps?.every((value, dep) => Object.is(value, previous.deps?.[dep]))) next.cleanup = previous.cleanup
    else { previous?.cleanup?.(); next.cleanup = next.effect() }
  })
  committedEffects = effects
  return rendered
}
const unmount = () => { committedEffects.forEach(({ cleanup }) => cleanup?.()); committedEffects = [] }
const tree = render()
const scrollEffect = effects[0].effect
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
assert.doesNotMatch(text(tree), /Đồ án xây dựng hệ thống|Hình ảnh trên trang là ảnh minh họa được tạo/, 'removed homepage disclaimers stay removed')
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
assert.match(advisorSource, /message\.role === 'assistant' \? message\.content\.replaceAll\('\*\*', ''\) : message\.content/, 'course advisor hides Markdown bold markers from AI replies')
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
assert.equal(motionListeners.size, 0, 'unmount removes the preference listener')
const cleanupRemount = scrollEffect()
assert.equal(observer.targets.size, 2, 'StrictMode remount observes offscreen content again')
motion.matches = true
motionListeners.forEach((listener) => listener())
assert.ok(blocks.every((block) => !pending(block)), 'switching to reduced motion reveals all content')
cleanupRemount()
assert.equal(scrollEffect(), undefined, 'reduced motion skips animation setup')
motion.matches = false
delete browser.IntersectionObserver
assert.equal(scrollEffect(), undefined, 'unsupported browsers keep content visible')
browser.IntersectionObserver = MockObserver

let hovered = false
const heroBounds = { top: 0, bottom: 900 }
const heroElement = { getBoundingClientRect: () => heroBounds }
pageRef.current = {
  querySelectorAll: () => blocks,
  querySelector: (selector) => selector === '.home-hero' ? heroElement : hovered ? heroElement : null,
}
const slideFigures = (rendered) => nodes(rendered).filter((node) => node.props.className?.split(/\s+/).includes('home-photo-slide'))
const activeIndex = (rendered) => slideFigures(rendered).findIndex((node) => node.props.className.split(/\s+/).includes('is-active'))
const control = (rendered, label) => nodes(rendered).find((node) => node.type === 'button' && node.props['aria-label'] === label)?.props
const loadImage = (index) => { nodes(slideFigures(render())[index]).find((node) => node.type === 'img').props.onLoad(); return commit() }
const clickControl = (label) => { const button = control(render(), label); assert.ok(button, `Missing slideshow control ${label}`); button.onClick(); return commit() }
const tick = () => {
  assert.equal(timers.size, 1, 'autoplay owns one interval')
  const timer = [...timers.values()][0]
  assert.equal(timer.delay, 3000, 'autoplay changes every three seconds')
  timer.callback()
  return commit()
}
const changeMotion = (matches) => { motion.matches = matches; [...motionListeners].forEach((listener) => listener()); return commit() }
const changeVisibility = (hidden) => { document.hidden = hidden; [...visibilityListeners].forEach((listener) => listener()); return commit() }
const focusHero = (toggle = false) => {
  nodes(render()).find((node) => node.props.id === 'tong-quan').props.onFocusCapture({ target: { closest: () => toggle ? {} : null } })
  return commit()
}
let rendered = commit()
assert.equal(slideFigures(rendered).length, 3, 'hero cycles through three real photographs')
assert.equal(new Set(slideFigures(rendered).map((figure) => nodes(figure).find((node) => node.type === 'img').props.src)).size, 3, 'hero photographs use three distinct image assets')
assert.equal(activeIndex(rendered), 0, 'first photograph is shown immediately')
assert.equal(timers.size, 1, 'autoplay begins on a visible page without reduced motion')
assert.equal(control(rendered, 'Ảnh trước').disabled, true, 'previous waits for the target image')
assert.equal(control(rendered, 'Ảnh tiếp theo').disabled, true, 'next waits for the target image')
assert.equal(activeIndex(tick()), 0, 'autoplay cannot show an unloaded photograph')
rendered = loadImage(0)
assert.equal(activeIndex(tick()), 0, 'loading the current photograph does not mark the next ready')
assert.equal(activeIndex(clickControl('Ảnh tiếp theo')), 0, 'the next handler also rejects an unloaded target')
rendered = loadImage(1)
assert.equal(control(rendered, 'Ảnh trước').disabled, true, 'loading the second photograph does not mark the third ready')
assert.equal(control(rendered, 'Ảnh tiếp theo').disabled, false, 'loaded targets enable next')
assert.equal(activeIndex(clickControl('Ảnh trước')), 0, 'the previous handler rejects an unloaded third photograph')
for (const figure of slideFigures(rendered)) {
  const photograph = nodes(figure).find((node) => node.type === 'img').props
  assert.deepEqual([photograph.width, photograph.height], imageDimensions(readFileSync(new URL(`../src/pages/${photograph.src}`, import.meta.url))), 'each slide reserves its actual image dimensions')
}
rendered = tick()
assert.equal(activeIndex(rendered), 1, 'autoplay advances to the loaded second photograph')
assert.equal(slideFigures(rendered)[0].props['aria-hidden'], true, 'inactive photograph is hidden from assistive technology')
assert.equal(slideFigures(rendered)[1].props['aria-hidden'], false, 'active photograph remains available to assistive technology')
assert.equal(control(rendered, 'Ảnh tiếp theo').disabled, true, 'next waits independently for the third photograph')
assert.equal(activeIndex(tick()), 1, 'autoplay waits for the unloaded third photograph')
assert.equal(activeIndex(clickControl('Ảnh tiếp theo')), 1, 'the next handler rejects an unloaded third photograph')
rendered = loadImage(2)
assert.equal(control(rendered, 'Ảnh trước').disabled, false, 'loaded targets enable previous')
assert.equal(control(rendered, 'Ảnh tiếp theo').disabled, false, 'loading the third photograph enables next')
rendered = tick()
assert.equal(activeIndex(rendered), 2, 'autoplay advances to the loaded third photograph')
assert.equal(slideFigures(rendered)[1].props['aria-hidden'], true, 'second photograph becomes hidden when the third is active')
assert.equal(slideFigures(rendered)[2].props['aria-hidden'], false, 'third photograph remains available to assistive technology')
assert.equal(activeIndex(tick()), 0, 'autoplay wraps to the first photograph')
hovered = true
assert.equal(activeIndex(tick()), 0, 'hovering the header, actions or slideshow controls pauses automatic switching')
hovered = false
heroBounds.bottom = 0
assert.equal(activeIndex(tick()), 0, 'autoplay does not switch a hero above the viewport')
heroBounds.top = browser.innerHeight
heroBounds.bottom = 1700
assert.equal(activeIndex(tick()), 0, 'autoplay does not switch a hero below the viewport')
heroBounds.top = 0
heroBounds.bottom = 900
assert.equal(activeIndex(tick()), 1, 'visible hero resumes after hover and offscreen checks clear')
rendered = changeVisibility(true)
assert.equal(timers.size, 0, 'a hidden tab stops its interval')
assert.equal(activeIndex(rendered), 1, 'hiding the tab does not change the photograph')
changeVisibility(false)
assert.equal(timers.size, 1, 'visible tab resumes a single interval')
rendered = clickControl('Tạm dừng chuyển ảnh')
assert.equal(timers.size, 0, 'manual pause clears autoplay')
changeVisibility(true)
changeVisibility(false)
assert.equal(timers.size, 0, 'visibility changes preserve manual pause')
rendered = clickControl('Phát tự động chuyển ảnh')
assert.equal(timers.size, 1, 'manual play resumes autoplay')
focusHero(true)
assert.equal(timers.size, 1, 'focusing the play/pause button does not immediately cancel play')
focusHero()
assert.equal(timers.size, 0, 'focus on hero links stops autoplay')
clickControl('Phát tự động chuyển ảnh')
nodes(render()).find((node) => node.type === 'header').props.onFocusCapture()
commit()
assert.equal(timers.size, 0, 'focus in the overlaid header stops autoplay')
rendered = clickControl('Ảnh tiếp theo')
assert.equal(activeIndex(rendered), 2, 'next advances from the second to the third photograph')
rendered = clickControl('Ảnh tiếp theo')
assert.equal(activeIndex(rendered), 0, 'next wraps from the last photograph')
assert.equal(timers.size, 0, 'manual navigation stays paused')
rendered = clickControl('Ảnh trước')
assert.equal(activeIndex(rendered), 2, 'previous wraps from the first photograph')
clickControl('Phát tự động chuyển ảnh')
changeMotion(true)
assert.equal(timers.size, 0, 'switching to reduced motion stops autoplay')
assert.ok(control(render(), 'Phát tự động chuyển ảnh'), 'motion change updates the paused control')
changeMotion(false)
assert.equal(timers.size, 0, 'leaving reduced motion does not automatically undo pause')
clickControl('Phát tự động chuyển ảnh')
assert.equal(timers.size, 1)
unmount()
assert.equal(timers.size, 0, 'unmount clears the slideshow interval')
assert.equal(motionListeners.size, 0, 'unmount clears all motion listeners')
assert.equal(visibilityListeners.size, 0, 'unmount clears visibility listeners')
commit()
assert.equal(timers.size, 1, 'StrictMode remount recreates a single slideshow interval')
unmount()
assert.equal(timers.size, 0, 'StrictMode cleanup clears the recreated interval')
assert.equal(motionListeners.size, 0)
assert.equal(visibilityListeners.size, 0)
state.length = 0
motion.matches = true
rendered = commit()
assert.equal(activeIndex(rendered), 0, 'reduced motion starts on the first photograph')
assert.equal(timers.size, 0, 'initial reduced-motion preference never starts autoplay')
assert.ok(control(rendered, 'Phát tự động chuyển ảnh'), 'initial reduced motion renders the paused control')
loadImage(0)
loadImage(1)
loadImage(2)
assert.equal(activeIndex(clickControl('Ảnh tiếp theo')), 1, 'reduced motion still allows an explicit photograph change')
assert.equal(activeIndex(clickControl('Ảnh tiếp theo')), 2, 'reduced motion still allows the third photograph')
assert.equal(activeIndex(clickControl('Ảnh tiếp theo')), 0, 'reduced motion preserves next wrapping')
assert.equal(activeIndex(clickControl('Ảnh trước')), 2, 'reduced motion preserves previous wrapping')
assert.equal(timers.size, 0, 'manual changes under reduced motion keep autoplay stopped')
unmount()
assert.equal(motionListeners.size, 0)
assert.equal(visibilityListeners.size, 0)
state.length = 0
state.push(1, false, [true, true])
rendered = commit()
assert.equal(control(rendered, 'Ảnh tiếp theo').disabled, true, 'retained two-image readiness waits for the third photograph')
assert.equal(activeIndex(clickControl('Ảnh tiếp theo')), 1, 'retained readiness cannot advance before the third photograph loads')
rendered = loadImage(2)
assert.deepEqual(Array.from(state[2]), [true, true, true], 'third onLoad expands retained two-image readiness')
assert.equal(control(rendered, 'Ảnh tiếp theo').disabled, false, 'third onLoad enables next after a two-to-three photograph refresh')
assert.equal(activeIndex(clickControl('Ảnh tiếp theo')), 2, 'next reaches the third photograph after retained readiness is repaired')
unmount()
state.length = 0
state.push(1, false, [true, true])
rendered = commit()
const cachedThirdImage = nodes(slideFigures(rendered)[2]).find((node) => node.type === 'img').props
assert.equal(typeof cachedThirdImage.ref, 'function', 'photographs inspect cached completion when their refs attach')
const retainedReadyImages = state[2]
for (const image of [null, { complete: false, naturalWidth: 1920 }, { complete: true, naturalWidth: 0 }]) {
  cachedThirdImage.ref(image)
  assert.equal(state[2], retainedReadyImages, 'detached, incomplete and failed cached images do not change readiness')
  assert.equal(control(render(), 'Ảnh tiếp theo').disabled, true, 'next stays disabled until a cached third photograph is usable')
}
cachedThirdImage.ref({ complete: true, naturalWidth: 1920 })
rendered = commit()
assert.deepEqual(Array.from(state[2]), [true, true, true], 'a cached completed third photograph repairs retained readiness without onLoad')
assert.equal(control(rendered, 'Ảnh tiếp theo').disabled, false, 'a cached completed third photograph enables next without onLoad')
const completedReadyImages = state[2]
nodes(slideFigures(rendered)[2]).find((node) => node.type === 'img').props.ref({ complete: true, naturalWidth: 1920 })
assert.equal(state[2], completedReadyImages, 'repeated completed-image refs preserve state identity to avoid a render loop')
assert.equal(activeIndex(clickControl('Ảnh tiếp theo')), 2, 'next reaches the cached third photograph without waiting for onLoad')
unmount()
assert.doesNotMatch(source, /TODO|FIXME|tự code tiếp/i, 'no unfinished placeholder implementation')
const config = await new ESLint().calculateConfigForFile('src/pages/HomePage.tsx')
assert.equal(config.rules['no-warning-comments'][0], 2, 'unfinished comments fail lint')
for (const term of ['todo', 'fixme']) assert.ok(config.rules['no-warning-comments'][1].terms.includes(term))
const selectors = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)].map((match) => match[1].trim()).filter((selector) => !selector.startsWith('@'))
assert.ok(selectors.length, 'homepage stylesheet is not empty')
for (const selector of selectors) for (const part of selector.split(',')) assert.match(part.trim(), /^\.home-page(?=[\s.#:\[>+~]|$)/, `unscoped homepage CSS selector: ${part.trim()}`)
console.log('PASS: homepage navigation and content, slideshow readiness/autoplay/pause/motion/visibility/cleanup, scroll reveal lifecycle, image dimensions and scoped CSS')
