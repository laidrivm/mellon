import React, {ReactNode} from 'react'

export default function Footer(): ReactNode {
  return (
    <footer className='mt-12 flex justify-center'>
      <p className='text-md leading-6 font-light'>
        A prototype by{' '}
        <a className='underline' href='https://laidrivm.com/'>
          Vladimir Lazarev
        </a>
        .{' '}
        <a className='underline' href='https://github.com/laidrivm/mellon'>
          Source code
        </a>
        . Don’t store anything meaningful!
      </p>
    </footer>
  )
}
