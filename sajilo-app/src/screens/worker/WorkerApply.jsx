import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import fieldRegistry from '../../config/fieldRegistry.js'
import { useStyle } from '../../hooks/useStyle.js'
import { useContent } from '../../hooks/useContent.js'
import VerificationUploadOverlay from '../../components/verification/VerificationUploadOverlay.jsx'
import useVerificationStatus from '../../hooks/useVerificationStatus.js'

export default function WorkerApply() {
  const navigate = useNavigate()
  const CARDS = Array.isArray(fieldRegistry.workerApplyCards) ? fieldRegistry.workerApplyCards : []
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [formData, setFormData] = useState({})
  const [showVerificationUpload, setShowVerificationUpload] = useState(false)
  const { isSubmitted: verificationSubmitted } = useVerificationStatus()

  const currentCard = CARDS[currentCardIndex] || { titleKey: '', fields: [] }
  const cardTitle = useContent(currentCard.titleKey) || 'Worker Application'
  const nextLabel = useContent('worker.apply.next') || 'Next'
  const prevLabel = useContent('worker.apply.previous') || 'Previous'
  const submitLabel = useContent('worker.applySubmit') || 'Submit'
  const progressLabel = useContent('worker.apply.progress') || 'Step'

  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleNext = () => {
    if (currentCardIndex < CARDS.length - 1) {
      setCurrentCardIndex((i) => i + 1)
    } else {
      handleSubmit()
    }
  }

  const handlePrev = () => {
    if (currentCardIndex > 0) setCurrentCardIndex((i) => i - 1)
  }

  const handleSubmit = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('sajilo_user') || '{}')
      localStorage.setItem('sajilo_user', JSON.stringify({ ...saved, workerApplication: formData }))
      navigate('/login')
    } catch (err) {
      console.error('Error saving application', err)
    }
  }

  return (
    <div className="auth-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '40px 24px', width: '100%' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-blue)' }}>Sajilo</span>
        </div>
        <h2 style={{ fontSize: 'var(--font-large)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, textAlign: 'center' }}>{cardTitle}</h2>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>{progressLabel} {currentCardIndex + 1} / {CARDS.length || 1}</div>

        <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: 'clamp(24px, 5vw, 40px)', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(currentCard.fields || []).map((field) => {
              const value = formData[field.name] || ''
              const label = useContent(field.labelKey) || field.labelKey || field.name
              const placeholder = useContent(field.placeholderKey) || ''
              const key = field.name || Math.random()

              if (field.type === 'checkbox') {
                return (
                  <div key={key}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!value}
                        onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                        required={field.required}
                        style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent-blue)' }} />
                      <span style={{ fontSize: 'var(--font-body)', color: 'var(--text-primary)' }}>{label}</span>
                      {field.required && <span style={{ color: 'var(--accent-red)' }}>★</span>}
                    </label>
                  </div>
                )
              }

              if (field.type === 'select') {
                return (
                  <div key={key}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                      {label}{field.required && <span style={{ color: 'var(--accent-red)', marginLeft: 2 }}>★</span>}
                    </label>
                    <select value={value} onChange={(e) => handleFieldChange(field.name, e.target.value)} required={field.required}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-surface2)', color: 'var(--text-primary)', fontSize: 'var(--font-body)', outline: 'none', cursor: 'pointer' }}>
                      <option value="">Select...</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt.value} value={opt.value}>{useContent(opt.labelKey) || opt.value}</option>
                      ))}
                    </select>
                  </div>
                )
              }

              return (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                    {label}{field.required && <span style={{ color: 'var(--accent-red)', marginLeft: 2 }}>★</span>}
                  </label>
                  <input type={field.type || 'text'} value={value}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={placeholder} required={field.required}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-surface2)', color: 'var(--text-primary)', fontSize: 'var(--font-body)', outline: 'none' }} />
                </div>
              )
            })}
          </div>

          {/* ── Verification Documents Section (Phase 17) ── */}
          <div style={{
            marginTop: 20, padding: 16,
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface2)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              📄 Identity Verification
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Upload your government ID and a selfie to get verified. This builds trust with clients.
            </div>
            <button
              onClick={() => setShowVerificationUpload(true)}
              style={{
                width: '100%', padding: 12, borderRadius: 'var(--radius-md)',
                border: 'none',
                background: verificationSubmitted ? '#DCFCE7' : 'var(--accent-blue)',
                color: verificationSubmitted ? '#059669' : '#fff',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {verificationSubmitted ? '✅ Documents Uploaded — Tap to Update' : '📄 Upload Documents'}
            </button>
            {verificationSubmitted && (
              <div style={{ fontSize: 11, color: '#059669', textAlign: 'center', marginTop: 6 }}>
                Your documents have been submitted for review
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            {currentCardIndex > 0 && (
              <button type="button" onClick={handlePrev}
                style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-surface2)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                ← {prevLabel}
              </button>
            )}
            <button type="button" onClick={handleNext}
              style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--accent-blue)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {currentCardIndex === CARDS.length - 1 ? submitLabel : nextLabel} {currentCardIndex < CARDS.length - 1 ? '→' : ''}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span onClick={() => navigate('/login')} style={{ color: 'var(--accent-blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ← Back to Login
          </span>
        </div>
      </div>

      {/* ── Verification Upload Overlay (Phase 17) ── */}
      {showVerificationUpload && (
        <VerificationUploadOverlay
          onClose={() => setShowVerificationUpload(false)}
          onSuccess={() => setShowVerificationUpload(false)}
        />
      )}
    </div>
  )
}