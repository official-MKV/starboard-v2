import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function BaseStyleEarth() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);

    // Add ambient light for visibility
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    // Load earth texture
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
      'https://unpkg.com/three-globe@2.31.0/example/img/earth-day.jpg'
    );

    // Create dots for the Earth surface (Base.org style)
    const dotCount = 8000;
    const dotGeometry = new THREE.BufferGeometry();
    const dotPositions = new Float32Array(dotCount * 3);
    const dotColors = new Float32Array(dotCount * 3);
    const dotSizes = new Float32Array(dotCount);

    // Create a canvas to sample the earth texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = 'https://unpkg.com/three-globe@2.31.0/example/img/earth-day.jpg';
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Generate dots on sphere surface
      const radius = 1.5;
      for (let i = 0; i < dotCount; i++) {
        // Random point on sphere using spherical coordinates
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        dotPositions[i * 3] = x;
        dotPositions[i * 3 + 1] = y;
        dotPositions[i * 3 + 2] = z;
        
        // Sample texture to determine if land or water
        const u = (theta / (Math.PI * 2) + 0.5) % 1;
        const v = phi / Math.PI;
        
        const pixelX = Math.floor(u * canvas.width);
        const pixelY = Math.floor(v * canvas.height);
        const pixelData = ctx.getImageData(pixelX, pixelY, 1, 1).data;
        const brightness = (pixelData[0] + pixelData[1] + pixelData[2]) / 3;
        
        // Check if it's Nigeria region (roughly 4-14°N, 2.5-15°E)
        const lat = 90 - (phi * 180 / Math.PI);
        const lon = (theta * 180 / Math.PI) - 180;
        const isNigeria = lat > 4 && lat < 14 && lon > 2.5 && lon < 15;
        
        // White dots everywhere, gray for landmasses, blue for Nigeria
        if (isNigeria) {
          dotColors[i * 3] = 0.24;     // R
          dotColors[i * 3 + 1] = 0.24; // G
          dotColors[i * 3 + 2] = 1.0;  // B (#3e3eff)
          dotSizes[i] = 4.0;
        } else if (brightness < 120) {
          // Land (darker in texture) - gray
          dotColors[i * 3] = 0.42;     // R
          dotColors[i * 3 + 1] = 0.42; // G
          dotColors[i * 3 + 2] = 0.42; // B (#6B6B6B)
          dotSizes[i] = 3.0;
        } else {
          // Water (lighter in texture) - white
          dotColors[i * 3] = 1.0;      // R
          dotColors[i * 3 + 1] = 1.0;  // G
          dotColors[i * 3 + 2] = 1.0;  // B (white)
          dotSizes[i] = 2.5;
        }
      }
      
      dotGeometry.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
      dotGeometry.setAttribute('color', new THREE.BufferAttribute(dotColors, 3));
      dotGeometry.setAttribute('size', new THREE.BufferAttribute(dotSizes, 1));

      // Mark attributes as needing update
      dotGeometry.attributes.position.needsUpdate = true;
      dotGeometry.attributes.color.needsUpdate = true;
      dotGeometry.attributes.size.needsUpdate = true;
    };

    // Initialize with default positions (will be updated when texture loads)
    const radius = 1.5;
    for (let i = 0; i < dotCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      dotPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      dotPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      dotPositions[i * 3 + 2] = radius * Math.cos(phi);

      // Default white color
      dotColors[i * 3] = 1.0;
      dotColors[i * 3 + 1] = 1.0;
      dotColors[i * 3 + 2] = 1.0;
      dotSizes[i] = 3.0;
    }

    dotGeometry.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
    dotGeometry.setAttribute('color', new THREE.BufferAttribute(dotColors, 3));
    dotGeometry.setAttribute('size', new THREE.BufferAttribute(dotSizes, 1));

    // Dot material with custom shader for circular dots
    const dotMaterial = new THREE.ShaderMaterial({
      transparent: true,
      vertexColors: true,
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          // Create circular dots
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          
          // Smooth edges
          float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha);
        }
      `
    });

    const dots = new THREE.Points(dotGeometry, dotMaterial);
    scene.add(dots);

    // Orbital ring (subtle)
    const orbitRadius = 2.8;
    const orbitGeometry = new THREE.RingGeometry(orbitRadius, orbitRadius + 0.01, 128);
    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0.2,
      transparent: true,
      side: THREE.DoubleSide
    });
    const orbitRing = new THREE.Mesh(orbitGeometry, orbitMaterial);
    orbitRing.rotation.x = Math.PI / 2;
    scene.add(orbitRing);

    // Satellite (blue dot)
    const satelliteGeometry = new THREE.SphereGeometry(0.06, 16, 16);
    const satelliteMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x3e3eff,
      emissive: 0x3e3eff,
      emissiveIntensity: 0.8
    });
    const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
    scene.add(satellite);

    // Satellite glow
    const glowGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x3e3eff,
      transparent: true,
      opacity: 0.4
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    satellite.add(glow);

    // Trail
    const trailLength = 60;
    const trailPositions = [];
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositionsArray = new Float32Array(trailLength * 3);
    const trailOpacities = new Float32Array(trailLength);

    for (let i = 0; i < trailLength; i++) {
      trailOpacities[i] = i / trailLength;
    }

    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositionsArray, 3));
    trailGeometry.setAttribute('opacity', new THREE.BufferAttribute(trailOpacities, 1));

    const trailMaterial = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        color: { value: new THREE.Color(0x3e3eff) }
      },
      vertexShader: `
        attribute float opacity;
        varying float vOpacity;
        
        void main() {
          vOpacity = opacity;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 6.0;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vOpacity;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          
          float alpha = vOpacity * (1.0 - dist * 0.8);
          gl_FragColor = vec4(color, alpha);
        }
      `
    });

    const trail = new THREE.Points(trailGeometry, trailMaterial);
    scene.add(trail);

    // Animation
    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.01;

      // Rotate earth slowly
      dots.rotation.y = time * 0.15;

      // Move satellite
      const angle = time * 0.5;
      const newX = Math.cos(angle) * orbitRadius * Math.cos(Math.PI / 6);
      const newY = Math.sin(angle) * orbitRadius;
      const newZ = Math.cos(angle) * orbitRadius * Math.sin(Math.PI / 6);

      satellite.position.set(newX, newY, newZ);

      // Update trail
      trailPositions.unshift(new THREE.Vector3(newX, newY, newZ));
      if (trailPositions.length > trailLength) {
        trailPositions.pop();
      }

      const positions = trailGeometry.attributes.position.array;
      for (let i = 0; i < trailPositions.length; i++) {
        positions[i * 3] = trailPositions[i].x;
        positions[i * 3 + 1] = trailPositions[i].y;
        positions[i * 3 + 2] = trailPositions[i].z;
      }
      trailGeometry.attributes.position.needsUpdate = true;

      // Pulse glow
      glow.scale.setScalar(1 + Math.sin(time * 3) * 0.2);

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
      dotGeometry.dispose();
      dotMaterial.dispose();
      orbitGeometry.dispose();
      orbitMaterial.dispose();
      satelliteGeometry.dispose();
      satelliteMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      trailGeometry.dispose();
      trailMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px]"
    //   style={{ background: 'transparent' }}
    />
  );
}