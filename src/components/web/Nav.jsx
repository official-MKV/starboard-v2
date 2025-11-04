'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation= [
      {
        title:"Home",
        link:"/"
    },
    {
        title:"Library",
        link:"/library"
    },
    {
        title:"About Us",
        link:"/about-us"
    },
    {
        title:"Events",
        link:"/public-events"
    },
   
]

function Nav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (link) => {
    if (link === '/') return pathname === '/'
    return pathname.startsWith(link)
  }

  return (
    <div className='w-full flex items-center justify-center mt-[30px]'>
      <nav className='w-[90vw] md:w-[80vw] justify-between flex items-center relative'>

        {/* Logo */}
        <Link href="/">
         <div className='flex items-center gap-2 z-50'>
            <img src="/logo-1.svg" className='w-[40px] h-[40px] md:w-[50px] md:h-[50px]'/>
            <h1 className='text-xl md:text-2xl text-primary font-bold'>Starboard</h1>
        </div>
        </Link>


        {/* Desktop Navigation */}
        <div className='hidden md:flex gap-3'>
            {navigation.map((item, index) => (
                <Link
                    key={index}
                    href={item.link}
                    className={`hover:text-primary transition-colors font-medium ${
                        isActive(item.link)
                            ? 'text-primary border-b-2 border-primary pb-1'
                            : 'text-gray-700'
                    }`}
                >
                    {item.title}
                </Link>
            ))}
        </div>

        {/* Desktop Login Button */}
        <div className='hidden md:block bg-primary text-white px-5 py-3 hover:bg-primary/90 transition-colors'>
            <Link href="/auth/login">
                Login to Starboard
            </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
            className='md:hidden z-50 flex flex-col gap-1.5 p-2'
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
        >
            <span className={`w-6 h-0.5 bg-current transition-all ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`w-6 h-0.5 bg-current transition-all ${isMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`w-6 h-0.5 bg-current transition-all ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
        </button>

        {/* Mobile Menu */}
        <div className={`
            md:hidden fixed top-0 right-0 h-screen w-[70vw] bg-white shadow-2xl
            transform transition-transform duration-300 ease-in-out z-40
            ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
            <div className='flex flex-col gap-6 p-8 mt-20'>
                {navigation.map((item, index) => (
                    <Link
                        key={index}
                        href={item.link}
                        className={`text-lg hover:text-primary transition-colors font-medium ${
                            isActive(item.link)
                                ? 'text-primary border-l-4 border-primary pl-3 -ml-3'
                                : 'text-gray-700'
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        {item.title}
                    </Link>
                ))}
                <Link
                    href="/auth/login"
                    className='bg-primary text-white px-5 py-3 text-center hover:bg-primary/90 transition-colors mt-4'
                    onClick={() => setIsMenuOpen(false)}
                >
                    Login to Starboard
                </Link>
            </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
            <div
                className='md:hidden fixed inset-0 bg-black/50 z-30'
                onClick={() => setIsMenuOpen(false)}
            />
        )}
      </nav>
    </div>
  )
}

export default Nav
