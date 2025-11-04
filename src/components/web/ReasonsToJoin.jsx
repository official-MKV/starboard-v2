import React from 'react'

const ReasonsToJoin = () => {
  return (
    <div className='w-full text-center items-center flex flex-col min-h-screen py-16 px-4 md:px-8 gap-8 md:gap-12'>
       <div className='w-full items-center flex flex-col gap-5 max-w-5xl'>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">Reasons to join this initiative</h2>
        <p className="w-full md:w-[85%] lg:w-[70%] text-[#6B6B6B] text-base md:text-lg leading-relaxed">
            Joining the NIGCOMSAT Accelerator is a game-changer for space-tech startups. It offers invaluable mentorship, essential resources, and vital industry connections that can help you scale your innovations in satellite technology, geospatial intelligence, IoT, AI, and more.
        </p>
       </div>
         <div className='flex w-full max-w-7xl flex-col gap-4 md:gap-5'>
            <div className='flex flex-col md:flex-row w-full gap-4 md:gap-5'>
                <div className='flex-1 w-full min-h-[280px] md:min-h-[320px] bg-[#F2F2FF] rounded-xl overflow-hidden'>
                <div className="p-5 md:p-8 text-left h-full flex flex-col justify-between">
                      <div className='mb-4'>
                    <h3 className='text-xl md:text-2xl font-semibold mb-3'>Mentorship That Matters</h3>
                    <p className='text-sm md:text-base text-gray-700'>Guidance from industry experts in space-tech, IoT, AI, and geospatial intelligence.</p>
                </div>
                <div className='items-end w-full flex justify-end'>
                    <img src="/mentorship.png" alt="Mentorship" className='w-32 md:w-40 h-auto'/>
                </div>

                </div>

                </div>
                 <div className='flex-1 w-full min-h-[280px] md:min-h-[320px] bg-[#FFFFF2] rounded-xl overflow-hidden'>
                <div className="p-5 md:p-8 text-right flex flex-col h-full justify-between">
                    <div className='mb-4'>
                        <h3 className='text-xl md:text-2xl font-semibold mb-3'>Industry Connection</h3>
                        <p className='text-sm md:text-base text-gray-700'>Guidance from industry experts in space-tech, IoT, AI, and geospatial intelligence.</p>
                    </div>
                    <div className='w-full flex justify-start'>
                        <img src="/industry_connection.png" alt="Industry Connection" className='w-32 md:w-40 h-auto'/>
                    </div>

                </div>
                </div>

            </div>
             <div className='flex flex-col md:flex-row w-full gap-4 md:gap-5'>
                <div className='flex-1 w-full min-h-[280px] md:min-h-[320px] bg-[#FFF8F2] rounded-xl overflow-hidden'>
                    <div className="p-5 md:p-8 text-left flex flex-col-reverse h-full justify-between">
                    <div className='mb-4'>
                        <h3 className='text-xl md:text-2xl font-semibold mb-3'>Business Development</h3>
                        <p className='text-sm md:text-base text-gray-700'>Guidance from industry experts in space-tech, IoT, AI, and geospatial intelligence.</p>
                    </div>
                    <div className='w-full flex justify-end mb-4'>
                        <img src="/business_development.png" alt="Business Development" className='w-32 md:w-40 h-auto'/>
                    </div>

                </div>

                </div>
                 <div className='flex-1 w-full min-h-[280px] md:min-h-[320px] bg-[#F4FFF2] rounded-xl overflow-hidden'>
                      <div className="p-5 md:p-8 text-right flex flex-col-reverse h-full justify-between">
                    <div className='mb-4'>
                        <h3 className='text-xl md:text-2xl font-semibold mb-3'>Technical Resources</h3>
                        <p className='text-sm md:text-base text-gray-700'>Guidance from industry experts in space-tech, IoT, AI, and geospatial intelligence.</p>
                    </div>
                    <div className='w-full flex justify-start mb-4'>
                        <img src="/technical_resources.png" alt="Technical Resources" className='w-32 md:w-40 h-auto'/>
                    </div>

                </div>

                </div>

            </div>
         </div>

    </div>
  )
}

export default ReasonsToJoin
