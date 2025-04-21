import React, {ReactNode} from 'react'

import type {ButtonStyle} from '../types.ts'

export default function Button({
  children,
  style = 'primary',
  onClick = () => {
    // do nothing
  }
}: {
  children: ReactNode
  style: ButtonStyle
  onClick: () => void
}): ReactNode {
  let className = ''

  switch (style) {
    case 'primary':
      className =
        'bg-black text-white rounded-lg py-2 px-3 hover:bg-gray-800 transition'
      break
    case 'secondary':
      className = 'hover:underline'
      break
    case 'inline':
      className =
        'bg-black text-white text-sm px-3 py-1 rounded-lg hover:bg-gray-800 transition'
      break
    default:
      break
  }

  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  )
}
