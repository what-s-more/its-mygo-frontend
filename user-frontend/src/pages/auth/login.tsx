import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { authService } from '../../services/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    try {
      await authService.login({ account, password })
      navigate('/user')
    } catch {
      setMessage('登录失败，请检查账号和密码')
    }
  }

  return (
    <main>
      <h1>用户登录</h1>
      <form onSubmit={handleSubmit}>
        <label>
          手机号
          <input value={account} onChange={(event) => setAccount(event.target.value)} />
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
