'use client'

const AboutUsPage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="w-full py-20">
        <div className="container mx-auto px-4 md:px-8 lg:px-16 max-w-7xl text-center flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            About NigComSat Accelerator
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl">
            Empowering Nigerian entrepreneurs through innovation in satellite and communication technologies
          </p>
        </div>
      </div>

      {/* Video Section */}
      <div className="container mx-auto px-4 md:px-8 lg:px-16 max-w-7xl py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
      
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full rounded-lg shadow-sm"
              src="https://www.youtube.com/embed/IoD6YYn1zYQ"
              title="Managing Director Message"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>

      {/* Program Overview */}
      <div className="bg-gray-50 py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 lg:px-16 max-w-7xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
            NigComSat Accelerator Program 2025
          </h2>

          {/* Mission Statement */}
          <div className="bg-white rounded-lg p-8 md:p-12 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Mission Statement</h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              The NigComSat Accelerator Program is dedicated to empowering Nigerian entrepreneurs by fostering innovation
              in satellite and communication technologies. Our goal is to bridge connectivity gaps, drive digital transformation,
              and contribute to Nigeria's sustainable development. This initiative aligns with NigComSat's mission to provide
              seamless connectivity and satellite solutions, connecting the unconnected across Africa.
            </p>
          </div>

          {/* Program Duration */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Duration</h4>
              <p className="text-gray-600">Nine Months</p>
            </div>
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Start Date</h4>
              <p className="text-gray-600">February 1, 2025</p>
            </div>
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Demo Day</h4>
              <p className="text-gray-600">October 17, 2025</p>
            </div>
          </div>
        </div>
      </div>

      {/* Eligibility and Timeline */}
      <div className="container mx-auto px-4 md:px-8 lg:px-16 max-w-7xl py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Eligibility */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Eligibility Criteria</h3>
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-600">Be Nigerian citizens</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-600">Have a registered startup operating within Nigeria</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-600">
                  Operate in sectors: space technology, health, agriculture, logistics, financial services,
                  robotics, AI, IT, or related fields
                </p>
              </div>
            </div>

            <h4 className="text-xl font-bold text-gray-900 mb-4">Application Requirements</h4>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="font-semibold text-gray-900 mb-1">Pitch Document</p>
                <p className="text-sm text-gray-600">
                  Comprehensive document outlining business idea, market analysis, value proposition, and growth strategy
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="font-semibold text-gray-900 mb-1">Pitch Video</p>
                <p className="text-sm text-gray-600">
                  Short video presentation summarizing the startup's mission, product/service, and objectives
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="font-semibold text-gray-900 mb-1">Website</p>
                <p className="text-sm text-gray-600">
                  Functional and accessible website with detailed information about the startup
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Application Timeline</h3>
            <div className="space-y-6">
              <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                <div className="absolute left-0 top-0 w-4 h-4 bg-primary rounded-full -translate-x-[9px]" />
                <p className="text-sm font-semibold text-primary mb-1">February 1 – April 7, 2025</p>
                <h4 className="font-bold text-gray-900 mb-1">Application Period</h4>
                <p className="text-sm text-gray-600">Submit all required materials</p>
              </div>
              <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                <div className="absolute left-0 top-0 w-4 h-4 bg-primary rounded-full -translate-x-[9px]" />
                <p className="text-sm font-semibold text-primary mb-1">April 8 – April 22, 2025</p>
                <h4 className="font-bold text-gray-900 mb-1">Evaluation & Interviews</h4>
                <p className="text-sm text-gray-600">Application screening and candidate interviews</p>
              </div>
              <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                <div className="absolute left-0 top-0 w-4 h-4 bg-primary rounded-full -translate-x-[9px]" />
                <p className="text-sm font-semibold text-primary mb-1">April 24 – April 25, 2025</p>
                <h4 className="font-bold text-gray-900 mb-1">Selection Announcement</h4>
                <p className="text-sm text-gray-600">Final selected participants announced</p>
              </div>
              <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                <div className="absolute left-0 top-0 w-4 h-4 bg-primary rounded-full -translate-x-[9px]" />
                <p className="text-sm font-semibold text-primary mb-1">May 12 – October 10, 2025</p>
                <h4 className="font-bold text-gray-900 mb-1">Deep Dive Phase</h4>
                <p className="text-sm text-gray-600">Intensive mentorship and workshops</p>
              </div>
              <div className="relative pl-8">
                <div className="absolute left-0 top-0 w-4 h-4 bg-primary rounded-full -translate-x-[9px]" />
                <p className="text-sm font-semibold text-primary mb-1">October 17, 2025</p>
                <h4 className="font-bold text-gray-900 mb-1">Demo Day</h4>
                <p className="text-sm text-gray-600">Showcase to investors and stakeholders</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Program Benefits */}
      <div className="bg-gray-50 py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 lg:px-16 max-w-7xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
            Program Benefits
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Non-Equity Grant</h3>
              <p className="text-gray-600 mb-4">
                Selected startups will receive funding through a non-equity grant, disbursed in installments
                contingent upon meeting predefined milestones and active participation.
              </p>
               
            </div>

            <div className="bg-white rounded-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Workshops & Training</h3>
              <p className="text-gray-600 mb-4">Comprehensive workshops covering:</p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                  Business development
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                  Marketing strategies
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                  Financial planning
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                  Product innovation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                  Legal compliance
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                  Pitching techniques
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Expert Mentorship</h3>
              <p className="text-gray-600">
                Personalized guidance from professionals, including experts in satellite communications and
                business development, with regular one-on-one sessions tailored to your startup's needs.
              </p>
            </div>

            <div className="bg-white rounded-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Alumni Network</h3>
              <p className="text-gray-600">
                Access to ongoing collaboration, networking, and support through our alumni network.
                Continued mentorship post-program to tackle challenges and sustain growth.
              </p>
            </div>
          </div>
        </div>
      </div>

 

      {/* CTA Section */}
      <div className="relative py-16 md:py-24" style={{backgroundImage:`url("/")`}}>
       <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/banner_img.jpg')",
          backgroundPosition: 'right center'
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60"></div>
      </div>
        <div className=" relative container mx-auto px-4 md:px-8 lg:px-16 max-w-7xl text-center z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Startup?
          </h2>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join the NigComSat Accelerator Program and be part of Nigeria's next wave of innovation
          </p>
          <a
            href="https://www.mystarboard.ng/apply/cmgkpivcv0001ld045ohs0bso"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-primary px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg"
          >
            Apply Now
          </a>
        </div>
      </div>
    </div>
  )
}

export default AboutUsPage
