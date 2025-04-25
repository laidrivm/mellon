import React, {ReactNode} from 'react'

export default function Footer(): ReactNode {
  return (
    <footer className='mt-12 flex justify-center'>
      <p className='text-md leading-6 font-light'>
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
        <a className='underline' href='https://github.com/laidrivm/mellon'>
          Source code
        </a>
        . Don’t store anything meaningful!
      </p>
    </footer>
  )
}
