'use client'

import HeroSection from "@/components/web/HeroSection"
import Stats from "@/components/web/Stats"
import ReasonsToJoin from "@/components/web/ReasonsToJoin"
import StartupSucessStory from "@/components/web/StartupSucessStory"
import Banner from "@/components/web/Banner"
 

const HomePage = () => {
  
  return (
    <div className="min-h-screen bg-white overflow-hidden">
    
    <HeroSection/>
    <Stats/>
    <ReasonsToJoin/>
    <StartupSucessStory/>
    <Banner/>

    </div>
  )
}

export default HomePage
