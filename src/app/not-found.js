'use client'

import Link from 'next/link'
import { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Home, ArrowLeft, Search, Satellite } from 'lucide-react'
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
        <meshStandardMaterial color="#ffffff" transparent opacity={0.8} />
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
        <meshStandardMaterial color="#aaaaff" />
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
// function Text404() {
//   return (
//     <mesh position={[-1.5, 0, 0]}>
//       <textGeometry args={['404', { size: 1, height: 0.2 }]} />
//       <meshStandardMaterial color="#3e3eff" />
//     </mesh>
//   )
// }

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
        border: 2px dashed rgba(62, 62, 255, 0.3);
        border-radius: 50%;
        position: absolute;
        animation: rotate 30s linear infinite;
      }

      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-gray-900 to-charcoal-900 text-snow-50 overflow-hidden relative">
      {/* Background stars */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary rounded-full star-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav className="border-b border-primary/20 bg-charcoal-900/80 backdrop-blur-md relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary-600 to-primary-400"></div>
                <span className="text-white font-bold text-lg relative z-10">S</span>
              </div>
              <span className="ml-2 text-xl font-semibold text-snow-50">Starboard</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        {/* 3D Scene */}
        <div className="absolute inset-0 z-0">
          <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3e3eff" />

            <Text404 />
            <Astronaut position={[3, 1, 0]} />
            <FloatingSatellite position={[-3, -1, 0]} />

            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
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
                className="floating text-8xl md:text-9xl font-bold text-primary mb-4 opacity-20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
              >
                404
              </motion.div>

              <h1 className="text-3xl md:text-4xl font-bold text-snow-50 mb-4">Lost in Space</h1>

              <p className="text-lg text-slate-gray-300 mb-2">
                Houston, we have a problem! The page you're looking for has drifted into the void.
              </p>

              <p className="text-slate-gray-400">
                Don't worry, our mission control team will help you navigate back to safety.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/">
                <Button
                  size="lg"
                  className="starboard-button bg-primary hover:bg-primary/90 relative overflow-hidden group"
                >
                  <Home className="mr-2 h-5 w-5" />
                  <span className="relative z-10">Return to Base</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </Button>
              </Link>

              <Button
                size="lg"
                variant="outline"
                className="starboard-button border-primary/30 text-snow-50 hover:bg-primary/20"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Go Back
              </Button>
            </div>

            {/* Help Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Card className="bg-charcoal-800/50 border-primary/20 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="floating-delayed">
                      <Satellite className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-snow-50 mb-2">
                    Need Navigation Assistance?
                  </h3>
                  <p className="text-slate-gray-300 text-sm mb-4">
                    If you believe this is an error, please contact our ground control team.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Link href="/contact">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:bg-primary/20"
                      >
                        Contact Support
                      </Button>
                    </Link>
                    <Link href="/search">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:bg-primary/20"
                      >
                        <Search className="mr-2 h-4 w-4" />
                        Search Site
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
