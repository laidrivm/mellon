import React, {ReactNode} from 'react'

export default function Layout({children}: {children: ReactNode}): ReactNode {
  return (
    <div className='mt-8 flex flex-col items-center bg-white px-4 font-light text-black antialiased md:subpixel-antialiased'>
      <main className='w-full max-w-md'>{children}</main>
    </div>
  )
}
