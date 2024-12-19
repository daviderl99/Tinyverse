import * as THREE from 'three';
import { OrbitControls } from 'three/controls';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.z = 50;

// Add raycaster for object selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedObject = null;
let selectedType = null; // 'star', 'planet', or 'moon'
let crosshairElement = null;

// Create crosshair CSS
const style = document.createElement('style');
style.textContent = `
    body {
        cursor: url('assets/cursors/cursor-default.png') 10 10, auto;
    }
    .star-hover {
        cursor: url('assets/cursors/cursor-active.png') 10 10, pointer;
    }
    .crosshair {
        position: absolute;
        width: 20px;
        height: 20px;
        border: 2px solid #00ff00;
        border-radius: 50%;
        pointer-events: none;
        transform: translate(-50%, -50%);
        z-index: 1000;
        opacity: 0.8;
    }
`;
document.head.appendChild(style);

function createCrosshair(object) {
    removeCrosshair();

    // Create crosshair container
    crosshairElement = document.createElement('div');
    crosshairElement.className = 'crosshair';
    
    // Adjust size based on object type
    const size = selectedType === 'moon' ? 15 :
                selectedType === 'planet' ? 20 : 25;
    crosshairElement.style.width = `${size}px`;
    crosshairElement.style.height = `${size}px`;
    
    document.body.appendChild(crosshairElement);
    updateCrosshairPosition();
}

function removeCrosshair() {
    if (crosshairElement) {
        crosshairElement.remove();
        crosshairElement = null;
    }
}

function updateCrosshairPosition() {
    if (selectedObject && crosshairElement) {
        // Get screen coordinates of the selected object
        const vector = new THREE.Vector3();
        selectedObject.getWorldPosition(vector);
        vector.project(camera);
        
        // Convert to screen coordinates
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
        
        // Update crosshair position
        crosshairElement.style.left = `${x}px`;
        crosshairElement.style.top = `${y}px`;
    }
}

function focusOnObject(object) {
    const targetPosition = new THREE.Vector3();
    object.getWorldPosition(targetPosition);
    
    // Adjust distance based on object type
    const distance = selectedType === 'moon' ? 1 :
                    selectedType === 'planet' ? 3 : 20;
    
    // Animate camera movement
    const startPosition = camera.position.clone();
    const startRotation = controls.target.clone();
    const duration = 1000; // 1 second
    const startTime = Date.now();

    function animateCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing
        const t = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        
        // Move camera
        const offset = new THREE.Vector3(distance, distance, distance);
        camera.position.lerpVectors(startPosition, targetPosition.clone().add(offset), t);
        controls.target.lerpVectors(startRotation, targetPosition, t);
        controls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        }
    }
    
    animateCamera();
}

// Create stars
const starCount = 100;
const stars = [];
const starSystems = [];

function createMoon(planetRadius) {
    // Moon sizes are proportional to their planet's size
    const radius = planetRadius * (Math.random() * 0.3 + 0.1); // 10-40% of planet size
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    
    // Moon colors - grays and light browns
    const baseColor = Math.random() * 0.3 + 0.5; // 0.5 to 0.8
    const color = new THREE.Color(baseColor, baseColor * 0.95, baseColor * 0.8);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const moon = new THREE.Mesh(geometry, material);

    // Create orbit parameters
    const minOrbit = planetRadius * 2;  // Minimum orbit radius
    const maxOrbit = planetRadius * 4;  // Maximum orbit radius
    const orbitRadius = Math.random() * (maxOrbit - minOrbit) + minOrbit;
    
    // Faster orbit speeds than planets
    const orbitSpeed = (0.005 / Math.sqrt(orbitRadius)) + 0.001;
    const orbitAngle = Math.random() * Math.PI * 2;
    const orbitTilt = Math.random() * Math.PI / 4; // Up to 45 degrees tilt
    
    // Create orbit object to hold moon
    const orbit = new THREE.Object3D();
    orbit.rotation.x = orbitTilt;
    orbit.rotation.y = Math.random() * Math.PI * 2; // Random orbit orientation

    // Create visible orbit line
    const orbitCurve = new THREE.EllipseCurve(
        0, 0,
        orbitRadius, orbitRadius,
        0, 2 * Math.PI,
        false,
        0
    );
    const orbitPoints = orbitCurve.getPoints(50);
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(
        orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
    );
    const orbitLine = new THREE.Line(
        orbitGeometry,
        new THREE.LineBasicMaterial({ 
            color: 0x444444, 
            transparent: true, 
            opacity: 0.3 
        })
    );
    orbitLine.visible = false;
    orbit.add(orbitLine);

    // Position moon in orbit
    moon.position.x = orbitRadius * Math.cos(orbitAngle);
    moon.position.z = orbitRadius * Math.sin(orbitAngle);
    orbit.add(moon);

    return { orbit, orbitSpeed };
}

