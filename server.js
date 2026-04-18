const http = require('http')
const api_character = require('./api/character')
const api_shop = require('./api/shop')

const PORT = process.env.PORT || 9888

function onClientRequest(req, resp) {
  const pathname = req.url.split('?')[0]

  resp.writeHead(200, { 'Content-Type': 'application/json' })

  if (req.method === 'GET' && pathname === '/api/character/stat') {
    api_character.onRequestCharacter(resp, req)
  }
  else if (req.method === 'GET' && pathname === '/api/shop/list') {
    api_shop.onRequestShopList(resp)
  }
  else if (req.method === 'GET' && pathname === '/api/shop/pack') {
    api_shop.onRequestShopPack(resp, req)
  }
  else {
    resp.write(JSON.stringify({ message: 'Hello Chainsaw Game API' }))
  }

  resp.end()
}

const server = http.createServer(onClientRequest)
server.listen(PORT)
console.log('running on ' + PORT)