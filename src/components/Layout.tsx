import type {ReactNode} from 'react'

export default function Layout({children}: {children: ReactNode}): ReactNode {
  return <main className='mt-6 w-full max-w-md'>{children}</main>
}
