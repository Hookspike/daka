import { useState, useEffect } from 'react'

export default function Settings() {
  const [notifyType, setNotifyType] = useState('none')
  const [key, setKey] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const token = localStorage.getItem('token')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) {
        setNotifyType(data.user.wechat_notify_type || 'none')
        setKey(data.user.wechat_key || '')
      }
    } catch {}
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/checkin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ wechat_notify_type: notifyType, wechat_key: key || null })
      })
      const data = await res.json()
      setMessage(data.message)
    } catch {
      setMessage('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const typeOptions = [
    { value: 'none', label: '不启用', desc: '关闭微信打卡提醒' },
    { value: 'serverchan', label: 'Server酱 (SCT)', desc: '使用 Server酱 SendKey' },
    { value: 'wxpusher', label: 'WxPusher', desc: '格式：appToken:UID' },
    { value: 'webhook', label: '自定义 Webhook', desc: '任意 HTTP POST 地址' }
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h2 className="text-xl font-bold text-gray-800 mb-6">微信提醒设置</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">推送方式</label>
          <div className="space-y-2">
            {typeOptions.map(opt => (
              <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                notifyType === opt.value ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  value={opt.value}
                  checked={notifyType === opt.value}
                  onChange={e => setNotifyType(e.target.value)}
                  className="mt-1 accent-indigo-600"
                />
                <div>
                  <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                  <div className="text-xs text-gray-400">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {notifyType !== 'none' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密钥 / 地址</label>
            <input
              type="text"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder={
                notifyType === 'serverchan' ? 'SCTxxxxxxxxxxxxxxxxxxxxxxxxxxx' :
                notifyType === 'wxpusher' ? 'AT_xxx:UID_xxx' :
                'https://example.com/webhook'
              }
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
            />
            <p className="text-xs text-gray-400 mt-1">
              {notifyType === 'serverchan' && '前往 sct.ftqq.com 获取 SendKey'}
              {notifyType === 'wxpusher' && '前往 wxpusher.zjiecode.com 获取 appToken 和 UID'}
              {notifyType === 'webhook' && '服务器将以 JSON 格式 POST 到该地址'}
            </p>
          </div>
        )}

        {message && (
          <div className={`p-3 rounded-lg text-sm ${message.includes('成功') || message.includes('已更新') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  )
}
