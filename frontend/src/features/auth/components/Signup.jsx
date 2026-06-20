import { useState } from 'react'

/**
 * Signup - Standalone component managing Relationship Manager registrations.
 */
export default function Signup({ onLoginSuccess, onToggleMode }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [rmId, setRmId] = useState('RM001')
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

    fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, full_name: fullName, email, assigned_rm_id: rmId })
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
        <h2 className="font-display text-2xl font-black uppercase text-center mb-1">CREATE AGENT ACCOUNT</h2>
        <p className="font-sans text-[13.6px] font-semibold text-text-muted text-center mb-6">
          Create a new RM control account
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

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[11.5px] font-bold uppercase text-text-primary">📛 FULL NAME</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              placeholder="e.g. Rahul Sharma"
              required 
              className="py-2 px-4 bg-bg-input border-3 border-black rounded-sm text-text-primary font-sans font-medium text-sm outline-none shadow-[inset_1px_1px_0px_rgba(0,0,0,0.15)] focus:border-black focus:bg-accent-cyan focus:text-black"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[11.5px] font-bold uppercase text-text-primary">📧 EMAIL ADDRESS</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="e.g. rahul@example.com"
              className="py-2 px-4 bg-bg-input border-3 border-black rounded-sm text-text-primary font-sans font-medium text-sm outline-none shadow-[inset_1px_1px_0px_rgba(0,0,0,0.15)] focus:border-black focus:bg-accent-cyan focus:text-black"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[11.5px] font-bold uppercase text-text-primary">🎖 ASSIGNED RM TIER</label>
            <select 
              value={rmId} 
              onChange={e => setRmId(e.target.value)}
              className="py-2 px-4 bg-bg-input border-3 border-black rounded-sm text-text-primary font-sans font-medium text-sm outline-none shadow-[inset_1px_1px_0px_rgba(0,0,0,0.15)] focus:border-black focus:bg-accent-cyan focus:text-black"
            >
              <option value="RM001">RM001 (Main segment)</option>
              <option value="RM002">RM002 (Regional)</option>
              <option value="RM003">RM003 (Premium)</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-accent-lime text-black border-3 border-black rounded-md py-4 text-base font-bold uppercase tracking-wide cursor-pointer transition-[transform,box-shadow,background] duration-75 shadow-[3px_3px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000000] hover:bg-accent-lime-hover active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed"
          >
            {loading ? 'INITIALIZING ACCESS...' : 'REGISTER NEW AGENT'}
          </button>
        </form>

        <div className="text-center text-xs font-semibold text-text-muted mt-4">
          ALREADY REGISTERED?{' '}
          <button onClick={onToggleMode} className="bg-transparent border-none text-text-primary font-sans font-bold underline cursor-pointer">
            LOG IN DIRECTLY
          </button>
        </div>
      </div>
    </div>
  )
}