function createPlanet(starPosition) {
    // Planet sizes now range from 0.05 to 0.15 (previously 0.05 to 0.25)
    const radius = Math.random() * 0.1 + 0.05;
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    
    // More varied planet colors
    const color = getPlanetColor();
    const material = new THREE.MeshBasicMaterial({ color: color });
    const planet = new THREE.Mesh(geometry, material);

    // Create orbit parameters with larger distances
    const minOrbit = 5;  // Minimum orbit radius
    const maxOrbit = 30; // Maximum orbit radius
    const orbitRadius = Math.random() * (maxOrbit - minOrbit) + minOrbit;
    
    // Slower orbit speeds for more distant planets
    const orbitSpeed = (0.002 / Math.sqrt(orbitRadius)) + 0.0002;
    const orbitAngle = Math.random() * Math.PI * 2;
    const orbitTilt = Math.random() * Math.PI / 6; // Up to 30 degrees tilt
    
    // Create orbit object to hold planet
    const orbit = new THREE.Object3D();
    orbit.rotation.x = orbitTilt;
    orbit.position.copy(starPosition);

    // Create visible orbit line (add it first)
    const orbitCurve = new THREE.EllipseCurve(
        0, 0,                         // Center x, y
        orbitRadius, orbitRadius,     // xRadius, yRadius
        0, 2 * Math.PI,              // Start angle, end angle
        false,                        // Clockwise
        0                            // Rotation
    );
    const orbitPoints = orbitCurve.getPoints(50);
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(
        orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
    );
    const orbitLine = new THREE.Line(
        orbitGeometry,
        new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.5 })
    );
    orbitLine.visible = false;
    orbit.add(orbitLine);
    
    // Position planet in orbit
    planet.position.x = orbitRadius * Math.cos(orbitAngle);
    planet.position.z = orbitRadius * Math.sin(orbitAngle);
    
    // Add 'atmosphere' to 30% of planets
    if (Math.random() < 0.3) {
        const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.15, 16, 16);
        const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
                glowColor: { value: new THREE.Color(color) }
            },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 glowColor;
                varying vec3 vNormal;
                void main() {
                    float intensity = pow(0.5 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                    gl_FragColor = vec4(glowColor, 1.0) * intensity;
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
        });
        
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        planet.add(atmosphere);
    }

    // Add moons (0 to 7 moons per planet)
    const moonCount = Math.floor(Math.random() * 8);
    const moons = [];
    for (let i = 0; i < moonCount; i++) {
        const moonSystem = createMoon(radius);
        planet.add(moonSystem.orbit);
        moons.push(moonSystem);
    }
    
    orbit.add(planet);
    scene.add(orbit);
    
    return { orbit, orbitSpeed, moons };
}

function createStar() {
    // Star sizes now range from 0.5 to 2 (previously 0.2 to 1)
    const radius = Math.random() * 1.5 + 0.5;
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    
    // Warmer star colors (more yellows and whites)
    const temperature = Math.random() * 3000 + 3000; // 3000K to 6000K
    const color = getStarColor(temperature);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const star = new THREE.Mesh(geometry, material);

    // Random position in a much larger space (increased from 400 to 1000)
    star.position.x = (Math.random() - 0.5) * 1000;
    star.position.y = (Math.random() - 0.5) * 1000;
    star.position.z = (Math.random() - 0.5) * 1000;

    // Calculate distance from origin to determine collision size
    const distanceFromOrigin = Math.sqrt(
        star.position.x * star.position.x + 
        star.position.y * star.position.y + 
        star.position.z * star.position.z
    );
    
    // Scale collision radius based on distance with exponential growth
    const maxDistance = 500; // Half of our 1000 range
    const normalizedDistance = distanceFromOrigin / maxDistance;
    const collisionScale = 1 + Math.pow(normalizedDistance, 2) * 5; // Exponential growth
    
    // Create invisible larger collision sphere
    const collisionGeometry = new THREE.SphereGeometry(radius * collisionScale, 8, 8);
    const collisionMaterial = new THREE.MeshBasicMaterial({ 
        visible: false,
        transparent: true,
        opacity: 0
    });
    const collisionSphere = new THREE.Mesh(collisionGeometry, collisionMaterial);
    star.add(collisionSphere);

    // Create planets for this star
    const planetCount = Math.floor(Math.random() * 5) + 1; // 1 to 5 planets
    const planets = [];
    
    for (let i = 0; i < planetCount; i++) {
        planets.push(createPlanet(star.position));
    }

    // Store the visual mesh in userData for raycasting
    star.userData.visualMesh = star;
    collisionSphere.userData.visualMesh = star;

    stars.push(collisionSphere); // Use collision sphere for raycasting instead of star
    return { star, planets };
}

