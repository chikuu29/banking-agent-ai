import { useState } from 'react'

/**
 * Login - Standalone component managing RM session access.
 */
export default function Login({ onLoginSuccess, onToggleMode }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please fill in username and password.')
      return
    }
    setError('')
    setLoading(true)

    fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(d => { throw new Error(d.detail || 'Authentication failed') })
        }
        return res.json()
      })
      .then(user => {
        localStorage.setItem('user', JSON.stringify(user))
        onLoginSuccess(user)
      })
      .catch(err => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <div className="flex items-start justify-center min-h-dvh w-full overflow-y-auto bg-bg-primary bg-[radial-gradient(var(--color-text-muted)_1px,transparent_1px)] bg-[size:20px_20px] p-4">
      <div className="w-full max-w-[440px] bg-bg-card border-3 border-black rounded-lg p-8 shadow-brutal-lg relative my-auto">
        <div className="bg-accent-red text-black text-center font-black text-xs py-1.5 px-3 border-3 border-black mb-4 uppercase tracking-wider">
          ☢ SECURE AGENT LOGIN REQUIRED ☢
        </div>
        <div className="w-[60px] h-[60px] bg-accent-yellow border-3 border-black rounded-full text-3xl flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0px_#000000]">🏦</div>
        <h2 className="font-display text-2xl font-black uppercase text-center mb-1">CRM CORE LOGIN</h2>
        <p className="font-sans text-[13.6px] font-semibold text-text-muted text-center mb-6">
          Access the Relationship Manager command center
        </p>

        {error && (
          <div className="bg-accent-rose border-3 border-black rounded-sm text-black font-bold py-2 px-3 text-xs mb-4 flex items-center gap-2">
            <span>⚠️ ERROR_LOG:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[11.5px] font-bold uppercase text-text-primary">👤 AGENT_ID / USERNAME</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="e.g. suryanarayan, rm001"
              required 
              className="py-2 px-4 bg-bg-input border-3 border-black rounded-sm text-text-primary font-sans font-medium text-sm outline-none shadow-[inset_1px_1px_0px_rgba(0,0,0,0.15)] focus:border-black focus:bg-accent-cyan focus:text-black"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[11.5px] font-bold uppercase text-text-primary">🔑 KEYPASS / PASSWORD</label>
            <div className="relative flex w-full">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
                required 
                style={{ width: '100%', paddingRight: '40px' }}
                className="py-2 px-4 bg-bg-input border-3 border-black rounded-sm text-text-primary font-sans font-medium text-sm outline-none shadow-[inset_1px_1px_0px_rgba(0,0,0,0.15)] focus:border-black focus:bg-accent-cyan focus:text-black"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)'
                }}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-accent-lime text-black border-3 border-black rounded-md py-4 text-base font-bold uppercase tracking-wide cursor-pointer transition-[transform,box-shadow,background] duration-75 shadow-[3px_3px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000000] hover:bg-accent-lime-hover active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed"
          >
            {loading ? 'INITIALIZING ACCESS...' : 'DECRYPT & LOG IN'}
          </button>
        </form>

        <div className="text-center text-xs font-semibold text-text-muted mt-4">
          NEW RELATIONSHIP MANAGER?{' '}
          <button onClick={onToggleMode} className="bg-transparent border-none text-text-primary font-sans font-bold underline cursor-pointer">
            CREATE PROFILE
          </button>
        </div>

        <div className="mt-4 p-2 bg-bg-primary border-3 border-black rounded-sm text-[11.5px] font-semibold font-mono">
          <p className="uppercase mb-1 flex justify-between">
            <span>🔑 DEMO_CREDENTIALS</span>
            <span className="text-accent-pink">[TEST_ACTIVE]</span>
          </p>
          <div>USER: <code className="bg-white border border-black px-1 text-black">suryanarayan</code> | PASS: <code className="bg-white border border-black px-1 text-black">password</code></div>
          <div className="mt-0.5">USER: <code className="bg-white border border-black px-1 text-black">rm001</code> | PASS: <code className="bg-white border border-black px-1 text-black">password</code></div>
          <div className="mt-0.5">USER: <code className="bg-white border border-black px-1 text-black">cchiku1999@gmail.com</code> | PASS: <code className="bg-white border border-black px-1 text-black">Demo@123</code></div>
        </div>
      </div>
    </div>
  )
}
