const mongo = require('../libs/mongofunc')

function writeJson(resp, obj) {
  resp.write(JSON.stringify(obj))
}

function getPlayerIdFromUrl(req) {
  const url = new URL(req.url, 'http://localhost')
  return parseInt(url.searchParams.get('player_id') || '1')
}

async function onGetCurrency(resp, req) {
  const playerId = getPlayerIdFromUrl(req)

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

  writeJson(resp, {
    success: true,
    data: {
      player_id: player.player_id,
      username: player.username,
      gold: player.gold || 0,
      crystal: player.crystal || 0
    }
  })
}

async function onAddCurrency(resp, body) {
  const playerId = parseInt(body.player_id || 1)
  const gold = Number(body.gold || 0)
  const crystal = Number(body.crystal || 0)

  await mongo.updateOne(
    'players',
    { player_id: playerId },
    {
      $inc: {
        gold: gold,
        crystal: crystal
      },
      $setOnInsert: {
        player_id: playerId,
        username: 'Player' + playerId
      }
    },
    { upsert: true }
  )

  const player = await mongo.findOne('players', {
    player_id: playerId
  })

  writeJson(resp, {
    success: true,
    message: 'Currency updated',
    data: {
      player_id: player.player_id,
      gold: player.gold || 0,
      crystal: player.crystal || 0
    }
  })
}

async function onGetCharacters(resp, req) {
  const playerId = getPlayerIdFromUrl(req)

  const owned = await mongo.find('player_characters', {
    player_id: playerId
  })

  const result = []

  for (const item of owned) {
    const character = await mongo.findOne('characters', {
      char_id: item.char_id
    })

    if (character) {
      delete character._id

      result.push({
        ...character,
        level: item.level || 1,
        eidolon: item.eidolon || 0
      })
    }
  }

  writeJson(resp, {
    success: true,
    data: result
  })
}

module.exports = {
  onGetCurrency,
  onAddCurrency,
  onGetCharacters
}