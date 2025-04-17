import {ReactNode} from 'react'

export default function Layout({children}: {children: ReactNode}): ReactNode {
  return (
    <div className='min-h-screen flex flex-col items-center px-4 py-8 bg-white text-black antialiased md:subpixel-antialiased font-light'>
      <main className='w-full max-w-md'>{children}</main>
    </div>
  )
}
