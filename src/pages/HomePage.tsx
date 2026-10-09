import { useEffect, useRef, type MouseEvent } from 'react'
import { ArrowRight, CalendarBlank, Certificate, GraduationCap, IdentificationCard, Receipt, UsersThree } from '@phosphor-icons/react'
import { Collapse, ConfigProvider, Tabs } from 'antd'
import heroImage from '../assets/language-classroom-v2.webp'
import centerImage from '../assets/language-center-interior.webp'
import CourseAdvisor from '../CourseAdvisor'
import './HomePage.css'

type Props = { onLogin: () => void; onRegister: () => void; onVerifyCertificate: () => void }

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

  const open = (event: MouseEvent<HTMLAnchorElement>, action: () => void) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault(); action()
  }

  return <div className="home-page" id="top" ref={pageRef}>
    <a className="home-skip-link" href="#home-content">Bỏ qua menu</a>
    <header className="home-header home-container">
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
      <section className="home-hero home-container" id="tong-quan" aria-labelledby="page-title">
        <div className="home-hero-copy">
          <h1 id="page-title">Cổng thông tin trung tâm ngoại ngữ</h1>
          <p>Tra cứu lịch học, kết quả, học phí và chứng chỉ. Dành cho học viên, giáo viên và quản trị.</p>
          <div className="home-hero-actions">
            <a className="home-button" href="/login" onClick={(event) => open(event, onLogin)}>Đăng nhập <ArrowRight size={18} aria-hidden="true" /></a>
            <a className="home-link" href="#van-hanh">Tìm hiểu hệ thống</a>
          </div>
        </div>
        <figure className="home-photo">
          <img src={heroImage} width={1672} height={941} loading="eager" fetchPriority="high" decoding="async" alt="Ảnh minh họa giáo viên và học viên trao đổi trong một lớp ngoại ngữ" />
        </figure>
      </section>

      <section className="home-roles home-container" id="vai-tro" aria-labelledby="roles-title" data-home-reveal>
        <div className="home-roles-heading">
          <h2 id="roles-title">Thông tin đúng với vai trò của bạn.</h2>
          <p>Mỗi tài khoản có một vai trò và phạm vi thông tin riêng.</p>
        </div>
        <ConfigProvider theme={{ token: { colorPrimary: '#234e70', colorText: '#202b33', fontFamily: "'Manrope', sans-serif", borderRadius: 6 } }}>
          <Tabs aria-label="Chọn vai trò sử dụng" defaultActiveKey="student" items={roles.map((role) => ({
            key: role.key, label: role.label,
            children: <article className="home-role-content">
              <div><h3>{role.title}</h3><p>{role.description}</p></div>
              <ul>{role.tasks.map((task) => <li key={task}>{task}</li>)}</ul>
            </article>,
          }))} />
        </ConfigProvider>
      </section>

      <section className="home-information" id="van-hanh" aria-labelledby="operations-title">
        <div className="home-container home-information-layout">
          <figure className="home-center-photo" data-home-reveal>
            <img src={centerImage} width={1448} height={1086} loading="lazy" decoding="async" alt="Ảnh minh họa không gian tiếp nhận học viên và phòng học" />
          </figure>
          <div className="home-functions" data-home-reveal>
            <h2 id="operations-title">Từ ghi danh đến nhận chứng chỉ.</h2>
            <p>Hệ thống hỗ trợ nhiều ngoại ngữ, lưu tập trung hồ sơ, lớp học và kết quả theo từng khóa.</p>
            <ConfigProvider theme={{ token: { colorPrimary: '#234e70', colorText: '#202b33', fontFamily: "'Manrope', sans-serif", borderRadius: 6 } }}>
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
        <div><strong>Trung tâm</strong><p>Đồ án xây dựng hệ thống quản lý trung tâm ngoại ngữ trên nền tảng web.</p><small>Hình ảnh trên trang là ảnh minh họa được tạo, không phải ảnh chụp trung tâm.</small></div>
        <div className="home-footer-links"><a href="#top">Về đầu trang</a><a href="/verify-certificate" onClick={(event) => open(event, onVerifyCertificate)}>Xác thực chứng chỉ</a></div>
        <CourseAdvisor />
      </div>
    </footer>
  </div>
}
