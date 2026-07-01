export default function FormField({ label, name, type = 'text', value, onChange, required, step, placeholder, children }) {
  const id = `field-${name}`
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm text-muted">{label}{required && <span className="text-danger ml-1">*</span>}</label>
      {children ? children : (
        type === 'textarea' ? (
          <textarea id={id} name={name} value={value} onChange={onChange} required={required}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary focus:border-primary" rows={3} />
        ) : (
          <input id={id} name={name} type={type} value={value} onChange={onChange} required={required} step={step} placeholder={placeholder}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary focus:border-primary" />
        )
      )}
    </div>
  )
}
