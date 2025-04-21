export interface Secret {
  name: string
  username: string
  password: string
  notes: string
}

export type ButtonStyle = 'primary' | 'secondary' | 'inline' | 'single'

export interface MasterPassword {
  password: string
  hint: string
}
