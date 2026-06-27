import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { authService } from '../../services/auth'

export function RegisterPage() {
  const navigate = useNavigate()
  const [mobile, setMobile] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    try {
      await authService.register({ mobile, nickname, password })
      navigate('/login')
    } catch {
      setMessage('注册失败，请检查手机号或密码')
    }
  }

  return (
    <main>
      <h1>用户注册</h1>
      <form onSubmit={handleSubmit}>
        <label>
          手机号
          <input value={mobile} onChange={(event) => setMobile(event.target.value)} />
        </label>
        <label>
          昵称
          <input value={nickname} onChange={(event) => setNickname(event.target.value)} />
        </label>
        <label>
          密码
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button type="submit">注册</button>
      </form>
      {message && <p>{message}</p>}
    </main>
  )
}
