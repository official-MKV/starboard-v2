import React from 'react'

const Stats = () => {
  return (
    <div className="w-full py-16 md:py-20 px-4 md:px-8">
      <div className='flex flex-col md:flex-row gap-8 md:gap-12 lg:gap-24 md:divide-x-2 divide-[#6B6B6B] w-full items-center justify-center max-w-6xl mx-auto'>

        <div className='flex flex-col md:pr-8 lg:pr-12 text-center md:text-left'>
            <p className='text-4xl md:text-5xl font-bold text-gray-900 mb-2'>50+</p>
            <p className="text-xl md:text-2xl font-semibold text-gray-800 mb-1">Startups participated</p>
            <p className='text-sm md:text-base text-gray-600'>From idea stage to Scale</p>
        </div>

        <div className='flex flex-col md:px-8 lg:px-12 text-center md:text-left'>
            <p className='text-4xl md:text-5xl font-bold text-gray-900 mb-2'>90%</p>
            <p className="text-xl md:text-2xl font-semibold text-gray-800 mb-1">Survival rate</p>
            <p className='text-sm md:text-base text-gray-600'>post program</p>
        </div>

        <div className='flex flex-col md:pl-8 lg:pl-12 text-center md:text-left'>
            <p className='text-4xl md:text-5xl font-bold text-gray-900 mb-2'>₦30M+</p>
            <p className="text-xl md:text-2xl font-semibold text-gray-800 mb-1">Funding Raised</p>
            <p className='text-sm md:text-base text-gray-600'>by alumni startups</p>
        </div>

      </div>
    </div>
  )
}

export default Stats