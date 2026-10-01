import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    google?: { accounts: { id: { initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void; renderButton: (element: HTMLElement, options: Record<string, string>) => void } } }
  }
}

type Props = { onCredential: (credential: string) => void; className?: string }

function GoogleIdentityButton({ onCredential, className }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const callback = useRef(onCredential)
  callback.current = onCredential
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId) return
    const render = () => {
      if (!window.google || !container.current) return
      window.google.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => callback.current(credential) })
      container.current.replaceChildren()
      window.google.accounts.id.renderButton(container.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: String(Math.min(360, container.current.clientWidth || 360)), locale: 'vi' })
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]')
    if (existing) { if (window.google) render(); else existing.addEventListener('load', render, { once: true }); return }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.dataset.googleIdentity = 'true'
    script.addEventListener('load', render, { once: true })
    document.head.append(script)
  }, [clientId])

  if (!clientId) return null
  return <div className={className} ref={container} aria-label="Tiếp tục bằng Google" />
}

export default GoogleIdentityButton
