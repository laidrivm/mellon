import React, {ReactNode} from 'react'

export default function Footer(): ReactNode {
  return (
    <footer className='container mx-auto mt-20 flex max-w-md items-center justify-center space-y-1 px-4 text-center font-light text-black antialiased md:subpixel-antialiased'>
      <p className='text-md leading-6'>
        Built by{' '}
        <a href='#' className='underline hover:text-gray-500'>
          Vladimir Lazarev
        </a>
        ,{' '}
        <a href='#' className='underline hover:text-gray-500'>
          Sofia Azzheurova
        </a>{' '}
        and Evgenii Antonenkov for IAMPEI Application №1561.{' '}
        <a href='#' className='underline hover:text-gray-500'>
          Source Code
        </a>
        .
        <br />
        Don’t store anything meaningful!
      </p>
    </footer>
  )
}
