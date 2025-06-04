'use client'

import Link from 'next/link'
import { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Home, ArrowLeft, Search, Satellite, Sparkles } from 'lucide-react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, Text3D, OrbitControls } from '@react-three/drei'
import { motion } from 'framer-motion'

// Floating Astronaut component
function Astronaut(props) {
  const astronautRef = useRef()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    astronautRef.current.position.y = Math.sin(t * 0.5) * 0.5
    astronautRef.current.rotation.z = Math.sin(t * 0.3) * 0.1
  })

  return (
    <group ref={astronautRef} {...props}>
      {/* Helmet */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.6, 8]} />
        <meshStandardMaterial color="#3e3eff" />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.3, 0.1, 0]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
        <meshStandardMaterial color="#3e3eff" />
      </mesh>
      <mesh position={[0.3, 0.1, 0]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
        <meshStandardMaterial color="#3e3eff" />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.1, -0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
        <meshStandardMaterial color="#3e3eff" />
      </mesh>
      <mesh position={[0.1, -0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
        <meshStandardMaterial color="#3e3eff" />
      </mesh>
    </group>
  )
}

// Floating Satellite component
function FloatingSatellite(props) {
  const satelliteRef = useRef()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.3
    satelliteRef.current.position.x = Math.sin(t) * 2
    satelliteRef.current.position.y = Math.cos(t * 0.7) * 1
    satelliteRef.current.rotation.y += 0.005
  })

  return (
    <group ref={satelliteRef} {...props}>
      <mesh>
        <boxGeometry args={[0.3, 0.15, 0.15]} />
        <meshStandardMaterial color="#3e3eff" />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.5, 0.03, 0.5]} />
        <meshStandardMaterial color="#9999ff" />
      </mesh>
    </group>
  )
}

// 3D "404" Text
function Text404() {
  return (
    <Text3D
      font="/fonts/Inter_Bold.json"
      size={1.5}
      height={0.2}
      curveSegments={12}
      bevelEnabled
      bevelThickness={0.02}
      bevelSize={0.02}
      bevelOffset={0}
      bevelSegments={5}
      position={[-2.2, 0, 0]}
    >
      404
      <meshStandardMaterial color="#3e3eff" />
    </Text3D>
  )
}

