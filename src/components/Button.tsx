import React, {ReactNode} from 'react'

export default function Button({
  children,
  inline = false,
  onClick = () => {}
}: {
  children: ReactNode
  inline: boolean
  onClick: Function
}): ReactNode {
  let styles =
    'w-full bg-black text-white rounded-lg py-2 hover:bg-gray-800 transition'
  if (inline) {
    styles = 'bg-black text-white text-sm px-3 py-1 rounded-lg'
  }
  return (
    <button className={styles} onClick={onClick}>
      {children}
    </button>
  )
}
