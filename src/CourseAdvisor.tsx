import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { ChatCircleText, PaperPlaneTilt, X } from '@phosphor-icons/react'
import { api, errorMessage, json } from './api'

type Message = { role: 'assistant' | 'user'; content: string }

const suggestions = [
  'Tôi mới bắt đầu, nên học khóa nào?',
  'Tôi muốn học để giao tiếp khi đi làm.',
  'Tư vấn khóa phù hợp với người bận rộn.',
]

function CourseAdvisor() {
  const dialog = useRef<HTMLDialogElement>(null)
  const messageList = useRef<HTMLDivElement>(null)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Bạn đang muốn học ngoại ngữ nào và mục tiêu của bạn là gì?' },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    messageList.current?.scrollTo({ top: messageList.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const ask = async (event?: FormEvent) => {
    event?.preventDefault()
    const value = question.trim()
    if (!value || loading) return
    setMessages((current) => [...current, { role: 'user', content: value }])
    setQuestion('')
    setError('')
    setLoading(true)
    try {
      const result = await api<{ answer: string }>('/ai/tu-van-khoa-hoc', json('POST', { question: value }))
      setMessages((current) => [...current, { role: 'assistant', content: result.answer }])
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  const submitOnEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void ask()
    }
  }

  return <>
    <button className="advisor-trigger" type="button" onClick={() => dialog.current?.showModal()}>
      <ChatCircleText aria-hidden="true" />
      <span>Tư vấn khóa học</span>
    </button>

    <dialog className="advisor-dialog" ref={dialog} aria-labelledby="advisor-title">
      <header className="advisor-header">
        <div className="advisor-mark"><ChatCircleText aria-hidden="true" /></div>
        <div><h2 id="advisor-title">Tư vấn khóa học</h2><p>Gợi ý tự động từ các khóa đang mở</p></div>
        <button type="button" onClick={() => dialog.current?.close()} aria-label="Đóng tư vấn"><X weight="bold" /></button>
      </header>

      <div className="advisor-messages" ref={messageList} aria-live="polite">
        {messages.map((message, index) => <div className={`advisor-message ${message.role}`} key={`${message.role}-${index}`}>
          {message.role === 'assistant' && <ChatCircleText weight="duotone" aria-hidden="true" />}
          <p>{message.content}</p>
        </div>)}
        {messages.length === 1 && <div className="advisor-suggestions" aria-label="Câu hỏi gợi ý">
          {suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => setQuestion(suggestion)}>{suggestion}</button>)}
        </div>}
        {loading && <div className="advisor-thinking"><span /><span /><span /><em>Đang tìm khóa phù hợp</em></div>}
        {error && <p className="advisor-error" role="alert">{error}</p>}
      </div>

      <form className="advisor-compose" onSubmit={ask}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={submitOnEnter}
          required
          maxLength={1000}
          rows={2}
          placeholder="Ví dụ: Tôi muốn học tiếng Anh giao tiếp..."
          aria-label="Nhu cầu học ngoại ngữ"
          autoFocus
        />
        <button type="submit" disabled={!question.trim() || loading} aria-label="Gửi câu hỏi">
          <PaperPlaneTilt weight="fill" aria-hidden="true" />
        </button>
      </form>
      <small className="advisor-note">AI chỉ tư vấn từ danh sách khóa học đang mở.</small>
    </dialog>
  </>
}

export default CourseAdvisor
