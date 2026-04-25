const mongo = require('../libs/mongofunc')

function writeJson(resp, obj) {
  resp.write(JSON.stringify(obj))
}

function cleanMongoDoc(doc) {
  if (!doc) return doc

  const clean = { ...doc }
  delete clean._id

  return clean
}

function parseIntOrDefault(value, defaultValue) {
  const number = parseInt(value)

  if (Number.isNaN(number)) return defaultValue

  return number
}

// GET /api/shop/list
async function onRequestShopList(resp) {
  const packs = await mongo.find('shop_crystal', {})

  const cleanPacks = packs
    .map(cleanMongoDoc)
    .sort((a, b) => a.pack_id - b.pack_id)

  writeJson(resp, {
    success: true,
    count: cleanPacks.length,
    data: cleanPacks
  })
}

// GET /api/shop/pack?pack_id=1
async function onRequestShopPack(resp, req) {
  const url = new URL(req.url, 'http://localhost')
  const packId = parseIntOrDefault(url.searchParams.get('pack_id'), 0)

  if (packId <= 0) {
    writeJson(resp, {
      success: false,
      message: 'pack_id is required'
    })
    return
  }

  const pack = await mongo.findOne('shop_crystal', {
    pack_id: packId
  })

  if (!pack) {
    writeJson(resp, {
      success: false,
      message: 'Shop pack not found',
      pack_id: packId
    })
    return
  }

  writeJson(resp, {
    success: true,
    data: cleanMongoDoc(pack)
  })
}

// POST /api/shop/buy
// body: { "player_id": 1, "pack_id": 1 }
async function onBuyShopPack(resp, body) {
  const playerId = parseIntOrDefault(body.player_id, 1)
  const packId = parseIntOrDefault(body.pack_id, 0)

  if (packId <= 0) {
    writeJson(resp, {
      success: false,
      message: 'pack_id is required'
    })
    return
  }

  const pack = await mongo.findOne('shop_crystal', {
    pack_id: packId
  })

  if (!pack) {
    writeJson(resp, {
      success: false,
      message: 'Shop pack not found',
      pack_id: packId
    })
    return
  }

  const player = await mongo.findOne('players', {
    player_id: playerId
  })

  if (!player) {
    writeJson(resp, {
      success: false,
      message: 'Player not found',
      player_id: playerId
    })
    return
  }

  const goldNow = Number(player.gold || 0)
  const priceGold = Number(pack.price_gold || 0)
  const crystalAmount = Number(pack.crystal || 0)

  if (goldNow < priceGold) {
    writeJson(resp, {
      success: false,
      message: 'Not enough gold',
      player_id: playerId,
      gold: goldNow,
      cost: priceGold
    })
    return
  }

  await mongo.updateOne(
    'players',
    { player_id: playerId },
    {
      $inc: {
        gold: -priceGold,
        crystal: crystalAmount
      }
    }
  )

  const updatedPlayer = await mongo.findOne('players', {
    player_id: playerId
  })

  writeJson(resp, {
    success: true,
    message: 'Purchase success',
    data: {
      player_id: playerId,
      pack: cleanMongoDoc(pack),
      currency: {
        gold: updatedPlayer.gold || 0,
        crystal: updatedPlayer.crystal || 0
      }
    }
  })
}

module.exports = {
  onRequestShopList,
  onRequestShopPack,
  onBuyShopPack
}