// Track orbit visibility state
let orbitsVisible = false;

// Function to update orbit visibility for a star system
function updateOrbitVisibility(starSystem, visible) {
    starSystem.planets.forEach(planet => {
        // Get the orbit line (first child) and planet (second child)
        const orbitLine = planet.orbit.children[0];
        orbitLine.visible = visible;

        // Show/hide moon orbits
        planet.moons.forEach(moon => {
            moon.orbit.children[0].visible = visible;
        });
    });
}

// Track mouse state for drag detection
let mouseDownPos = null;
const DRAG_THRESHOLD = 3; // pixels

// Handle mouse down
function onMouseDown(event) {
    mouseDownPos = { x: event.clientX, y: event.clientY };
}

// Handle mouse up and click detection
function onMouseUp(event) {
    if (!mouseDownPos) return;

    // Calculate if mouse moved more than threshold
    const dx = event.clientX - mouseDownPos.x;
    const dy = event.clientY - mouseDownPos.y;
    const dragDistance = Math.sqrt(dx * dx + dy * dy);

    // Only handle as click if mouse didn't move much
    if (dragDistance < DRAG_THRESHOLD) {
        handleStarClick(event);
    }

    mouseDownPos = null;
}

// Separate click handling logic
function handleStarClick(event) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Get all objects that can be clicked
    const clickableObjects = [];
    clickableObjects.push(...stars); // Add stars

    // Add planets and moons
    starSystems.forEach(system => {
        system.planets.forEach(planet => {
            clickableObjects.push(planet.orbit.children[1]); // Add planet
            planet.moons.forEach(moon => {
                clickableObjects.push(moon.orbit.children[1]); // Add moon
            });
        });
    });

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(clickableObjects);

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        let newSelectedObject;
        
        // Determine object type and get actual object
        if (stars.includes(clickedObject)) {
            selectedType = 'star';
            newSelectedObject = clickedObject.userData.visualMesh;
        } else {
            // Check if it's a planet or moon by traversing up the hierarchy
            let parent = clickedObject.parent;
            while (parent) {
                if (parent.type === 'Scene') {
                    selectedType = 'planet';
                    break;
                }
                if (parent.parent && parent.parent.type === 'Mesh') {
                    selectedType = 'moon';
                    break;
                }
                parent = parent.parent;
            }
            newSelectedObject = clickedObject;
        }
        
        if (selectedObject === newSelectedObject) {
            // If clicking the same object, focus on it
            focusOnObject(selectedObject);
            selectedObject = null;
            selectedType = null;
            removeCrosshair();
        } else {
            // Hide previous orbits
            if (selectedObject) {
                starSystems.forEach(system => updateOrbitVisibility(system, false));
            }
            // Select new object
            selectedObject = newSelectedObject;
            createCrosshair(selectedObject);
            orbitsVisible = false;
            
            // Show orbits for the selected object's system
            starSystems.forEach(system => {
                if (selectedType === 'star' && system.star === selectedObject) {
                    updateOrbitVisibility(system, true);
                } else {
                    system.planets.forEach(planet => {
                        if (planet.orbit.children.includes(selectedObject) || 
                            planet.moons.some(moon => moon.orbit.children.includes(selectedObject))) {
                            updateOrbitVisibility(system, true);
                        }
                    });
                }
            });
        }
    } else if (selectedObject) {
        // Clicking empty space deselects
        selectedObject = null;
        selectedType = null;
        removeCrosshair();
        // Hide all orbits
        starSystems.forEach(system => updateOrbitVisibility(system, false));
    }
}

// Update onKeyPress to work with all objects
function onKeyPress(event) {
    if (event.key === 'Enter' && selectedObject) {
        focusOnObject(selectedObject);
        selectedObject = null;
        selectedType = null;
        removeCrosshair();
        starSystems.forEach(system => updateOrbitVisibility(system, false));
    } else if (event.key.toLowerCase() === 'o' && selectedObject) {
        // Toggle orbit visibility
        orbitsVisible = !orbitsVisible;
        starSystems.forEach(system => {
            if (selectedType === 'star' && system.star === selectedObject) {
                updateOrbitVisibility(system, orbitsVisible);
            } else {
                // Find the system containing the selected planet/moon
                system.planets.forEach(planet => {
                    if (planet.orbit.children.includes(selectedObject) || 
                        planet.moons.some(moon => moon.orbit.children.includes(selectedObject))) {
                        updateOrbitVisibility(system, orbitsVisible);
                    }
                });
            }
        });
    }
}

