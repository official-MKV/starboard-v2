'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { X } from 'lucide-react'

const startupStory = [
  {
    id: 1,
    name: 'Janesx Technologies',
    description: 'Janesx is a space-tech startup that was part of our 2025 cohort, revolutionizing satellite data analytics.',
    image: '/noise.jpg',
    story: `Janesx Technologies joined the NIGCOMSAT Accelerator in 2025 with a vision to democratize satellite data analytics for African businesses.

Through the program, they received mentorship from industry leaders, access to cutting-edge satellite technology, and connections with potential clients across multiple sectors.

The journey wasn't easy. The team faced challenges in scaling their infrastructure and finding the right product-market fit. However, with guidance from our mentors and access to NIGCOMSAT's resources, they pivoted their approach and developed a groundbreaking solution for agricultural monitoring using satellite imagery.

Within 12 months of joining the accelerator, Janesx secured partnerships with three major agricultural companies and raised $2M in seed funding. Today, they're helping farmers across Nigeria optimize crop yields using real-time satellite data, making precision agriculture accessible to smallholder farmers.

Their success story demonstrates the transformative power of combining innovative technology with the right support system. The NIGCOMSAT Accelerator provided not just resources, but a community of experts and fellow entrepreneurs who believed in their vision.`
  }
]

const StartupCard = ({ item, onClick }) => {
  return (
    <div className='flex flex-col w-full md:w-[340px] bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300'>
      <div className='h-[250px] w-full overflow-hidden'>
        <img src={item.image} alt={item.name} className='object-cover w-full h-full hover:scale-105 transition-transform duration-300' />
      </div>
      <div className='p-5 flex flex-col flex-grow'>
        <div className='space-y-2 mb-4 flex-grow'>
          <h3 className='text-2xl font-semibold text-gray-900'>{item.name}</h3>
          <p className='text-gray-600 text-sm line-clamp-3'>{item.description}</p>
        </div>
        <button
          onClick={onClick}
          className='hover:bg-primary hover:text-white cursor-pointer duration-200 flex text-center justify-center w-full bg-primary-50 text-primary py-3 rounded-lg font-medium transition-all'
        >
          Read their story
        </button>
      </div>
    </div>
  )
}

const StoryModal = ({ item, open, onClose }) => {
  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='min-w-6xl w-[95vw] md:w-[85vw] lg:w-[80vw] max-h-[90vh] p-0'>
        <button
          onClick={onClose}
          className='absolute right-4 top-4 z-50 rounded-full bg-white/90 p-2 hover:bg-white transition-colors shadow-lg'
        >
          <X className='h-5 w-5 text-gray-700' />
        </button>

        <div className='grid md:grid-cols-2 gap-0 overflow-hidden'>
          {/* Left side - Image */}
          <div className='h-[300px] md:h-full md:min-h-[500px] relative'>
            <img
              src={item.image}
              alt={item.name}
              className='w-full h-full object-fit'
            />
            <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent' />
          </div>

          {/* Right side - Story */}
          <div className='p-6 md:p-8 lg:p-10 flex flex-col overflow-y-auto'>
            <DialogHeader className='mb-6'>
              <DialogTitle className='text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3'>
                {item.name}
              </DialogTitle>
              <p className='text-base md:text-lg text-gray-600 font-medium'>{item.description}</p>
            </DialogHeader>

            <div className='prose prose-base md:prose-lg max-w-none'>
              {item.story.split('\n\n').map((paragraph, index) => (
                <p key={index} className='text-gray-700 leading-relaxed mb-4 text-sm md:text-base'>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const StartupSucessStory = () => {
  const [selectedStory, setSelectedStory] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleCardClick = (item) => {
    setSelectedStory(item)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setSelectedStory(null), 300)
  }

  return (
    <div className='flex flex-col gap-8 md:gap-12 w-full px-4 md:px-8 lg:px-[10vw] py-16 min-h-[60vh]'>
      <div className='space-y-3'>
        <h2 className='text-3xl md:text-4xl lg:text-5xl font-bold'>Startup Success Stories</h2>
        <p className='text-gray-600 text-base md:text-lg max-w-3xl'>
          Discover how startups in our accelerator have transformed their ideas into successful businesses
        </p>
      </div>

      <div className='flex flex-wrap gap-6 justify-start'>
        {startupStory.map((item) => (
          <StartupCard key={item.id} item={item} onClick={() => handleCardClick(item)} />
        ))}
      </div>

      <StoryModal item={selectedStory} open={isModalOpen} onClose={handleCloseModal} />
    </div>
  )
}

export default StartupSucessStory
