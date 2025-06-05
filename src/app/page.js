'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowRight,
  Users,
  Building2,
  Calendar,
  MessageCircle,
  Sparkles,
  Rocket,
  Clock,
  MapPin,
} from 'lucide-react'

// Dummy data for programs
const programs = []

// Dummy data for resources
const resources = [
  {
    id: 1,
    title: 'Startup Funding Guide',
    type: 'PDF',
    category: 'Funding',
    description: 'Complete guide to raising capital for your startup',
  },
  {
    id: 2,
    title: 'Product Market Fit Workshop',
    type: 'Video',
    category: 'Product',
    description: 'Learn how to achieve product-market fit',
  },
  {
    id: 3,
    title: 'Legal Basics for Startups',
    type: 'Document',
    category: 'Legal',
    description: 'Essential legal knowledge for entrepreneurs',
  },
  {
    id: 4,
    title: 'Marketing Strategy Template',
    type: 'Template',
    category: 'Marketing',
    description: 'Ready-to-use marketing strategy framework',
  },
]

const HomePage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCity, setSelectedCity] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedOrganization, setSelectedOrganization] = useState('all')
  const [isVisible, setIsVisible] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const router = useRouter()

  useEffect(() => {
    setIsVisible(true)

    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const filteredPrograms = programs.filter(program => {
    const matchesSearch =
      program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      program.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      program.organization.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCity = selectedCity === 'all' || program.city === selectedCity
    const matchesType = selectedType === 'all' || program.type === selectedType
    const matchesOrganization =
      selectedOrganization === 'all' || program.organization === selectedOrganization

    return matchesSearch && matchesCity && matchesType && matchesOrganization
  })

  // Helper function to format deadline
  const formatDeadline = dateString => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Deadline passed'
    if (diffDays === 0) return 'Deadline today'
    if (diffDays === 1) return '1 day left'
    if (diffDays <= 7) return `${diffDays} days left`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Helper function to get type badge color
  const getTypeBadgeStyle = type => {
    const styles = {
      Accelerator: 'bg-blue-50 text-blue-700 border-blue-200',
      Hackathon: 'bg-green-50 text-green-700 border-green-200',
      Workshop: 'bg-purple-50 text-purple-700 border-purple-200',
      Incubator: 'bg-orange-50 text-orange-700 border-orange-200',
      Bootcamp: 'bg-pink-50 text-pink-700 border-pink-200',
      Conference: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    }
    return styles[type] || 'bg-gray-50 text-gray-700 border-gray-200'
  }

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3 group">
              <img
                src="/logo-1.svg"
                alt="Logo"
                className="w-12 h-12 transform group-hover:scale-105 transition-all duration-300"
              />
              <div className="flex flex-col">
                <span className="text-2xl font-bold bg-gradient-to-r from-[#3e3eff] to-[#0000e6] bg-clip-text text-transparent">
                  Starboard
                </span>
                <span className="text-xs text-neutral-500 -mt-1 font-medium">by Nigcomsat</span>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              {['Programs', 'Resources', 'About', 'Contact'].map((item, index) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="relative text-neutral-600 hover:text-transparent hover:bg-gradient-to-r hover:from-[#3e3eff] hover:to-[#0000e6] hover:bg-clip-text transition-all duration-300 font-medium"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: isVisible ? 'slideInFromTop 0.6s ease-out forwards' : 'none',
                  }}
                >
                  {item}
                  <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#3e3eff] to-[#0000e6] transition-all duration-300 hover:w-full"></div>
                </a>
              ))}
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                className="text-neutral-600 hover:text-[#3e3eff] transition-all duration-300 hover:bg-[#f0f0ff]"
                onClick={() => {
                  router.push('/auth/login')
                }}
              >
                Sign In
              </Button>

              <Button className="bg-gradient-to-r from-[#3e3eff] to-[#0000e6] hover:from-[#0000e6] hover:to-[#0000cc] text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <Sparkles className="mr-2 h-4 w-4" />
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#f0f0ff] via-[#fafafa] to-[#e6e6ff]">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              transform: `translateY(${scrollY * 0.3}px)`,
              background:
                'radial-gradient(circle at 20% 80%, rgba(62, 62, 255, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0, 0, 230, 0.3) 0%, transparent 50%)',
            }}
          ></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div
            className={`inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-[#f0f0ff] to-[#e6e6ff] border border-[#ccccff] text-sm font-medium text-[#0000cc] mb-8 transform transition-all duration-1000 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            <Rocket className="mr-2 h-4 w-4" />
            Discover Your Next Opportunity
            <Sparkles className="ml-2 h-4 w-4" />
          </div>

          <h1
            className={`text-6xl md:text-8xl font-bold mb-8 leading-tight transform transition-all duration-1000 delay-200 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
          >
            <span className="bg-gradient-to-r from-[#3e3eff] to-[#0000e6] bg-clip-text text-transparent">
              Connect with
            </span>
            <br />
            <span className="text-neutral-900 relative">
              Leading Programs
              <div className="absolute -inset-1 bg-gradient-to-r from-[#f0f0ff] to-[#e6e6ff] rounded-lg blur-sm opacity-30 animate-pulse"></div>
            </span>
          </h1>

          <p
            className={`text-xl text-neutral-600 max-w-4xl mx-auto mb-12 leading-relaxed transform transition-all duration-1000 delay-400 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            Discover accelerators, incubators, and educational programs that match your ambitions.
            Filter by location, industry focus, and program type to find opportunities that align
            with your goals and dreams.
          </p>

          <div
            className={`flex flex-col sm:flex-row gap-6 justify-center transform transition-all duration-1000 delay-600 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-[#3e3eff] to-[#0000e6] hover:from-[#0000e6] hover:to-[#0000cc] text-white shadow-xl hover:shadow-2xl group transform hover:scale-105 transition-all duration-300 px-8 py-4 text-lg"
            >
              Explore Programs
              <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-[#ccccff] text-[#0000cc] hover:bg-gradient-to-r hover:from-[#f0f0ff] hover:to-[#e6e6ff] hover:border-[#b3b3ff] transition-all duration-300 px-8 py-4 text-lg transform hover:scale-105"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Program Search Section */}
      <section id="programs" className="py-24 bg-white relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f0f0ff]/30 to-transparent"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-neutral-900 mb-6">
              <span className="bg-gradient-to-r from-[#3e3eff] to-[#0000e6] bg-clip-text text-transparent">
                Search Programs
              </span>{' '}
              & Applications
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto mb-4">
              Filter through hundreds of programs by city, type, organization and duration
            </p>
            <div className="text-sm text-neutral-500">
              Showing {filteredPrograms.length} of {programs.length} programs
            </div>
          </div>

          {/* Search Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 mb-16 shadow-2xl border border-neutral-200/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#3e3eff]/5 to-[#0000e6]/5"></div>
            <div className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <div className="sm:col-span-2 lg:col-span-2">
                <Input
                  placeholder="Search programs, organizations..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="h-14 text-lg border-2 border-neutral-200 focus:border-[#3e3eff] rounded-xl transition-all duration-300 focus:shadow-lg"
                />
              </div>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="h-14 border-2 border-neutral-200 rounded-xl focus:border-[#3e3eff] transition-all duration-300">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  <SelectItem value="Lagos">Lagos</SelectItem>
                  <SelectItem value="Abuja">Abuja</SelectItem>
                  <SelectItem value="Port Harcourt">Port Harcourt</SelectItem>
                  <SelectItem value="Kano">Kano</SelectItem>
                  <SelectItem value="Ibadan">Ibadan</SelectItem>
                  <SelectItem value="Enugu">Enugu</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-14 border-2 border-neutral-200 rounded-xl focus:border-[#3e3eff] transition-all duration-300">
                  <SelectValue placeholder="Program Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Accelerator">Accelerator</SelectItem>
                  <SelectItem value="Hackathon">Hackathon</SelectItem>
                  <SelectItem value="Workshop">Workshop</SelectItem>
                  <SelectItem value="Incubator">Incubator</SelectItem>
                  <SelectItem value="Bootcamp">Bootcamp</SelectItem>
                  <SelectItem value="Conference">Conference</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
                <SelectTrigger className="h-14 border-2 border-neutral-200 rounded-xl focus:border-[#3e3eff] transition-all duration-300">
                  <SelectValue placeholder="Organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  <SelectItem value="Innovation Hub Lagos">Innovation Hub Lagos</SelectItem>
                  <SelectItem value="Nigcomsat Limited">Nigcomsat Limited</SelectItem>
                  <SelectItem value="Rivers State Innovation Hub">
                    Rivers State Innovation Hub
                  </SelectItem>
                  <SelectItem value="Northern Innovation Centre">
                    Northern Innovation Centre
                  </SelectItem>
                  <SelectItem value="Oyo Tech Valley">Oyo Tech Valley</SelectItem>
                  <SelectItem value="South East Tech Hub">South East Tech Hub</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Program Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPrograms.map((program, index) => (
              <Card
                key={program.id}
                className={`group hover:shadow-2xl transition-all duration-500 border-2 border-transparent hover:border-[#ccccff] relative overflow-hidden transform hover:-translate-y-2 ${
                  program.featured
                    ? 'ring-2 ring-[#ccccff] bg-gradient-to-br from-[#f0f0ff]/50 to-[#e6e6ff]/50'
                    : ''
                }`}
                style={{
                  animationDelay: `${index * 150}ms`,
                  animation: isVisible ? 'slideInFromBottom 0.8s ease-out forwards' : 'none',
                }}
              >
                {/* Banner Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={program.bannerImage}
                    alt={program.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>

                  {/* Program Type Badge */}
                  <div className="absolute top-4 left-4">
                    <Badge className={`${getTypeBadgeStyle(program.type)} border font-medium`}>
                      {program.type}
                    </Badge>
                  </div>

                  {/* Featured Badge */}
                  {program.featured && (
                    <div className="absolute top-4 right-4 bg-gradient-to-r from-[#3e3eff] to-[#0000e6] text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      FEATURED
                    </div>
                  )}

                  {/* Deadline Badge */}
                  <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-gray-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm">
                    <Clock className="h-3 w-3" />
                    {formatDeadline(program.deadline)}
                  </div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-br from-[#3e3eff]/0 to-[#0000e6]/0 group-hover:from-[#3e3eff]/5 group-hover:to-[#0000e6]/5 transition-all duration-500 pointer-events-none"></div>

                <CardHeader className="relative pb-2">
                  <CardTitle className="text-xl group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-[#3e3eff] group-hover:to-[#0000e6] group-hover:bg-clip-text transition-all duration-300 mb-2">
                    {program.name}
                  </CardTitle>

                  {/* Organization and Location */}
                  <div className="space-y-2">
                    <CardDescription className="flex items-center gap-2 text-[#0000cc] font-medium">
                      <Building2 className="h-4 w-4" />
                      {program.organization}
                    </CardDescription>
                    <CardDescription className="flex items-center gap-2 text-neutral-600">
                      <MapPin className="h-4 w-4" />
                      {program.city}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="relative pt-0">
                  <p className="text-neutral-600 mb-4 leading-relaxed text-sm">
                    {program.description}
                  </p>

                  {/* Duration Info */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      <Calendar className="h-4 w-4" />
                      <span>{program.duration}</span>
                    </div>
                    <div className="text-sm font-medium text-[#0000cc]">
                      Apply by{' '}
                      {new Date(program.deadline).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>

                  <Button className="w-full bg-gradient-to-r from-[#3e3eff] to-[#0000e6] hover:from-[#0000e6] hover:to-[#0000cc] text-white transition-all duration-300 transform group-hover:scale-105">
                    Apply Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* No Results Message */}
          {filteredPrograms.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-neutral-700 mb-2">No programs found</h3>
              <p className="text-neutral-500">Try adjusting your search criteria or filters</p>
            </div>
          )}
        </div>
      </section>

      {/* Resources Preview Section */}
      <section className="py-24 bg-gradient-to-br from-neutral-50 via-[#f0f0ff]/30 to-[#e6e6ff]/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#3e3eff]/5 via-transparent to-[#0000e6]/5"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-neutral-900 mb-6">
              Resources &{' '}
              <span className="bg-gradient-to-r from-[#3e3eff] to-[#0000e6] bg-clip-text text-transparent">
                Materials
              </span>
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto mb-8">
              Access videos, documents, PDFs, and templates to help your journey
            </p>
            <Link href="/resources">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-[#ccccff] text-[#0000cc] hover:bg-gradient-to-r hover:from-[#f0f0ff] hover:to-[#e6e6ff] hover:border-[#b3b3ff] transition-all duration-300 px-8 py-4 text-lg transform hover:scale-105"
              >
                View All Resources
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {resources.map((resource, index) => (
              <Card
                key={resource.id}
                className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 relative overflow-hidden border-2 border-transparent hover:border-[#ccccff] bg-white/80 backdrop-blur-sm"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: isVisible ? 'slideInFromBottom 0.8s ease-out forwards' : 'none',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#3e3eff]/0 to-[#0000e6]/0 group-hover:from-[#3e3eff]/5 group-hover:to-[#0000e6]/5 transition-all duration-700"></div>

                <CardHeader className="relative">
                  <div className="flex justify-between items-center mb-3">
                    <Badge className="bg-gradient-to-r from-[#f0f0ff] to-[#e6e6ff] text-[#0000cc] border border-[#ccccff]">
                      {resource.type}
                    </Badge>
                    <Badge variant="outline" className="border-neutral-300">
                      {resource.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-[#3e3eff] group-hover:to-[#0000e6] group-hover:bg-clip-text transition-all duration-300">
                    {resource.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-neutral-600 text-sm mb-6 leading-relaxed">
                    {resource.description}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full group-hover:bg-gradient-to-r group-hover:from-[#f0f0ff] group-hover:to-[#e6e6ff] group-hover:text-[#0000cc] transition-all duration-300"
                  >
                    Access Resource
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#3e3eff]/20 via-transparent to-[#0000e6]/20"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center space-x-3 mb-6 group">
                <div className="relative w-10 h-10 bg-gradient-to-br from-[#3e3eff] to-[#0000e6] rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold bg-gradient-to-r from-[#9999ff] to-[#ccccff] bg-clip-text text-transparent">
                    Starboard
                  </span>
                  <span className="text-xs text-neutral-400">by Nigcomsat</span>
                </div>
              </div>
              <p className="text-neutral-400 leading-relaxed">
                Your gateway to discovering amazing programs and opportunities worldwide.
              </p>
            </div>

            {[
              {
                title: 'Programs',
                links: ['Accelerators', 'Incubators', 'Bootcamps', 'Workshops'],
              },
              {
                title: 'Resources',
                links: ['Guides', 'Templates', 'Videos', 'Documents'],
              },
            ].map((section, sectionIndex) => (
              <div key={section.title}>
                <h3 className="font-semibold mb-6 text-lg">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-neutral-400 hover:text-white hover:text-transparent hover:bg-gradient-to-r hover:from-[#9999ff] hover:to-[#ccccff] hover:bg-clip-text transition-all duration-300"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h3 className="font-semibold mb-6 text-lg">Connect</h3>
              <div className="flex space-x-6">
                {[Users, Building2, Calendar, MessageCircle].map((Icon, index) => (
                  <Icon
                    key={index}
                    className="h-6 w-6 text-neutral-400 hover:text-white cursor-pointer transition-all duration-300 transform hover:scale-125"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-700 pt-8 mt-12 text-center text-neutral-400">
            <p>&copy; 2024 Starboard by Nigcomsat. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInFromBottom {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default HomePage
