import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3001;
const VEO_API_BASE = 'https://aisandbox-pa.googleapis.com/v1';

// ===============================
// 🧩 MIDDLEWARE
// ===============================
app.use(cors({
  origin: [
    'https://dev.monoklix.com',
    'https://monoklix.com'
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// ===============================
// 🔍 HEALTH CHECK
// ===============================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===============================
// 🎬 TEXT-TO-VIDEO
// ===============================
app.post('/api/veo/generate-t2v', async (req, res) => {
  console.log('\n🎬 ===== [T2V] TEXT-TO-VIDEO REQUEST =====');
  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      console.error('❌ No auth token provided');
      return res.status(401).json({ error: 'No auth token provided' });
    }

    console.log('📤 Forwarding to Veo API...');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

    const response = await fetch(`${VEO_API_BASE}/video:batchAsyncGenerateVideoText`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    console.log('📨 Response status:', response.status);
    console.log('📨 Response data:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.error('❌ Veo API Error (T2V):', data);
      return res.status(response.status).json(data);
    }

    console.log('✅ [T2V] Success - Operations:', data.operations?.length || 0);
    console.log('=========================================\n');
    res.json(data);
  } catch (error) {
    console.error('❌ Proxy error (T2V):', error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// 🖼️ IMAGE-TO-VIDEO
// ===============================
app.post('/api/veo/generate-i2v', async (req, res) => {
  console.log('\n🖼️ ===== [I2V] IMAGE-TO-VIDEO REQUEST =====');
  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      console.error('❌ No auth token provided');
      return res.status(401).json({ error: 'No auth token provided' });
    }

    const logBody = JSON.parse(JSON.stringify(req.body));
    if (logBody.requests?.[0]?.startImage?.mediaId) {
      console.log('📤 Has startImage with mediaId:', logBody.requests[0].startImage.mediaId);
    }
    console.log('📤 Prompt:', logBody.requests?.[0]?.textInput?.prompt?.substring(0, 100) + '...');
    console.log('📤 Aspect ratio:', logBody.requests?.[0]?.aspectRatio);
    
    const response = await fetch(`${VEO_API_BASE}/video:batchAsyncGenerateVideoStartImage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    console.log('📨 Response status:', response.status);
    console.log('📨 Response data:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.error('❌ Veo API Error (I2V):', data);
      return res.status(response.status).json(data);
    }

    console.log('✅ [I2V] Success - Operations:', data.operations?.length || 0);
    console.log('=========================================\n');
    res.json(data);
  } catch (error) {
    console.error('❌ Proxy error (I2V):', error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// 🔍 CHECK VIDEO STATUS
// ===============================
app.post('/api/veo/status', async (req, res) => {
  console.log('\n🔍 ===== [STATUS] CHECK VIDEO STATUS =====');
  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      console.error('❌ No auth token provided');
      return res.status(401).json({ error: 'No auth token provided' });
    }

    console.log('📦 Payload:', JSON.stringify(req.body, null, 2));
    
    const response = await fetch(`${VEO_API_BASE}/video:batchCheckAsyncVideoGenerationStatus`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    console.log('📨 Response status:', response.status);
    console.log('📨 Response data:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.error('❌ Veo API Error (Status):', data);
      return res.status(response.status).json(data);
    }

    if (data.operations?.[0]) {
      console.log('📊 Operation status:', data.operations[0].status);
      console.log('📊 Done:', data.operations[0].done);
    }

    console.log('✅ [STATUS] Success');
    console.log('=========================================\n');
    res.json(data);
  } catch (error) {
    console.error('❌ Proxy error (STATUS):', error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// 🖼️ UPLOAD IMAGE
// ===============================
app.post('/api/veo/upload', async (req, res) => {
  console.log('\n📤 ===== [UPLOAD] IMAGE UPLOAD =====');
  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      console.error('❌ No auth token provided');
      return res.status(401).json({ error: 'No auth token provided' });
    }

    console.log('📤 Image size:', req.body.imageInput?.rawImageBytes?.length || 0, 'chars');
    console.log('📤 Mime type:', req.body.imageInput?.mimeType);
    console.log('📤 Aspect ratio:', req.body.imageInput?.aspectRatio);

    const response = await fetch(`${VEO_API_BASE}:uploadUserImage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    console.log('📨 Response status:', response.status);
    console.log('📨 Response data:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.error('❌ Upload Error:', data);
      return res.status(response.status).json(data);
    }

    const mediaId = data.mediaGenerationId?.mediaGenerationId || data.mediaId;
    console.log('✅ [UPLOAD] Success - MediaId:', mediaId);
    console.log('=========================================\n');
    res.json(data);
  } catch (error) {
    console.error('❌ Proxy error (UPLOAD):', error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// 📥 DOWNLOAD VIDEO (CORS BYPASS) - STREAMING FIX
// ===============================
app.get('/api/veo/download-video', async (req, res) => {
  console.log('\n📥 ===== [DOWNLOAD] VIDEO DOWNLOAD =====');
  try {
    const videoUrl = req.query.url;
    
    if (!videoUrl || typeof videoUrl !== 'string') {
      console.error('❌ No URL provided');
      return res.status(400).json({ error: 'Video URL is required' });
    }

    console.log('📥 Video URL:', videoUrl);
    console.log('📥 Fetching and streaming from Google Storage...');

    const response = await fetch(videoUrl);
    
    if (!response.ok) {
      console.error('❌ Failed to fetch video:', response.status, response.statusText);
      const errorBody = await response.text();
      return res.status(response.status).json({ error: `Failed to download: ${response.statusText}`, details: errorBody });
    }

    const contentType = response.headers.get('content-type') || 'video/mp4';
    const contentLength = response.headers.get('content-length');
    const filename = `monoklix-video-${Date.now()}.mp4`;

    console.log('📦 Video headers received:', { contentType, contentLength });

    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Accept-Ranges', 'bytes');

    // Pipe the video stream directly to the client for efficient playback
    response.body.pipe(res);

    response.body.on('end', () => {
      console.log('✅ [DOWNLOAD] Video stream finished to client.');
      console.log('=========================================\n');
    });

    response.body.on('error', (err) => {
      console.error('❌ [DOWNLOAD] Error during video stream pipe:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming video' });
      }
    });

  } catch (error) {
    console.error('❌ Proxy error (DOWNLOAD):', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// ===============================
// 🚀 SERVER START
// ===============================
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 ===================================');
  console.log('🚀 Veo3 Proxy Server STARTED');
  console.log('🚀 ===================================');
  console.log(`📍 Port: ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log('✅ CORS: Allow all origins');
  console.log('🔧 Debug logging: ENABLED');
  console.log('===================================\n');
  console.log('📋 Endpoints:');
  console.log('   POST /api/veo/generate-t2v');
  console.log('   POST /api/veo/generate-i2v');
  console.log('   POST /api/veo/status');
  console.log('   POST /api/veo/upload');
  console.log('   GET  /api/veo/download-video');
  console.log('===================================\n');
});