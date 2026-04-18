const characters = require('../json/characters.json')

function onRequestCharacter(resp, req) {
  const url = new URL(req.url, 'http://localhost')
  const charId = parseInt(url.searchParams.get('char_id'))

  const found = characters.find(c => c.char_id === charId)

  if (found) {
    resp.write(JSON.stringify(found))
  } else {
    resp.write(JSON.stringify({ message: 'Character not found' }))
  }
}

module.exports = {
  onRequestCharacter
}