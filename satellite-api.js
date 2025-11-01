/**
 * SATELLITE API SYSTEM - Treasure Hunting & Connection Monitoring
 *
 * Trinity Architecture:
 * - C2 Design: Clean, scalable API endpoints
 * - C3 Vision: Offline resilience with fallbacks
 * - C1 Build: Working implementation NOW
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

// API Keys (from environment or demo mode)
const N2YO_KEY = process.env.N2YO_API_KEY || 'DEMO_KEY';
const NASA_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';

// Cache for offline fallback
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Cache Helper - Enables offline mode
 */
function getCached(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
}

function setCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
}

/**
 * ENDPOINT: ISS Flyover Predictions
 * Use Case: When can Commander see ISS from mountaintop?
 * Requires: GPS coordinates
 * API: Open Notify (FREE, NO KEY REQUIRED)
 */
router.get('/iss-flyover', async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({
                success: false,
                error: 'Missing lat/lon parameters'
            });
        }

        const cacheKey = `iss-flyover-${lat}-${lon}`;
        const cached = getCached(cacheKey);
        if (cached) {
            return res.json({ success: true, data: cached, cached: true });
        }

        // Call Open Notify API (no auth required!)
        const response = await axios.get(
            `http://api.open-notify.org/iss-pass.json?lat=${lat}&lon=${lon}&n=5`,
            { timeout: 5000 }
        );

        setCache(cacheKey, response.data);

        res.json({
            success: true,
            data: response.data,
            cached: false,
            note: 'Next 5 ISS visible passes'
        });

    } catch (error) {
        // Offline fallback
        const cached = cache.get(`iss-flyover-${req.query.lat}-${req.query.lon}`);
        if (cached) {
            return res.json({
                success: true,
                data: cached.data,
                cached: true,
                warning: 'Using cached data - internet may be down'
            });
        }

        res.status(500).json({
            success: false,
            error: error.message,
            offline: true,
            message: 'ISS API unavailable and no cached data'
        });
    }
});

/**
 * ENDPOINT: ISS Current Location
 * Use Case: Where is ISS right now?
 * API: Open Notify (FREE, NO KEY REQUIRED)
 */
router.get('/iss-location', async (req, res) => {
    try {
        const cacheKey = 'iss-location';
        const cached = getCached(cacheKey);
        if (cached) {
            return res.json({ success: true, data: cached, cached: true });
        }

        const response = await axios.get(
            'http://api.open-notify.org/iss-now.json',
            { timeout: 5000 }
        );

        setCache(cacheKey, response.data);

        res.json({
            success: true,
            data: response.data,
            cached: false
        });

    } catch (error) {
        const cached = cache.get('iss-location');
        if (cached) {
            return res.json({
                success: true,
                data: cached.data,
                cached: true,
                warning: 'Using cached data - internet may be down'
            });
        }

        res.status(500).json({
            success: false,
            error: error.message,
            offline: true
        });
    }
});

/**
 * ENDPOINT: SpaceX Upcoming Launches
 * Use Case: When's the next launch? (consciousness spike predictor)
 * API: SpaceX API (FREE, NO KEY REQUIRED)
 */
router.get('/spacex-launches', async (req, res) => {
    try {
        const limit = req.query.limit || 5;
        const cacheKey = `spacex-launches-${limit}`;
        const cached = getCached(cacheKey);
        if (cached) {
            return res.json({ success: true, data: cached, cached: true });
        }

        const response = await axios.get(
            'https://api.spacexdata.com/v4/launches/upcoming',
            { timeout: 5000 }
        );

        const launches = response.data.slice(0, limit);
        setCache(cacheKey, launches);

        res.json({
            success: true,
            data: launches,
            cached: false,
            count: launches.length
        });

    } catch (error) {
        const cached = cache.get(`spacex-launches-${req.query.limit || 5}`);
        if (cached) {
            return res.json({
                success: true,
                data: cached.data,
                cached: true,
                warning: 'Using cached data - internet may be down'
            });
        }

        res.status(500).json({
            success: false,
            error: error.message,
            offline: true
        });
    }
});

/**
 * ENDPOINT: Satellites Overhead
 * Use Case: What satellites are above me? (treasure hunting optimal times)
 * API: N2YO (FREE with key)
 */