// Mouse move handler for cursor changes
function onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);
    
    const clickableObjects = [];
    clickableObjects.push(...stars);
    starSystems.forEach(system => {
        system.planets.forEach(planet => {
            clickableObjects.push(planet.orbit.children[1]);
            planet.moons.forEach(moon => {
                clickableObjects.push(moon.orbit.children[1]);
            });
        });
    });

    const intersects = raycaster.intersectObjects(clickableObjects);

    // Update cursor style
    if (intersects.length > 0) {
        document.body.classList.add('star-hover');
    } else {
        document.body.classList.remove('star-hover');
    }
}

// Helper function to generate star colors based on temperature
function getStarColor(temperature) {
    // Simplified blackbody radiation approximation
    let r, g, b;
    
    if (temperature <= 3500) {
        // Red to orange
        r = 1;
        g = (temperature - 2000) / 1500;
        b = 0;
    } else if (temperature <= 5000) {
        // Orange to yellow-white
        r = 1;
        g = 0.8 + (temperature - 3500) / 7500;
        b = (temperature - 3500) / 1500;
    } else {
        // Yellow-white to white
        r = 1;
        g = 1;
        b = (temperature - 5000) / 1000;
    }
    
    return new THREE.Color(r, g, b);
}

// Helper function to generate planet colors
function getPlanetColor() {
    const types = [
        { r: 0.5, g: 0.3, b: 0.2 },  // Rocky/Mars-like
        { r: 0.2, g: 0.5, b: 0.8 },  // Ocean/Water
        { r: 0.8, g: 0.7, b: 0.5 },  // Desert
        { r: 0.3, g: 0.6, b: 0.3 },  // Forest
        { r: 0.6, g: 0.6, b: 0.7 },  // Ice
    ];
    
    const type = types[Math.floor(Math.random() * types.length)];
    const variation = (Math.random() - 0.5) * 0.2; // Add some random variation
    
    return new THREE.Color(
        Math.max(0, Math.min(1, type.r + variation)),
        Math.max(0, Math.min(1, type.g + variation)),
        Math.max(0, Math.min(1, type.b + variation))
    );
}

// Create and add stars to the scene
for (let i = 0; i < starCount; i++) {
    const starSystem = createStar();
    starSystems.push(starSystem);
    scene.add(starSystem.star);
}

const MAX_PLANET_RENDER_DISTANCE = 100;

// Animation
function animate() {
    requestAnimationFrame(animate);

    // Update controls
    controls.update();

    // Update star rotations
    starSystems.forEach(system => {
        // Rotate planets around stars
        system.planets.forEach(planet => {
            const planetObj = planet.orbit.children[1];
            planet.orbit.rotation.y += planet.orbitSpeed;
            
            // Rotate moons around planets
            planet.moons.forEach(moon => {
                moon.orbit.rotation.y += moon.orbitSpeed;
            });
        });
    });

    // Update crosshair position
    updateCrosshairPosition();

    // If a planet or moon is selected and focused, make the camera follow it
    if (selectedObject && (selectedType === 'planet' || selectedType === 'moon')) {
        const targetPosition = new THREE.Vector3();
        selectedObject.getWorldPosition(targetPosition);
        
        // Calculate the desired camera position based on the current view angle
        const distance = selectedType === 'moon' ? 1 : 3;
        const currentRotation = controls.getAzimuthalAngle();
        const currentPolarAngle = controls.getPolarAngle();
        
        // Convert spherical coordinates to Cartesian
        const offset = new THREE.Vector3(
            distance * Math.sin(currentPolarAngle) * Math.sin(currentRotation),
            distance * Math.cos(currentPolarAngle),
            distance * Math.sin(currentPolarAngle) * Math.cos(currentRotation)
        );
        
        // Update camera position and target
        camera.position.copy(targetPosition).add(offset);
        controls.target.copy(targetPosition);
    }

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Event listeners
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mouseup', onMouseUp);
window.addEventListener('keypress', onKeyPress);
window.addEventListener('mousemove', onMouseMove);

// Create renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000); // Black background
document.body.appendChild(renderer.domElement);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Add smooth damping effect
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 0.8;
controls.minDistance = 1;
controls.maxDistance = 1000;

animate();