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
