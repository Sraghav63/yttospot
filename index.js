const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Enable CORS for extension requests
app.use(cors());
app.use(express.json());

// Spotify credentials stored as environment variables
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let spotifyToken = '';
let tokenExpiration = 0;

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Endpoint for searching tracks
app.get('/api/search', async (req, res) => {
  try {
    const { title, artist } = req.query;
    
    if (!title || !artist) {
      return res.status(400).json({ error: 'Missing title or artist parameter' });
    }
    
    // Get token if needed
    if (!spotifyToken || Date.now() > tokenExpiration) {
      await getSpotifyToken();
    }
    
    // Search for track
    const response = await axios.get('https://api.spotify.com/v1/search', {
      params: {
        q: `track:${title} artist:${artist}`,
        type: 'track',
        limit: 1
      },
      headers: {
        'Authorization': `Bearer ${spotifyToken}`
      }
    });
    
    if (response.data.tracks && response.data.tracks.items.length > 0) {
      res.json({ url: response.data.tracks.items[0].external_urls.spotify });
    } else {
      res.json({ url: `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist}`)}` });
    }
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'An error occurred' });
  }
});

async function getSpotifyToken() {
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      'grant_type=client_credentials', 
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    spotifyToken = response.data.access_token;
    tokenExpiration = Date.now() + (response.data.expires_in * 1000);
  } catch (error) {
    console.error('Token error:', error.message);
    throw new Error('Failed to get Spotify token');
  }
}

// Start the server if not in production
const port = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Export for Vercel
module.exports = app;