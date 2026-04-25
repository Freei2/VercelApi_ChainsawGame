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

function toInt(value, defaultValue = null) {
  const number = parseInt(value)
  return Number.isNaN(number) ? defaultValue : number
}

// GET /api/character/stat?char_id=1
async function onRequestCharacter(resp, req) {
  const url = new URL(req.url, 'http://localhost')
  const charId = toInt(url.searchParams.get('char_id'))

  if (charId === null) {
    writeJson(resp, {
      success: false,
      message: 'char_id is required'
    })
    return
  }

  const character = await mongo.findOne('characters', {
    char_id: charId
  })

  if (!character) {
    writeJson(resp, {
      success: false,
      message: 'Character not found',
      char_id: charId
    })
    return
  }

  writeJson(resp, {
    success: true,
    data: cleanMongoDoc(character)
  })
}

// GET /api/character/list
// GET /api/character/list?element_id=1
// GET /api/character/list?rarity_id=5
async function onRequestCharacterList(resp, req) {
  const url = new URL(req.url, 'http://localhost')

  const elementId = toInt(url.searchParams.get('element_id'))
  const rarityId = toInt(url.searchParams.get('rarity_id'))

  const filter = {}

  if (elementId !== null) {
    filter.element_id = elementId
  }

  if (rarityId !== null) {
    filter.rarity_id = rarityId
  }

  const characters = await mongo.find('characters', filter)

  const result = characters
    .map(cleanMongoDoc)
    .sort((a, b) => Number(a.char_id || 0) - Number(b.char_id || 0))

  writeJson(resp, {
    success: true,
    count: result.length,
    data: result
  })
}

module.exports = {
  onRequestCharacter,
  onRequestCharacterList
}