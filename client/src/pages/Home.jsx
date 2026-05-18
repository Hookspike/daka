import { useState, useEffect } from 'react'

export default function Home() {
  const [now, setNow] = useState(new Date())
  const [today, setToday] = useState({ morning: { checked: false }, evening: { checked: false } })
  const [stats, setStats] = useState({ streak: 0, fullDays: 0 })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const token = localStorage.getItem('token')

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchToday()
    fetchStats()
  }, [])

  const fetchToday = async () => {
    try {
      const res = await fetch('/api/checkin/today', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setToday(data.data)
    } catch {}
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/checkin/stats', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setStats(data.data)
    } catch {}
  }

  const handleCheckin = async (type) => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/checkin/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type })
      })
      const data = await res.json()
      setMessage(data.message)
      if (data.success) {
        fetchToday()
        fetchStats()
      }
    } catch {
      setMessage('网络错误')
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const hour = now.getHours()
  const min = now.getMinutes()
  const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false })
  const dateStr = now.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const inMorningWindow = (hour > 6 || (hour === 6 && min >= 0)) && (hour < 9 || (hour === 9 && min <= 30))
  const inEveningWindow = (hour > 18 || (hour === 18 && min >= 0)) && (hour < 21 || (hour === 21 && min <= 30))

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 顶部时间 */}
      <div className="text-center mb-8">
        <div className="text-5xl font-bold text-gray-800 tabular-nums tracking-tight">{timeStr}</div>
        <div className="text-gray-500 mt-1">{dateStr}</div>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
          <div className="text-3xl font-bold text-indigo-600">{stats.streak}</div>
          <div className="text-sm text-gray-500 mt-1">连续打卡天数</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
          <div className="text-3xl font-bold text-emerald-600">{stats.fullDays}</div>
          <div className="text-sm text-gray-500 mt-1">全天完成次数</div>
        </div>
      </div>

      {/* 打卡卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 早晨打卡 */}
        <div className={`rounded-2xl p-6 shadow-sm border-2 transition ${today.morning.checked ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${today.morning.checked ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                {today.morning.checked ? '✓' : '☀'}
              </div>
              <div>
                <div className="font-semibold text-gray-800">早晨打卡</div>
                <div className="text-xs text-gray-400">06:00 - 09:30</div>
              </div>
            </div>
            {today.morning.checked && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">已完成</span>
            )}
          </div>
          {today.morning.checked ? (
            <div className="text-sm text-gray-500">
              打卡时间：<span className="font-medium text-gray-700">{today.morning.time}</span>
              {today.morning.late && <span className="text-amber-600 ml-2">（迟到）</span>}
            </div>
          ) : (
            <button
              onClick={() => handleCheckin('morning')}
              disabled={!inMorningWindow || loading}
              className={`w-full py-3 rounded-xl font-medium transition ${
                inMorningWindow
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {inMorningWindow ? '立即打卡' : '不在打卡时段'}
            </button>
          )}
        </div>

        {/* 晚间打卡 */}
        <div className={`rounded-2xl p-6 shadow-sm border-2 transition ${today.evening.checked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${today.evening.checked ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                {today.evening.checked ? '✓' : '☾'}
              </div>
              <div>
                <div className="font-semibold text-gray-800">晚间打卡</div>
                <div className="text-xs text-gray-400">18:00 - 21:30</div>
              </div>
            </div>
            {today.evening.checked && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">已完成</span>
            )}
          </div>
          {today.evening.checked ? (
            <div className="text-sm text-gray-500">
              打卡时间：<span className="font-medium text-gray-700">{today.evening.time}</span>
              {today.evening.late && <span className="text-indigo-600 ml-2">（迟到）</span>}
            </div>
          ) : (
            <button
              onClick={() => handleCheckin('evening')}
              disabled={!inEveningWindow || loading}
              className={`w-full py-3 rounded-xl font-medium transition ${
                inEveningWindow
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {inEveningWindow ? '立即打卡' : '不在打卡时段'}
            </button>
          )}
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`mt-6 p-4 rounded-xl text-center text-sm font-medium animate-slide-up ${
          message.includes('成功') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {message}
        </div>
      )}
    </div>
  )
}
