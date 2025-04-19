export type Secret = {
  name: string
  username: string
  password: string
  notes: string
}

export type ButtonStyle = 'primary' | 'secondary' | 'inline' | 'single'

export type MasterPassword = {
  password: string
  hint: string
}
