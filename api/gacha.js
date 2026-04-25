const mongo = require('../libs/mongofunc')

function writeJson(resp, obj) {
  resp.write(JSON.stringify(obj))
}

function nowString() {
  return new Date().toISOString()
}

async function getCharacter(charId) {
  return await mongo.findOne('characters', {
    char_id: charId
  })
}

async function getPity(playerId, gachaId) {
  const pity = await mongo.findOne('gacha_pity', {
    player_id: playerId,
    gacha_id: gachaId
  })

  if (!pity) return 0

  return pity.pity || 0
}

async function setPity(playerId, gachaId, pityValue) {
  await mongo.updateOne(
    'gacha_pity',
    {
      player_id: playerId,
      gacha_id: gachaId
    },
    {
      $set: {
        player_id: playerId,
        gacha_id: gachaId,
        pity: pityValue
      }
    },
    { upsert: true }
  )
}

async function addCharacterToPlayer(playerId, charId) {
  const owned = await mongo.findOne('player_characters', {
    player_id: playerId,
    char_id: charId
  })

  if (owned) {
    const currentEidolon = owned.eidolon || 0
    const newEidolon = Math.min(currentEidolon + 1, 6)

    await mongo.updateOne(
      'player_characters',
      {
        player_id: playerId,
        char_id: charId
      },
      {
        $set: {
          eidolon: newEidolon
        }
      }
    )

    return {
      is_new: false,
      eidolon: newEidolon
    }
  }

  await mongo.insertOne('player_characters', {
    player_id: playerId,
    char_id: charId,
    level: 1,
    eidolon: 0
  })

  return {
    is_new: true,
    eidolon: 0
  }
}

async function logGacha(playerId, gachaId, charId, rarityId, isGuaranteed) {
  await mongo.insertOne('gacha_log', {
    player_id: playerId,
    gacha_id: gachaId,
    char_id: charId,
    rarity_id: rarityId,
    is_guaranteed: isGuaranteed,
    gacha_time: nowString()
  })
}

async function rollOne(playerId, gachaId) {
  const banner = await mongo.findOne('gacha_banners', {
    gacha_id: gachaId
  })

  if (!banner) {
    throw new Error('Banner not found: ' + gachaId)
  }

  const pityLimit = banner.pity_limit || 80
  const guaranteedCharId = banner.guaranteed_char_id

  let pity = await getPity(playerId, gachaId)
  pity += 1

  let selectedCharId = null
  let isGuaranteed = false

  if (pity >= pityLimit) {
    selectedCharId = guaranteedCharId
    pity = 0
    isGuaranteed = true
  } else {
    const pool = await mongo.find('gacha_pools', {
      gacha_id: gachaId
    })

    if (!pool || pool.length === 0) {
      throw new Error('Gacha pool is empty: ' + gachaId)
    }

    let totalRate = 0

    for (const item of pool) {
      totalRate += Number(item.drop_rate || 0)
    }

    let rand = Math.random() * totalRate
    let sum = 0

    selectedCharId = pool[0].char_id

    for (const item of pool) {
      sum += Number(item.drop_rate || 0)

      if (rand <= sum) {
        selectedCharId = item.char_id
        break
      }
    }
  }

  await setPity(playerId, gachaId, pity)

  const character = await getCharacter(selectedCharId)

  if (!character) {
    throw new Error('Character not found: ' + selectedCharId)
  }

  const ownedResult = await addCharacterToPlayer(playerId, selectedCharId)

  await logGacha(
    playerId,
    gachaId,
    selectedCharId,
    character.rarity_id || 3,
    isGuaranteed
  )

  return {
    char_id: selectedCharId,
    char_name: character.char_name,
    rarity_id: character.rarity_id,
    is_guaranteed: isGuaranteed,
    is_new: ownedResult.is_new,
    eidolon: ownedResult.eidolon,
    pity_after_roll: pity
  }
}

async function onPull(resp, body) {
  const playerId = parseInt(body.player_id || 1)
  const gachaId = parseInt(body.gacha_id || 1)
  const count = parseInt(body.count || 1)

  const costSingle = 160
  const costTen = 1600

  const pullCount = count === 10 ? 10 : 1
  const cost = pullCount === 10 ? costTen : costSingle

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

  const crystalNow = player.crystal || 0

  if (crystalNow < cost) {
    writeJson(resp, {
      success: false,
      message: 'Not enough crystals',
      crystal: crystalNow,
      cost: cost
    })
    return
  }

  await mongo.updateOne(
    'players',
    { player_id: playerId },
    {
      $inc: {
        crystal: -cost
      }
    }
  )

  const results = []

  for (let i = 0; i < pullCount; i++) {
    const result = await rollOne(playerId, gachaId)
    results.push(result)
  }

  const updatedPlayer = await mongo.findOne('players', {
    player_id: playerId
  })

  const currentPity = await getPity(playerId, gachaId)
  const banner = await mongo.findOne('gacha_banners', {
    gacha_id: gachaId
  })

  const pityLimit = banner ? banner.pity_limit || 80 : 80

  writeJson(resp, {
    success: true,
    message: 'Gacha pull success',
    data: {
      player_id: playerId,
      gacha_id: gachaId,
      count: pullCount,
      cost: cost,
      currency: {
        gold: updatedPlayer.gold || 0,
        crystal: updatedPlayer.crystal || 0
      },
      pity: {
        current: currentPity,
        left: pityLimit - currentPity,
        limit: pityLimit
      },
      results: results
    }
  })
}

async function onHistory(resp, req) {
  const url = new URL(req.url, 'http://localhost')
  const playerId = parseInt(url.searchParams.get('player_id') || '1')

  const logs = await mongo.find('gacha_log', {
    player_id: playerId
  })

  logs.sort((a, b) => {
    return new Date(b.gacha_time) - new Date(a.gacha_time)
  })

  const result = []

  for (const log of logs) {
    const character = await getCharacter(log.char_id)

    result.push({
      gacha_time: log.gacha_time,
      gacha_id: log.gacha_id,
      char_id: log.char_id,
      char_name: character ? character.char_name : 'Unknown',
      rarity_id: log.rarity_id,
      is_guaranteed: log.is_guaranteed
    })
  }

  writeJson(resp, {
    success: true,
    data: result
  })
}

module.exports = {
  onPull,
  onHistory
}