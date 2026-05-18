import { useState, useEffect } from 'react'

export default function History() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('token')

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/checkin/history?days=30', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setRecords(data.data)
    } catch {}
    setLoading(false)
  }

  const getStatus = (m, e) => {
    if (m === 1 && e === 1) return { text: '全天完成', cls: 'bg-emerald-100 text-emerald-700' }
    if (m === 1 || e === 1) return { text: '部分完成', cls: 'bg-amber-100 text-amber-700' }
    return { text: '未打卡', cls: 'bg-gray-100 text-gray-500' }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h2 className="text-xl font-bold text-gray-800 mb-6">打卡历史（最近30天）</h2>
      {loading ? (
        <div className="text-center text-gray-400 py-12">加载中...</div>
      ) : records.length === 0 ? (
        <div className="text-center text-gray-400 py-12">暂无打卡记录</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {records.map(r => {
              const status = getStatus(r.morning_status, r.evening_status)
              return (
                <div key={r.checkin_date} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                  <div>
                    <div className="font-medium text-gray-800">{r.checkin_date}</div>
                    <div className="text-sm text-gray-400 mt-1 flex gap-3">
                      <span>早晨：{r.morning_time || '—'}{r.morning_late === 1 ? ' (迟到)' : ''}</span>
                      <span>晚间：{r.evening_time || '—'}{r.evening_late === 1 ? ' (迟到)' : ''}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.cls}`}>{status.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
