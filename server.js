const http = require('http')

const apiCharacter = require('./api/character')
const apiShop = require('./api/shop')
const apiPlayer = require('./api/player')
const apiGacha = require('./api/gacha')

const PORT = process.env.PORT || 9888

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''

    req.on('data', chunk => {
      body += chunk
    })

    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })

    req.on('error', error => {
      reject(error)
    })
  })
}

async function onClientRequest(req, resp) {
  const pathname = req.url.split('?')[0]

  resp.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',

    // กัน Vercel / Browser cache ข้อมูล API เก่า
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  })

  if (req.method === 'OPTIONS') {
    resp.end()
    return
  }

  try {
    // -------------------------
    // Character API
    // -------------------------
    if (req.method === 'GET' && pathname === '/api/character/stat') {
      await apiCharacter.onRequestCharacter(resp, req)
    }
    else if (req.method === 'GET' && pathname === '/api/character/list') {
      await apiCharacter.onRequestCharacterList(resp, req)
    }

    // -------------------------
    // Shop API
    // -------------------------
    else if (req.method === 'GET' && pathname === '/api/shop/list') {
      await apiShop.onRequestShopList(resp, req)
    }
    else if (req.method === 'GET' && pathname === '/api/shop/pack') {
      await apiShop.onRequestShopPack(resp, req)
    }
    else if (req.method === 'POST' && pathname === '/api/shop/buy') {
      const body = await readJsonBody(req)
      await apiShop.onBuyShopPack(resp, body)
    }

    // -------------------------
    // Player API
    // -------------------------
    else if (req.method === 'GET' && pathname === '/api/player/currency') {
      await apiPlayer.onGetCurrency(resp, req)
    }
    else if (req.method === 'GET' && pathname === '/api/player/characters') {
      await apiPlayer.onGetCharacters(resp, req)
    }
    else if (req.method === 'POST' && pathname === '/api/player/add-currency') {
      const body = await readJsonBody(req)
      await apiPlayer.onAddCurrency(resp, body)
    }

    // -------------------------
    // Gacha API
    // -------------------------
    else if (req.method === 'POST' && pathname === '/api/gacha/pull') {
      const body = await readJsonBody(req)
      await apiGacha.onPull(resp, body)
    }
    else if (req.method === 'GET' && pathname === '/api/gacha/history') {
      await apiGacha.onHistory(resp, req)
    }
    else if (req.method === 'GET' && pathname === '/api/gacha/pity') {
      await apiGacha.onPity(resp, req)
    }

    // -------------------------
    // Default
    // -------------------------
    else {
      resp.write(JSON.stringify({
        success: true,
        message: 'Chainsaw Game API is running',
        routes: [
          'GET /api/character/stat?char_id=1',
          'GET /api/character/list',
          'GET /api/character/list?element_id=1',
          'GET /api/character/list?rarity_id=5',

          'GET /api/shop/list',
          'GET /api/shop/pack?pack_id=1',
          'POST /api/shop/buy',

          'GET /api/player/currency?player_id=1',
          'GET /api/player/characters?player_id=1',
          'POST /api/player/add-currency',

          'POST /api/gacha/pull',
          'GET /api/gacha/history?player_id=1',
          'GET /api/gacha/pity?player_id=1&gacha_id=1'
        ]
      }))
    }
  } catch (error) {
    console.error(error)

    resp.write(JSON.stringify({
      success: false,
      message: 'Server error',
      error: error.message
    }))
  }

  resp.end()
}

// ใช้ตอนรัน local ด้วย node server.js
if (require.main === module) {
  http.createServer(onClientRequest).listen(PORT, () => {
    console.log('Server running on port ' + PORT)
  })
}

// ใช้ตอน Deploy บน Vercel
module.exports = onClientRequest