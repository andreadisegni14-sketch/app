import 'server-only'
import bcrypt from 'bcryptjs'

const COST = 12

export const PASSWORD_MIN_LENGTH = 12

// Pre-computed hash of a random string, used to equalise timing when the account does not exist.
const DUMMY_HASH = '$2b$12$rL6uchoa6F/TF3lhPjM1suWw9PjEE7vKUzyF/j.QAsUoonPuPJrK.'

export async function hashPassword(password: string): Promise<string> {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  }
  return bcrypt.hash(password, COST)
}

export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash ?? DUMMY_HASH)
  } catch {
    return false
  }
}

export function passwordPolicyError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  if (password.length > 200) return 'Password is too long.'
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Include letters and at least one number.'
  return null
}
