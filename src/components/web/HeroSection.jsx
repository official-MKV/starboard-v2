import React from 'react'
import Link from 'next/link'
// import BaseStyleEarth from './EarthOribit'
import InfiniteCarousel from './InfiniteCarousel'

const HeroSection = () => {
  return (
    <div className='w-full min-h-screen flex items-center flex-col py-16 px-4'>
        <div className='text-center max-w-[90%] lg:max-w-[80%] mb-8 md:mb-12 mt-16 md:mt-24'>
            <p className="text-[#6B6B6B] text-xs md:text-sm opacity-60 shimmer mb-4">Nigcomsat Startup Accelerator Cohort 3, live 🚀</p>
            <h1 className='text-4xl md:text-5xl lg:text-7xl font-bold leading-tight mb-6'>Empowering Innovation in Nigeria</h1>
            <p className='text-[#6B6B6B] text-base md:text-lg lg:text-xl mt-4 md:mt-6 px-4 md:px-12 lg:px-24 leading-relaxed'>NIGCOMSAT Accelerator empowers space-tech startups with mentorship, resources, and industry connections to scale innovations in satellite tech, geospatial intelligence, IoT, AI, and beyond.</p>

        </div>

          {/* Deadline Extension Notice */}
          <div className='bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg px-6 py-4 mb-6 max-w-2xl mx-auto'>
            <div className='flex items-center justify-center gap-2 text-blue-800'>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className='text-sm md:text-base font-semibold text-center'>
                Application Deadline Extended to <span className='text-blue-600 font-bold'>January 24th, 2026</span>
              </p>
            </div>
          </div>

          <Link href="https://www.mystarboard.ng/apply/cmgkpivcv0001ld045ohs0bso" target="_blank" rel="noopener noreferrer" className='bg-primary text-white hover:bg-primary/90 transition-all duration-300 px-8 md:px-12 py-4 md:py-6 rounded-lg text-base md:text-lg font-semibold flex items-center justify-center shadow-lg hover:shadow-xl'>
              Apply Now
          </Link>
          <div className='w-full mt-8 md:mt-12'>
            <InfiniteCarousel/>
          </div>

    </div>
  )
}

export default HeroSection
