'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { FolderOpen, Clock, Sparkles, ArrowLeft, FileText } from 'lucide-react'

const page = () => {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-snow-50 to-neutral-100 flex items-center justify-center p-6">
      <div className="starboard-card max-w-2xl w-full p-12 text-center animate-fade-in">
        {/* Main Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-full flex items-center justify-center shadow-soft">
              <FolderOpen className="w-12 h-12 text-neutral-400" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-500" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-charcoal-800 mb-3">Resources</h1>
            <div className="w-20 h-1 bg-gradient-to-r from-primary-400 to-primary-600 mx-auto rounded-full"></div>
          </div>

          <p className="text-xl text-charcoal-600 leading-relaxed">
            Your resource center is being prepared. Will be ready soon!
          </p>

          <div className="starboard-card bg-gradient-to-r from-primary-50 to-neutral-50 border-primary-200 p-6 space-y-4">
            <div className="flex items-center justify-center space-x-3 text-primary-700">
              <Clock className="w-5 h-5" strokeWidth={1.5} />
              <span className="font-medium">Under Construction</span>
            </div>

            <p className="text-charcoal-600 text-sm leading-relaxed">
              We're organizing a comprehensive resource library with documents, guides, templates,
              and tools to support your work. Everything will be easily searchable and categorized
              for quick access.
            </p>
          </div>

          {/* Features Coming Soon */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="bg-gradient-to-br from-snow-100 to-neutral-50 border border-neutral-200 rounded-lg p-4 text-left">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                <span className="text-sm font-medium text-charcoal-700">Document Library</span>
              </div>
              <p className="text-xs text-charcoal-500">Organized file management system</p>
            </div>

            <div className="bg-gradient-to-br from-snow-100 to-neutral-50 border border-neutral-200 rounded-lg p-4 text-left">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                <span className="text-sm font-medium text-charcoal-700">Quick Search</span>
              </div>
              <p className="text-xs text-charcoal-500">Find resources instantly</p>
            </div>

            <div className="bg-gradient-to-br from-snow-100 to-neutral-50 border border-neutral-200 rounded-lg p-4 text-left">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                <span className="text-sm font-medium text-charcoal-700">Categories</span>
              </div>
              <p className="text-xs text-charcoal-500">Smart organization by topics</p>
            </div>

            <div className="bg-gradient-to-br from-snow-100 to-neutral-50 border border-neutral-200 rounded-lg p-4 text-left">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                <span className="text-sm font-medium text-charcoal-700">Sharing Tools</span>
              </div>
              <p className="text-xs text-charcoal-500">Collaborate and share easily</p>
            </div>
          </div> */}

          {/* Status Indicator */}
          <div className="flex items-center justify-center space-x-4 py-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-primary-500 rounded-full animate-pulse"></div>
              <div
                className="w-3 h-3 bg-primary-400 rounded-full animate-pulse"
                style={{ animationDelay: '0.2s' }}
              ></div>
              <div
                className="w-3 h-3 bg-primary-300 rounded-full animate-pulse"
                style={{ animationDelay: '0.4s' }}
              ></div>
            </div>
            <span className="text-sm text-charcoal-500 font-medium">Organizing resources...</span>
          </div>

          {/* Go Back Button */}
          <div className="pt-4">
            <button
              onClick={() => {
                router.push('/dashboard')
              }}
              className="starboard-button inline-flex items-center space-x-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-6 py-3 font-medium shadow-soft hover:shadow-soft-lg transform hover:-translate-y-0.5 transition-all duration-200 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              <span>Go back to Dashboard</span>
            </button>
          </div>

          {/* Decorative Elements */}
          <div className="pt-8 flex justify-center space-x-8 opacity-30">
            <div className="w-2 h-2 bg-neutral-300 rounded-full"></div>
            <div className="w-2 h-2 bg-neutral-400 rounded-full"></div>
            <div className="w-2 h-2 bg-neutral-300 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default page
