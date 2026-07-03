export function validateEmail(email) {
  if (!email) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format'
  return ''
}

export function validatePassword(password) {
  if (!password) return 'Password is required'
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(password)) return 'Must contain an uppercase letter'
  if (!/[a-z]/.test(password)) return 'Must contain a lowercase letter'
  if (!/[0-9]/.test(password)) return 'Must contain a number'
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Must contain a special character'
  return ''
}

export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) return 'Please confirm your password'
  if (password !== confirmPassword) return 'Passwords do not match'
  return ''
}

export function validateName(name) {
  if (!name || !name.trim()) return 'Full name is required'
  return ''
}

export function validateRequired(value, fieldName) {
  if (!value || !value.toString().trim()) return `${fieldName} is required`
  return ''
}
