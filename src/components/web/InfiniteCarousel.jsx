import React from 'react';

// Example images array - replace with your actual images
const defaultImages = [
  { id: 1, url: '/carousel/img1.jpg', alt: 'Earth from space' },
   { id: 2, url: '/carousel/img2.jpg', alt: 'Earth from space' },
   { id: 3, url: '/carousel/img15.jpg', alt: 'Earth from space' },
   { id: 4, url: '/carousel/img4.jpg', alt: 'Earth from space' },
   { id: 5, url: '/carousel/img5.jpg', alt: 'Earth from space' },
   { id: 6, url: '/carousel/img6.jpg', alt: 'Earth from space' },
   { id: 7, url: '/carousel/img14.jpg', alt: 'Earth from space' },
   { id: 8, url: '/carousel/img8.jpg', alt: 'Earth from space' },
    { id: 9, url: '/carousel/img9.jpg', alt: 'Earth from space' },
   { id: 10, url: '/carousel/img10.jpg', alt: 'Earth from space' },
      { id: 12, url: '/carousel/img12.jpg', alt: 'Earth from space' },
   { id: 12, url: '/carousel/img13.jpg', alt: 'Earth from space' },
];

export default function InfiniteCarousel({ images = defaultImages, speed = 40 }) {
  return (
    <div className="w-full overflow-hidden bg-white py-8">
      <div className="carousel-container">
        {/* First set of images */}
        <div className="carousel-track" style={{ animationDuration: `${speed}s` }}>
          {images.map((image) => (
            <div
              key={`first-${image.id}`}
              className="carousel-item"
            >
              <img
                src={image.url}
                alt={image.alt}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {/* Duplicate set for seamless loop */}
          {images.map((image) => (
            <div
              key={`second-${image.id}`}
              className="carousel-item"
            >
              <img
                src={image.url}
                alt={image.alt}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}