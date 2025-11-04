import React from 'react';
import Link from 'next/link';

const Banner = () => {
  return (
    <div className="relative w-full min-h-[400px] md:h-[450px] lg:h-[500px] overflow-hidden my-16">
      {/* Background image */}
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

      {/* Content */}
      <div className="relative z-10 h-full flex items-center py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-4xl lg:text-6xl font-bold text-white mb-4 md:mb-6 leading-tight">
              Empowering Africa's Space-Tech Future
            </h2>

            <p className="text-base md:text-lg lg:text-xl text-white/90 mb-6 md:mb-8 leading-relaxed">
              Be part of the innovators transforming satellite technology, AI, and IoT through the NIGCOMSAT's Accelerator.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
              <Link
                href="https://www.mystarboard.ng/apply/cmgkpivcv0001ld045ohs0bso"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary hover:bg-primary/90 text-white px-6 md:px-8 py-3 md:py-4 rounded-lg font-semibold transition-all text-center shadow-lg hover:shadow-xl"
              >
                Apply for next cohort
              </Link>

              <Link
                href="/library"
                className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-6 md:px-8 py-3 md:py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all border border-white/30"
              >
                Access resource
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banner;