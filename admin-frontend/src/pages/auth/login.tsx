import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { adminAuthService } from '../../services/auth'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    try {
      await adminAuthService.login({ username, password })
      navigate('/dashboard')
    } catch {
      setMessage('登录失败，请检查管理员账号和密码')
    }
  }

  return (
    <main>
      <h1>管理端登录</h1>
      <form onSubmit={handleSubmit}>
        <label>
          管理员账号
          <input value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          密码
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button type="submit">登录</button>
      </form>
      {message && <p>{message}</p>}
    </main>
  )
}
