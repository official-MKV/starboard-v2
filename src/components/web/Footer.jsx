import React from 'react';
import Link from 'next/link';

// Footer links organized in arrays for easy modification
const footerLinks = {
  programs: [
    { name: 'About Us', href: '/about-us' },
    { name: 'Events', href: '/public-events' },
    { name: 'Library', href: '/library' },
  ],
  resources: [
    { name: 'Apply Now', href: 'https://www.mystarboard.ng/apply/cmgkpivcv0001ld045ohs0bso' },
    { name: 'Contact', href: '#' },
  ],
  products: [
    { name: 'Starboard', href: '/' },
  ],
};

const Footer = () => {
  return (
    <footer className="bg-primary-50 w-full py-12">
      <div className="container mx-auto px-6 lg:px-12 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left side - About section */}
          <div className="max-w-lg">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-4">
              NIGCOMSAT'S ACCELERATOR PROGRAM
            </h3>
            <p className="text-gray-700 leading-relaxed">
              NIGCOMSAT Accelerator empowers space-tech startups with mentorship, 
              resources, and industry connections to scale innovations in satellite tech, 
              geospatial intelligence, IoT, AI, and beyond.
            </p>
          </div>

          {/* Right side - Links grid */}
          <div className="grid grid-cols-3 gap-8">
            
            {/* Quick Links Column */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Links
              </h4>
              <ul className="space-y-3">
                {footerLinks.programs.map((link, index) => (
                  <li key={index}>
                    <Link 
                      href={link.href}
                      className="text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Get Started Column */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Get Started
              </h4>
              <ul className="space-y-3">
                {footerLinks.resources.map((link, index) => (
                  <li key={index}>
                    <Link 
                      href={link.href}
                      className="text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* About Column */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                About
              </h4>
              <ul className="space-y-3">
                {footerLinks.products.map((link, index) => (
                  <li key={index}>
                    <Link 
                      href={link.href}
                      className="text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

// Export the links array if you want to use it elsewhere
export { footerLinks };