export default function NotFound() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Add floating animation styles
    const style = document.createElement('style')
    style.innerHTML = `
      .floating {
        animation: float 6s ease-in-out infinite;
      }

      .floating-delayed {
        animation: float 6s ease-in-out infinite;
        animation-delay: -2s;
      }

      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-20px); }
        100% { transform: translateY(0px); }
      }

      .star-twinkle {
        animation: twinkle 2s ease-in-out infinite alternate;
      }

      @keyframes twinkle {
        0% { opacity: 0.3; }
        100% { opacity: 1; }
      }

      .orbit-ring {
        border: 2px dashed rgba(62, 62, 255, 0.2);
        border-radius: 50%;
        position: absolute;
        animation: rotate 30s linear infinite;
      }

      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .gradient-bg {
        background: linear-gradient(135deg, #f0f0ff 0%, #e6e6ff 25%, #fafafa 50%, #e6e6ff 75%, #f0f0ff 100%);
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen gradient-bg text-neutral-900 overflow-hidden relative">
      {/* Background elements */}
      <div className="absolute inset-0">
        {/* Floating background shapes */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-[#3e3eff]/10 to-[#0000e6]/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-br from-[#9999ff]/10 to-[#ccccff]/10 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-gradient-to-br from-[#b3b3ff]/10 to-[#e6e6ff]/10 rounded-full blur-lg"></div>

        {/* Subtle stars */}
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[#3e3eff] rounded-full star-twinkle opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative w-12 h-12 bg-gradient-to-br from-[#3e3eff] to-[#0000e6] rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[#3e3eff] to-[#0000e6] rounded-2xl opacity-75 blur-sm group-hover:blur-md transition-all duration-300"></div>
                <span className="relative text-white font-bold text-xl">S</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold bg-gradient-to-r from-[#3e3eff] to-[#0000e6] bg-clip-text text-transparent">
                  Starboard
                </span>
                <span className="text-xs text-neutral-500 -mt-1 font-medium">by Nigcomsat</span>
              </div>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        {/* 3D Scene */}
        <div className="absolute inset-0 z-0 opacity-40">
          <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 10, 10]} intensity={0.8} />
            <pointLight position={[-10, -10, -10]} intensity={0.3} color="#3e3eff" />

            <Text404 />
            <Astronaut position={[3, 1, 0]} />
            <FloatingSatellite position={[-3, -1, 0]} />

            <Stars
              radius={100}
              depth={50}
              count={1000}
              factor={2}
              saturation={0}
              fade
              speed={0.5}
            />
            <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
          </Canvas>
        </div>

        {/* Content Overlay */}
        <div className="relative z-20 text-center px-4 max-w-2xl mx-auto">
          {/* Orbit rings decoration */}
          <div className="orbit-ring w-96 h-96 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"></div>
          <div
            className="orbit-ring w-80 h-80 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ animationDuration: '25s', animationDirection: 'reverse' }}
          ></div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            {/* Error Message */}
            <div className="mb-8">
              <motion.div
                className="floating text-8xl md:text-9xl font-bold bg-gradient-to-r from-[#3e3eff] to-[#0000e6] bg-clip-text text-transparent mb-4 opacity-40"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
              >
                404
              </motion.div>

              <p className="text-xl text-neutral-600 mb-4 leading-relaxed">Page Not found</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              <Link href="/">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#3e3eff] to-[#0000e6] hover:from-[#0000e6] hover:to-[#0000cc] text-white shadow-xl hover:shadow-2xl group transform hover:scale-105 transition-all duration-300 px-8 py-4 text-lg"
                >
                  <Home className="mr-3 h-6 w-6" />
                  <span className="relative z-10">Return to Base</span>
                  <Sparkles className="ml-3 h-5 w-5" />
                </Button>
              </Link>

              <Button
                size="lg"
                variant="outline"
                className="border-2 border-[#ccccff] text-[#0000cc] hover:bg-gradient-to-r hover:from-[#f0f0ff] hover:to-[#e6e6ff] hover:border-[#b3b3ff] transition-all duration-300 px-8 py-4 text-lg transform hover:scale-105"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="mr-3 h-6 w-6" />
                Go Back
              </Button>
            </div>

            {/* Help Card */}
            {/* <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm border-2 border-[#ccccff]/50 shadow-2xl">
                <CardContent className="p-8">
                  <div className="flex items-center justify-center mb-6">
                    <div className="floating-delayed bg-gradient-to-br from-[#f0f0ff] to-[#e6e6ff] p-4 rounded-2xl border border-[#ccccff]">
                      <Satellite className="h-8 w-8 text-[#3e3eff]" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-900 mb-3">
                    <span className="bg-gradient-to-r from-[#3e3eff] to-[#0000e6] bg-clip-text text-transparent">
                      Need Navigation Assistance?
                    </span>
                  </h3>
                  <p className="text-neutral-600 mb-6 leading-relaxed">
                    If you believe this is an error, please contact our ground control team for
                    assistance.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/contact">
                      <Button
                        variant="ghost"
                        className="text-[#0000cc] hover:bg-[#f0f0ff] hover:text-[#3e3eff] transition-all duration-300"
                      >
                        Contact Support
                      </Button>
                    </Link>
                    <Link href="/search">
                      <Button
                        variant="ghost"
                        className="text-[#0000cc] hover:bg-[#f0f0ff] hover:text-[#3e3eff] transition-all duration-300"
                      >
                        <Search className="mr-2 h-4 w-4" />
                        Search Site
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div> */}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