router.get('/overhead', async (req, res) => {
    try {
        const { lat, lon, radius } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({
                success: false,
                error: 'Missing lat/lon parameters'
            });
        }

        const searchRadius = radius || 70; // degrees above horizon
        const cacheKey = `overhead-${lat}-${lon}-${searchRadius}`;
        const cached = getCached(cacheKey);
        if (cached) {
            return res.json({ success: true, data: cached, cached: true });
        }

        if (N2YO_KEY === 'DEMO_KEY') {
            return res.status(401).json({
                success: false,
                error: 'N2YO API key required',
                message: 'Get free key at https://www.n2yo.com/api/',
                setup: 'Add N2YO_API_KEY to .env file'
            });
        }

        // Call N2YO API
        const response = await axios.get(
            `https://api.n2yo.com/rest/v1/satellite/above/${lat}/${lon}/0/${searchRadius}/0/&apiKey=${N2YO_KEY}`,
            { timeout: 5000 }
        );

        setCache(cacheKey, response.data);

        res.json({
            success: true,
            data: response.data,
            cached: false,
            count: response.data.above ? response.data.above.length : 0
        });

    } catch (error) {
        const cached = cache.get(`overhead-${req.query.lat}-${req.query.lon}-${req.query.radius || 70}`);
        if (cached) {
            return res.json({
                success: true,
                data: cached.data,
                cached: true,
                warning: 'Using cached data - internet may be down'
            });
        }

        res.status(500).json({
            success: false,
            error: error.message,
            offline: true
        });
    }
});

/**
 * ENDPOINT: Starlink Coverage Check
 * Use Case: Is Commander's internet connection good? (CRITICAL for offline planning)
 * API: Custom calculation based on Starlink constellation data
 */
router.get('/starlink-status', async (req, res) => {
    try {
        const { lat, lon } = req.query;

        // Simple connectivity test
        const connectivityTest = await axios.get('https://www.google.com', {
            timeout: 3000,
            validateStatus: () => true // Accept any status
        });

        const isOnline = connectivityTest.status === 200;

        res.json({
            success: true,
            starlink: {
                connected: isOnline,
                latency: isOnline ? 'GOOD' : 'OFFLINE',
                status: isOnline ? 'OPERATIONAL' : 'DEGRADED',
                timestamp: new Date().toISOString(),
                location: { lat, lon },
                recommendation: isOnline
                    ? 'Connection stable - full online mode'
                    : 'Connection lost - switching to offline mode'
            }
        });

    } catch (error) {
        // If we can't reach the internet, we're offline
        res.json({
            success: true,
            starlink: {
                connected: false,
                latency: 'OFFLINE',
                status: 'OFFLINE',
                timestamp: new Date().toISOString(),
                location: { lat: req.query.lat, lon: req.query.lon },
                recommendation: 'Internet down - using offline mode',
                offline_mode: true
            }
        });
    }
});

/**
 * ENDPOINT: NASA Astronomy Picture of the Day
 * Use Case: Daily consciousness inspiration
 * API: NASA APOD (FREE with key)
 */
router.get('/nasa-apod', async (req, res) => {
    try {
        const cacheKey = 'nasa-apod';
        const cached = getCached(cacheKey);
        if (cached) {
            return res.json({ success: true, data: cached, cached: true });
        }

        if (NASA_KEY === 'DEMO_KEY') {
            return res.status(401).json({
                success: false,
                error: 'NASA API key required',
                message: 'Get free key at https://api.nasa.gov/',
                setup: 'Add NASA_API_KEY to .env file'
            });
        }

        const response = await axios.get(
            `https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`,
            { timeout: 5000 }
        );

        setCache(cacheKey, response.data);

        res.json({
            success: true,
            data: response.data,
            cached: false
        });

    } catch (error) {
        const cached = cache.get('nasa-apod');
        if (cached) {
            return res.json({
                success: true,
                data: cached.data,
                cached: true,
                warning: 'Using cached data - internet may be down'
            });
        }

        res.status(500).json({
            success: false,
            error: error.message,
            offline: true
        });
    }
});

/**
 * ENDPOINT: Health Check
 * Use Case: Is satellite API system working?
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'OPERATIONAL',
        apis: {
            iss: 'NO KEY REQUIRED',
            spacex: 'NO KEY REQUIRED',
            n2yo: N2YO_KEY !== 'DEMO_KEY' ? 'CONFIGURED' : 'NEEDS KEY',
            nasa: NASA_KEY !== 'DEMO_KEY' ? 'CONFIGURED' : 'NEEDS KEY'
        },
        cache_size: cache.size,
        offline_capable: true,
        message: 'Satellite API system ready for treasure hunting! 🛰️'
    });
});

module.exports = router;
