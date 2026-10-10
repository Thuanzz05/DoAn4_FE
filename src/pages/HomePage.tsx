import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { ArrowRight, CalendarBlank, CaretLeft, CaretRight, Certificate, GraduationCap, IdentificationCard, Pause, Play, Receipt, UsersThree } from '@phosphor-icons/react'
import { Collapse, ConfigProvider, Tabs } from 'antd'
import heroImage from '../assets/classroom-pexels-8423020.webp'
import centerImage from '../assets/lesson-pexels-5905527.webp'
import teachingImage from '../assets/teaching-pexels-8419196.webp'
import CourseAdvisor from '../CourseAdvisor'
import './HomePage.css'

type Props = { onLogin: () => void; onRegister: () => void; onVerifyCertificate: () => void }

const heroSlides = [
  { image: heroImage, width: 1920, height: 1282, alt: 'Giáo viên trao đổi với học viên trong một lớp học' },
  { image: centerImage, width: 1200, height: 800, alt: 'Giáo viên hướng dẫn hai học viên trao đổi bài học tại lớp' },
  { image: teachingImage, width: 1920, height: 1280, alt: 'Giáo viên theo dõi học viên thảo luận trong lớp học' },
]

const features = [
  { title: 'Học viên và ghi danh', description: 'Quản lý hồ sơ, kết quả đầu vào và ghi danh các khóa học.', icon: IdentificationCard },
  { title: 'Lớp học và lịch học', description: 'Phân công giáo viên, bố trí phòng và theo dõi từng buổi học.', icon: CalendarBlank },
  { title: 'Điểm danh và kết quả', description: 'Ghi nhận chuyên cần, tra cứu điểm Nghe, Nói, Đọc, Viết.', icon: UsersThree },
  { title: 'Học phí', description: 'Theo dõi hóa đơn, hạn thanh toán và xác nhận học phí.', icon: Receipt },
  { title: 'Kỳ thi', description: 'Quản lý lịch thi, điều kiện dự thi và kết quả từng kỳ.', icon: GraduationCap },
  { title: 'Chứng chỉ', description: 'Cấp chứng chỉ PDF và tra cứu thông tin xác thực công khai.', icon: Certificate },
]

const roles = [
  {
    key: 'admin', label: 'Quản trị viên', title: 'Quản lý học vụ và tài chính',
    description: 'Tiếp nhận học viên, tư vấn khóa học và tổ chức các hoạt động đào tạo của trung tâm.',
    tasks: ['Ghi nhận kiểm tra đầu vào, ghi danh và xếp lớp.', 'Quản lý giáo viên, phòng học, lịch học và kỳ thi.', 'Xác nhận học phí, cấp chứng chỉ và xuất báo cáo.'],
  },
  {
    key: 'teacher', label: 'Giáo viên', title: 'Theo dõi các lớp đang giảng dạy',
    description: 'Sử dụng tài khoản giáo viên để cập nhật thông tin trong phạm vi các lớp được phân công.',
    tasks: ['Xem thời khóa biểu và danh sách học viên.', 'Điểm danh theo từng buổi học.', 'Nhập điểm thi và theo dõi kết quả toàn khóa.'],
  },
  {
    key: 'student', label: 'Học viên', title: 'Tra cứu thông tin học tập cá nhân',
    description: 'Thông tin của các khóa đang học và lịch sử học tập được lưu trong tài khoản học viên.',
    tasks: ['Xem đánh giá đầu vào, lớp học và lịch học.', 'Tra cứu chuyên cần, điểm thi và học phí.', 'Nhận thông báo và tải chứng chỉ được cấp.'],
  },
]

