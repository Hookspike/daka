import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import History from './pages/History'
import Settings from './pages/Settings'

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
      // 验证token有效性
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (!data.success) {
            logout()
          }
        })
        .catch(() => logout())
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const isAuth = !!user

  return (
    <div className="min-h-screen">
      {isAuth && (
        <nav className="bg-white shadow-sm border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xl font-bold text-indigo-600">每日打卡</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <a href="/" className="text-gray-600 hover:text-indigo-600 transition">首页</a>
              <a href="/history" className="text-gray-600 hover:text-indigo-600 transition">历史</a>
              <a href="/settings" className="text-gray-600 hover:text-indigo-600 transition">设置</a>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500">{user?.nickname || user?.username}</span>
              <button onClick={logout} className="text-red-500 hover:text-red-600 transition">退出</button>
            </div>
          </div>
        </nav>
      )}
      <Routes>
        <Route path="/login" element={isAuth ? <Navigate to="/" /> : <Login setUser={setUser} />} />
        <Route path="/register" element={isAuth ? <Navigate to="/" /> : <Register setUser={setUser} />} />
        <Route path="/" element={isAuth ? <Home /> : <Navigate to="/login" />} />
        <Route path="/history" element={isAuth ? <History /> : <Navigate to="/login" />} />
        <Route path="/settings" element={isAuth ? <Settings /> : <Navigate to="/login" />} />
      </Routes>
    </div>
  )
}

export default App
