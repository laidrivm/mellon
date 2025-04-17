import React, {ReactNode} from 'react'

export default function Button({
  children
}: {
  children: ReactNode
}): ReactNode {
  return (
    <button
      className='w-full bg-black text-white rounded py-2 hover:bg-gray-800 transition'
    >
      {children}
    </button>
  )
}
