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

function parseIntOrNull(value) {
  const number = parseInt(value)

  if (Number.isNaN(number)) return null

  return number
}

// GET /api/character/stat?char_id=1
async function onRequestCharacter(resp, req) {
  const url = new URL(req.url, 'http://localhost')
  const charId = parseIntOrNull(url.searchParams.get('char_id'))

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
async function onRequestCharacterList(resp, req) {
  const url = new URL(req.url, 'http://localhost')
  const elementId = parseIntOrNull(url.searchParams.get('element_id'))

  const filter = {}

  if (elementId !== null) {
    filter.element_id = elementId
  }

  const characters = await mongo.find('characters', filter)

  const cleanCharacters = characters
    .map(cleanMongoDoc)
    .sort((a, b) => a.char_id - b.char_id)

  writeJson(resp, {
    success: true,
    count: cleanCharacters.length,
    data: cleanCharacters
  })
}

module.exports = {
  onRequestCharacter,
  onRequestCharacterList
}