// Units are in light years
export const SCALE = {
    LIGHT_YEAR: 1,         // 1 unit = 1 light year
    SOLAR_RADIUS: 0.0000002, // Average radius of a star like our Sun (~696,340 km)
    EARTH_RADIUS: 0.0000000043, // Earth's radius (~6,371 km)
    VISUAL_MULTIPLIER: 500000 // Makes celestial bodies visible while maintaining proportions
};

// Camera configuration for the Three.js perspective camera
export const CAMERA_CONFIG = {
    FOV: 75,                // Field of view in degrees - higher values create a wider view angle
    NEAR: 0.01,            // Nearest visible distance (0.01 light years ~ 95 billion km)
    FAR: 100000,               // Farthest visible distance (100,000 light years)
    INITIAL_Z: 10,         // Starting distance of 10 light years from center
    FADE_START: 1000,      // Stars start fading at 1,000 light years
    FADE_END: 2000,        // Stars completely fade at 2,000 light years
    ALWAYS_VISIBLE_RANGE: 5, // Stars within this range (in light years) are always visible
    PLANET_VISIBLE_RANGE: 20 // Only create/show planets for stars within this range
};

// Star system generation parameters
export const STAR_CONFIG = {
    COUNT: 500,             // Total number of star systems to generate
    MIN_RADIUS: SCALE.SOLAR_RADIUS * SCALE.VISUAL_MULTIPLIER * 0.5,  // Minimum star size (half solar radius)
    MAX_RADIUS: SCALE.SOLAR_RADIUS * SCALE.VISUAL_MULTIPLIER * 5.0,  // Maximum star size (5x solar radius)
    MIN_TEMP: 1000,         // Minimum star temperature in Kelvin (redder stars)
    MAX_TEMP: 10000,        // Maximum star temperature in Kelvin (bluer stars)
    SPACE_RANGE: 1000,      // Size of the cubic space (1000 light years per side)
    MIN_DISTANCE: 10,       // Minimum distance between stars (10 light years)
    HAS_PLANETS_CHANCE: 0.7 // 70% chance a star has planets (based on Kepler data)
};

// Planet generation settings (sizes relative to star)
export const PLANET_CONFIG = {
    MIN_RADIUS: SCALE.EARTH_RADIUS * SCALE.VISUAL_MULTIPLIER * 5.0,  // Minimum planet size
    MAX_RADIUS: SCALE.EARTH_RADIUS * SCALE.VISUAL_MULTIPLIER * 20.0, // Maximum planet size
    MIN_ORBIT: 0.5,         // Closest orbit: 1 light year
    MAX_ORBIT: 5,          // Farthest orbit: 10 light years
    ATMOSPHERE_CHANCE: 0.3  // Probability (0-1) that a planet will have an atmosphere
};

// Moon generation parameters (all sizes relative to parent planet)
export const MOON_CONFIG = {
    MIN_SIZE_RATIO: 0.2,    // Minimum moon size as a fraction of planet size (increased from 0.1)
    MAX_SIZE_RATIO: 0.5,    // Maximum moon size as a fraction of planet size (increased from 0.4)
    MIN_ORBIT_RATIO: 3,     // Minimum orbit distance in planet radii (increased from 2)
    MAX_ORBIT_RATIO: 8,     // Maximum orbit distance in planet radii
    MIN_MOONS: 0,          // Minimum number of moons per planet
    MAX_MOONS: 7,          // Maximum number of moons per planet
    ORBIT_SPEED_FACTOR: 0.01 // Base speed for moon orbits (increased)
};

// User interface and control settings
export const CONTROLS_CONFIG = {
    MIN_DISTANCE: 0.1,     // Closest camera distance (0.1 light years)
    MAX_DISTANCE: 5000,    // Farthest camera distance (5000 light years)
    DRAG_THRESHOLD: 3,     // Pixels of movement before a click becomes a drag
    ANIMATION_DURATION: 1000 // Duration of camera movement animations (milliseconds)
};
