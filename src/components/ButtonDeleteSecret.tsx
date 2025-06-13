import React from 'react'

export default function ButtonDelete({
  onDelete
}: {
  onDelete: () => void
}): JSX.Element {
  const [state, setState] = React.useState('initial')
  const [countdown, setCountdown] = React.useState(5)
  const [progress, setProgress] = React.useState(100)
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleDelete = () => {
    setState('confirm')
  }

  const handleConfirm = () => {
    setState('countdown')
    setCountdown(5)
    setProgress(100)

    // Start countdown
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        const newCount = prev - 1
        setProgress((newCount / 5) * 100)

        if (newCount < 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          onDelete()
          setState('initial')
          return 5
        }
        return newCount
      })
    }, 1000)
  }

  const handleCancel = () => {
    setState('initial')
  }

  const handleUndo = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setState('initial')
    setCountdown(5)
    setProgress(100)
  }

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  if (state === 'initial') {
    return (
      <button
        onClick={handleDelete}
        className='text-red-600 transition-all duration-300 hover:underline'
      >
        Delete
      </button>
    )
  }

  if (state === 'confirm') {
    return (
      <div className='flex space-x-2'>
        <button
          onClick={handleConfirm}
          className='text-red-600 transition-all duration-300 hover:underline'
        >
          Confirm
        </button>
        <button
          onClick={handleCancel}
          className='transition-all duration-300 hover:underline'
        >
          Cancel
        </button>
      </div>
    )
  }

  if (state === 'countdown') {
    return (
      <div className='flex items-center space-x-3'>
        <button
          onClick={handleUndo}
          className='transition-all duration-300 hover:underline'
        >
          Undo
        </button>
        <div className='relative flex h-8 w-8 items-center justify-center'>
          <svg className='h-8 w-8 -rotate-90 transform' viewBox='0 0 32 32'>
            <circle
              cx='16'
              cy='16'
              r='14'
              fill='none'
              stroke='#000000'
              strokeWidth='2'
              strokeDasharray={`${2 * Math.PI * 14}`}
              strokeDashoffset={`${2 * Math.PI * 14 * (1 - progress / 100)}`}
              className='transition-all duration-1000 ease-linear'
            />
          </svg>
          <span className='absolute text-xs font-medium text-black'>
            {countdown}
          </span>
        </div>
      </div>
    )
  }

  return null
}
