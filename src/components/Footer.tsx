import React, {ReactNode} from 'react'

export default function Footer(): ReactNode {
  return (
    <footer className='container mx-auto mt-16 flex w-full max-w-md items-center justify-center border-t-1 border-black bg-white font-light text-black antialiased md:subpixel-antialiased'>
      <p className='text-md leading-6'>
        Prototyped by{' '}
        <a className='underline' href='https://laidrivm.com/'>
          Vladimir Lazarev
        </a>
        ,{' '}
        <a className='underline' href='https://sofiaazzheurova.site/'>
          Sofia Azzheurova
        </a>{' '}
        and Evgenii Antonenkov for the IAMPEI application № 1561.
        <br />
        Check out the{' '}
        <a className='underline' href='https://github.com/laidrivm/mellon'>
          source code
        </a>
        . Don’t store anything meaningful!
      </p>
    </footer>
  )
}