export default function HomePage({ onLogin, onRegister, onVerifyCertificate }: Props) {
  const pageRef = useRef<HTMLDivElement>(null)
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPlaying, setIsPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [readyImages, setReadyImages] = useState(heroSlides.map(() => false))

  const markImageReady = (index: number) => {
    setReadyImages((current) => {
      if (current[index]) return current
      return heroSlides.map((_, imageIndex) => Boolean(current[imageIndex]) || imageIndex === index)
    })
  }

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (motion.matches || !('IntersectionObserver' in window)) return

    const blocks = Array.from(pageRef.current?.querySelectorAll<HTMLElement>('[data-home-reveal]') ?? [])
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.remove('home-reveal-pending')
        observer.unobserve(entry.target)
      }
    }, { rootMargin: '0px 0px -48px 0px' })

    for (const block of blocks) {
      if (block.getBoundingClientRect().top < window.innerHeight) continue
      block.classList.add('home-reveal-pending')
      observer.observe(block)
    }

    const revealAll = () => {
      observer.disconnect()
      blocks.forEach((block) => block.classList.remove('home-reveal-pending'))
    }
    motion.addEventListener('change', revealAll)
    return () => {
      motion.removeEventListener('change', revealAll)
      revealAll()
    }
  }, [])

  useEffect(() => {
    if (!isPlaying) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let timer = 0
    const stop = () => { window.clearInterval(timer); timer = 0 }
    const start = () => {
      stop()
      if (motion.matches || document.hidden) return
      timer = window.setInterval(() => {
        const hero = pageRef.current?.querySelector<HTMLElement>('.home-hero')
        if (!hero || hero.getBoundingClientRect().bottom <= 0 || hero.getBoundingClientRect().top >= window.innerHeight
          || pageRef.current?.querySelector('.home-header:hover, .home-hero-actions:hover, .home-slideshow-controls:hover')) return
        setActiveSlide((current) => {
          const next = (current + 1) % heroSlides.length
          return readyImages[next] ? next : current
        })
      }, 3000)
    }
    const onMotionChange = () => {
      if (motion.matches) { stop(); setIsPlaying(false) }
      else start()
    }
    start()
    motion.addEventListener('change', onMotionChange)
    document.addEventListener('visibilitychange', start)
    return () => {
      stop()
      motion.removeEventListener('change', onMotionChange)
      document.removeEventListener('visibilitychange', start)
    }
  }, [isPlaying, readyImages])

  const changeSlide = (direction: number) => {
    const next = (activeSlide + direction + heroSlides.length) % heroSlides.length
    if (!readyImages[next]) return
    setIsPlaying(false)
    setActiveSlide(next)
  }

  const open = (event: MouseEvent<HTMLAnchorElement>, action: () => void) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault(); action()
  }

  return <div className="home-page" id="top" ref={pageRef}>
    <a className="home-skip-link" href="#home-content">Bỏ qua menu</a>
    <header className="home-header home-container" onFocusCapture={() => setIsPlaying(false)}>
      <a className="wordmark" href="#top"><span>Trung tâm</span><small>Hệ thống quản lý ngoại ngữ</small></a>
      <nav className="home-navigation" aria-label="Điều hướng chính">
          <a href="#tong-quan">Tổng quan</a>
          <a href="#van-hanh">Vận hành</a>
          <a href="#vai-tro">Vai trò</a>
          <a href="/verify-certificate" onClick={(event) => open(event, onVerifyCertificate)}>Xác thực chứng chỉ</a>
      </nav>
      <a className="home-login-link" href="/login" onClick={(event) => open(event, onLogin)}>Đăng nhập <ArrowRight size={16} aria-hidden="true" /></a>
    </header>

    <main id="home-content" tabIndex={-1}>
      <section className="home-hero" id="tong-quan" aria-labelledby="page-title" onFocusCapture={(event) => {
        if (!event.target.closest('.home-slideshow-toggle')) setIsPlaying(false)
      }}>
        <div className="home-photo" role="group" aria-label="Ảnh lớp học" aria-roledescription="trình chiếu">
          {heroSlides.map((slide, index) => <figure key={slide.image} className={`home-photo-slide${activeSlide === index ? ' is-active' : ''}`} aria-hidden={activeSlide !== index}>
            <img src={slide.image} width={slide.width} height={slide.height} alt={slide.alt}
              loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'low'} decoding="async"
              onLoad={() => markImageReady(index)} ref={(image) => {
                if (image?.complete && image.naturalWidth > 0) markImageReady(index)
              }} />
          </figure>)}
        </div>
        <div className="home-container home-hero-content">
          <div className="home-hero-copy">
            <p className="home-eyebrow">Cổng thông tin trung tâm ngoại ngữ</p>
            <h1 id="page-title">Học ngoại ngữ, hiểu thêm thế giới.</h1>
            <p>Lịch học, kết quả và chứng chỉ được kết nối trong một tài khoản.</p>
            <div className="home-hero-actions">
              <a className="home-button" href="/login" onClick={(event) => open(event, onLogin)}>Đăng nhập <ArrowRight size={18} aria-hidden="true" /></a>
              <a className="home-link" href="#van-hanh">Tìm hiểu hệ thống</a>
            </div>
            <div className="home-slideshow-controls" role="group" aria-label="Điều khiển ảnh nền">
              <button type="button" aria-label="Ảnh trước" disabled={!readyImages[(activeSlide + heroSlides.length - 1) % heroSlides.length]} onClick={() => changeSlide(-1)}><CaretLeft size={18} aria-hidden="true" /></button>
              <span className="home-slide-count" aria-live="off">{activeSlide + 1} / {heroSlides.length}</span>
              <button type="button" aria-label="Ảnh tiếp theo" disabled={!readyImages[(activeSlide + 1) % heroSlides.length]} onClick={() => changeSlide(1)}><CaretRight size={18} aria-hidden="true" /></button>
              <button className="home-slideshow-toggle" type="button" aria-label={isPlaying ? 'Tạm dừng chuyển ảnh' : 'Phát tự động chuyển ảnh'} title={isPlaying ? 'Tạm dừng chuyển ảnh' : 'Phát tự động chuyển ảnh'} onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="home-roles home-container" id="vai-tro" aria-labelledby="roles-title" data-home-reveal>
        <div className="home-roles-heading">
          <p className="home-eyebrow">Một nơi để kết nối</p>
          <h2 id="roles-title">Việc học của bạn, luôn trong tầm tay.</h2>
          <p>Mỗi tài khoản có một vai trò và phạm vi thông tin riêng.</p>
        </div>
        <div className="home-roles-layout">
          <figure className="home-center-photo">
            <img src={centerImage} width={1200} height={800} loading="lazy" decoding="async" alt="Giáo viên hướng dẫn hai học viên trao đổi bài học tại lớp" />
          </figure>
          <ConfigProvider theme={{ token: { colorPrimary: '#285349', colorText: '#203b34', fontFamily: "'Manrope', sans-serif", borderRadius: 2 } }}>
            <Tabs aria-label="Chọn vai trò sử dụng" defaultActiveKey="student" items={roles.map((role) => ({
              key: role.key, label: role.label,
              children: <article className="home-role-content">
                <div><h3>{role.title}</h3><p>{role.description}</p></div>
                <ul>{role.tasks.map((task) => <li key={task}>{task}</li>)}</ul>
              </article>,
            }))} />
          </ConfigProvider>
        </div>
      </section>

      <section className="home-information" id="van-hanh" aria-labelledby="operations-title">
        <div className="home-container home-information-layout">
          <div className="home-information-heading" data-home-reveal>
            <p className="home-eyebrow">Đồng hành suốt khóa học</p>
            <h2 id="operations-title">Từ ghi danh đến nhận chứng chỉ.</h2>
            <p>Hệ thống hỗ trợ nhiều ngoại ngữ, lưu tập trung hồ sơ, lớp học và kết quả theo từng khóa.</p>
          </div>
          <div className="home-functions" data-home-reveal>
            <ConfigProvider theme={{ token: { colorPrimary: '#285349', colorText: '#203b34', fontFamily: "'Manrope', sans-serif", borderRadius: 2 } }}>
              <Collapse ghost defaultActiveKey={['training']} items={[
                { key: 'training', label: 'Ghi danh và tổ chức lớp', features: features.slice(0, 2) },
                { key: 'learning', label: 'Theo dõi học tập và học phí', features: features.slice(2, 4) },
                { key: 'results', label: 'Thi và cấp chứng chỉ', features: features.slice(4) },
              ].map(({ key, label, features: group }) => ({ key, label, children: <ul className="home-feature-list">
                {group.map(({ title, description, icon: Icon }) => <li key={title}>
                  <Icon aria-hidden="true" size={22} /><div><h3>{title}</h3><p>{description}</p></div>
                </li>)}
              </ul> }))} />
            </ConfigProvider>
          </div>
        </div>
      </section>

      <section className="home-quick-access home-container" aria-label="Thông tin dành cho người truy cập">
        <div className="home-new-student" data-home-reveal>
          <IdentificationCard size={30} aria-hidden="true" />
          <div>
            <h2>Bạn mới đến trung tâm?</h2>
            <p>Có thể tạo tài khoản trước khi ghi danh. Trung tâm ghi nhận đánh giá đầu vào và tư vấn khóa phù hợp.</p>
            <a className="home-link" href="/register" onClick={(event) => open(event, onRegister)}>Tạo tài khoản <ArrowRight size={17} aria-hidden="true" /></a>
          </div>
        </div>
        <div className="home-certificate-access" data-home-reveal>
          <Certificate size={30} aria-hidden="true" />
          <div>
            <h2>Kiểm tra một chứng chỉ.</h2>
            <p>Đối chiếu thông tin bằng mã xác thực trên chứng chỉ đã cấp. Không cần tài khoản.</p>
            <a className="home-link" href="/verify-certificate" onClick={(event) => open(event, onVerifyCertificate)}>Xác thực chứng chỉ <ArrowRight size={17} aria-hidden="true" /></a>
          </div>
        </div>
        <p className="home-academic-note">Học phí được kiểm tra trước khi dự thi. Hồ sơ chứng chỉ cần đủ chuyên cần và điểm của tất cả kỳ thi.</p>
      </section>
    </main>

    <footer className="home-footer">
      <div className="home-container home-footer-content">
        <div className="home-footer-brand"><strong>Trung tâm</strong><p>Cổng thông tin học viên, giáo viên và quản trị.</p></div>
        <div className="home-footer-links"><a href="#top">Về đầu trang</a><a href="/verify-certificate" onClick={(event) => open(event, onVerifyCertificate)}>Xác thực chứng chỉ</a></div>
        <CourseAdvisor />
      </div>
    </footer>
  </div>
}
