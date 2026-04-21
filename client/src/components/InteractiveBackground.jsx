import React, { useEffect, useRef } from 'react';

const InteractiveBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    // Config for the sphere
    const numParticles = 350; // Drastically reduced for buttery smooth 60fps performance
    const sphereRadius = 350; // Keep it large and centered
    // The specific colors requested: White, Red, Bright Blue
    const colors = ['#ffffff', '#ff4b4b', '#00d2ff'];
    let particles = [];
    
    // Mouse tracking
    let mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };
    
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Generate points evenly distributed on a sphere using Fibonacci sphere algorithm
    for (let i = 0; i < numParticles; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / numParticles);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      
      const x = Math.cos(theta) * Math.sin(phi);
      const y = Math.sin(theta) * Math.sin(phi);
      const z = Math.cos(phi);
      
      particles.push({
        baseX: x, baseY: y, baseZ: z,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 1.5 + 0.5,
        targetR: sphereRadius,
        r: sphereRadius
      });
    }

    let rotationX = 0;
    let rotationY = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Auto-rotation (very slow)
      rotationX += 0.001;
      rotationY += 0.002;
      
      // Calculate mouse-driven rotation offset
      let mouseRotX = 0;
      let mouseRotY = 0;
      if (mouse.x !== -1000) {
        mouseRotX = (mouse.y - centerY) * 0.00005;
        mouseRotY = (mouse.x - centerX) * 0.00005;
      }
      
      const sinX = Math.sin(rotationX + mouseRotX);
      const cosX = Math.cos(rotationX + mouseRotX);
      const sinY = Math.sin(rotationY + mouseRotY);
      const cosY = Math.cos(rotationY + mouseRotY);

      particles.forEach(p => {
        // Rotate around X axis
        let y1 = p.baseY * cosX - p.baseZ * sinX;
        let z1 = p.baseY * sinX + p.baseZ * cosX;
        
        // Rotate around Y axis
        let x2 = p.baseX * cosY + z1 * sinY;
        let z2 = -p.baseX * sinY + z1 * cosY;
        
        // Apply current radius
        let px = x2 * p.r;
        let py = y1 * p.r;
        let pz = z2 * p.r;
        
        // Perspective projection
        const fov = 800;
        const scale = fov / (fov + pz);
        const screenX = centerX + px * scale;
        const screenY = centerY + py * scale;
        
        // Interactive Motion: Repel particles when mouse is near
        if (mouse.x !== -1000) {
          const dx = screenX - mouse.x;
          const dy = screenY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 150) {
            // Push particle outward from the center of the sphere
            p.targetR = sphereRadius + (150 - dist) * 1.5; 
          } else {
            p.targetR = sphereRadius;
          }
        } else {
          p.targetR = sphereRadius;
        }
        
        // Smooth transition for the radius
        p.r += (p.targetR - p.r) * 0.1;
        
        // Draw particle with opacity based on depth
        if (pz > -sphereRadius) {
          // Particles further back are smaller and more transparent
          const alpha = Math.min(1, Math.max(0.1, scale * scale * 0.8));
          ctx.beginPath();
          // To give it a slightly "dash" or elongated look like antigravity, we can draw a tiny ellipse
          ctx.ellipse(screenX, screenY, p.size * scale * 1.2, p.size * scale * 0.8, rotationY, 0, Math.PI * 2);
          
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      });
      
      // Reset alpha
      ctx.globalAlpha = 1.0;
      animationFrameId = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
      window.removeEventListener('resize', resizeCanvas);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1, // Keep it behind all content
        pointerEvents: 'none', // Don't block clicks on the actual website
        background: 'transparent'
      }}
    />
  );
};

export default InteractiveBackground;
