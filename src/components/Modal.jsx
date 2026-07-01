import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, size = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`bg-card border border-border rounded-xl w-full ${size} max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
