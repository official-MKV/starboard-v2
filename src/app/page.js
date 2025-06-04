'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowRight, Users, Building2, Calendar, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

// Dummy data for programs
const programs = [
  {
    id: 1,
    name: 'TechStart Accelerator',
    city: 'San Francisco',
    type: 'Technology',
    duration: '3 months',
    description: 'Early-stage tech startups acceleration program',
  },
  {
    id: 2,
    name: 'GreenVenture',
    city: 'Austin',
    type: 'Sustainability',
    duration: '6 months',
    description: 'Sustainable technology and clean energy focus',
  },
  {
    id: 3,
    name: 'HealthTech Hub',
    city: 'Boston',
    type: 'Healthcare',
    duration: '4 months',
    description: 'Medical technology and digital health solutions',
  },
  {
    id: 4,
    name: 'FinTech Fast Track',
    city: 'New York',
    type: 'Finance',
    duration: '3 months',
    description: 'Financial technology and blockchain innovations',
  },
]

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

const Index = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCity, setSelectedCity] = useState('all')
  const [selectedType, setSelectedType] = useState('all')

  const filteredPrograms = programs.filter(program => {
    const matchesSearch =
      program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      program.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCity = selectedCity === 'all' || program.city === selectedCity
    const matchesType = selectedType === 'all' || program.type === selectedType

    return matchesSearch && matchesCity && matchesType
  })

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-primary">Starboard</span>
                <span className="text-xs text-neutral-500 -mt-1">by Nigcomsat</span>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#programs" className="text-neutral-600 hover:text-primary transition-colors">
                Programs
              </a>
              <Link
                to="/resources"
                className="text-neutral-600 hover:text-primary transition-colors"
              >
                Resources
              </Link>
              <a href="#about" className="text-neutral-600 hover:text-primary transition-colors">
                About
              </a>
              <a href="#contact" className="text-neutral-600 hover:text-primary transition-colors">
                Contact
              </a>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="text-neutral-600">
                Sign In
              </Button>
              <Button className="bg-primary hover:bg-primary-600 text-white shadow-lg">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-neutral-50">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-sm font-medium text-primary mb-8">
            🚀 Discover Your Next Opportunity
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-primary">Connect with</span>
            <br />
            <span className="text-neutral-900">Leading Programs</span>
          </h1>

          <p className="text-xl text-neutral-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Discover accelerators, incubators, and educational programs that match your ambitions.
            Filter by location, industry focus, and program type to find opportunities that align
            with your goals.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary-600 text-white shadow-xl group"
            >
              Explore Programs
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-primary text-primary hover:bg-primary/5"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Program Search Section */}
      <section id="programs" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              Search Programs & Applications
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Filter through hundreds of programs by city, type, and duration
            </p>
          </div>

          {/* Search Filters */}
          <div className="bg-neutral-50 rounded-2xl p-8 mb-12 shadow-lg border border-neutral-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Search programs..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="h-12 text-lg border-2 border-neutral-200 focus:border-primary"
                />
              </div>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="h-12 border-2 border-neutral-200">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  <SelectItem value="San Francisco">San Francisco</SelectItem>
                  <SelectItem value="Austin">Austin</SelectItem>
                  <SelectItem value="Boston">Boston</SelectItem>
                  <SelectItem value="New York">New York</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-12 border-2 border-neutral-200">
                  <SelectValue placeholder="Program Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Sustainability">Sustainability</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Program Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPrograms.map((program, index) => (
              <Card
                key={program.id}
                className="group hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-neutral-50/0 hover:bg-neutral-50 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardHeader className="relative">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {program.type}
                    </Badge>
                    <span className="text-sm text-neutral-500">{program.duration}</span>
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {program.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {program.city}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-neutral-600 mb-4">{program.description}</p>
                  <Button className="w-full group-hover:bg-primary transition-colors">
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Resources Preview Section */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">Resources & Materials</h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto mb-8">
              Access videos, documents, PDFs, and templates to help your journey
            </p>
            <Link to="/resources">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-primary/5"
              >
                View All Resources
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {resources.map(resource => (
              <Card
                key={resource.id}
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-neutral-50/0 hover:bg-neutral-50 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <CardHeader className="relative">
                  <div className="flex justify-between items-center mb-2">
                    <Badge className="bg-primary/10 text-primary">{resource.type}</Badge>
                    <Badge variant="outline">{resource.category}</Badge>
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {resource.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-neutral-600 text-sm mb-4">{resource.description}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full group-hover:bg-primary/5 group-hover:text-primary"
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
      <footer className="bg-neutral-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">S</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold">Starboard</span>
                  <span className="text-xs text-neutral-400">by Nigcomsat</span>
                </div>
              </div>
              <p className="text-neutral-400">
                Your gateway to discovering amazing programs and opportunities worldwide.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Programs</h3>
              <ul className="space-y-2 text-neutral-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Accelerators
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Incubators
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Bootcamps
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Workshops
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-neutral-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Guides
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Templates
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Videos
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documents
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Connect</h3>
              <div className="flex space-x-4">
                <Users className="h-6 w-6 text-neutral-400 hover:text-white cursor-pointer transition-colors" />
                <Building2 className="h-6 w-6 text-neutral-400 hover:text-white cursor-pointer transition-colors" />
                <Calendar className="h-6 w-6 text-neutral-400 hover:text-white cursor-pointer transition-colors" />
                <MessageCircle className="h-6 w-6 text-neutral-400 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-800 pt-8 mt-8 text-center text-neutral-400">
            <p>&copy; 2024 Starboard by Nigcomsat. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Index
