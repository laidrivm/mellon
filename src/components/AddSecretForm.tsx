import React, {ReactNode} from 'react'

export default function AddSecretForm({
  onAdd
}: {
  onAdd: (secret: any) => void
}): ReactNode {
  const [name, setName] = React.useState('')
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [notes, setNotes] = React.useState('')

  const handleAdd = () => {
    if (!name || !username || !password) return
    onAdd({name, username, password, notes})
    setName('')
    setUsername('')
    setPassword('')
    setNotes('')
  }

  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-semibold text-center'>
        Add Your First Secret
      </h1>
      <p className='text-sm text-gray-600'>
        It will be encrypted and stored on your device. You will be able to
        restore it from an encrypted backup from our server in case you clean up
        browser local storage.
      </p>

      <input
        className='w-full border rounded px-3 py-2'
        placeholder='Secret Name'
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className='w-full border rounded px-3 py-2'
        placeholder='Username'
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <div className='relative'>
        <input
          className='w-full border rounded px-3 py-2 pr-24'
          type={showPassword ? 'text' : 'password'}
          placeholder='Password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className='absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-2 text-sm'>
          <button
            onClick={() => setShowPassword((s) => !s)}
            className='hover:underline'
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={() => setPassword(crypto.randomUUID())}
            className='hover:underline'
          >
            Generate
          </button>
        </div>
      </div>
      <textarea
        className='w-full border rounded px-3 py-2'
        placeholder='Notes'
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button
        onClick={handleAdd}
        className='w-full bg-black text-white rounded py-2 hover:bg-gray-800 transition'
      >
        Add New Secret
      </button>
    </div>
  )
}
