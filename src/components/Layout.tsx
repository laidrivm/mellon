import {ReactNode} from 'react'

export default function Layout({children}: {children: ReactNode}): ReactNode {
  return (
    <div className='min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-white text-black'>
      <main className='w-full max-w-md'>{children}</main>
    </div>
  )
}
