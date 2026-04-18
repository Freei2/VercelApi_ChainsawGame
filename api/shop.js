const shopPacks = require('../json/shop_crystal.json')

function onRequestShopList(resp) {
  resp.write(JSON.stringify(shopPacks))
}

function onRequestShopPack(resp, req) {
  const url = new URL(req.url, 'http://localhost')
  const packId = parseInt(url.searchParams.get('pack_id'))

  const found = shopPacks.find(p => p.pack_id === packId)

  if (found) {
    resp.write(JSON.stringify(found))
  } else {
    resp.write(JSON.stringify({ message: 'Pack not found' }))
  }
}

module.exports = {
  onRequestShopList,
  onRequestShopPack
}