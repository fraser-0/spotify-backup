// noinspection JSUnusedLocalSymbols

const express = require('express')
const querystring = require('node:querystring')
const fs = require('fs')
require('dotenv').config()

const app = express()

const clientId = process.env.clientId
const clientSecret = process.env.clientSecret
// The playlists to back up
// Store as a stringified JSON array
const playlistsToBackup = JSON.parse(process.env.playlistsToBackup)
// This must match what is set up as the applications redirect URI in Shopify developer dashboard
const redirectURI = 'http://localhost:3000/callback'

async function getTokenData(code){
  try {
    const response = await fetch(
      'https://accounts.spotify.com/api/token',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + (new Buffer.from(clientId + ':' + clientSecret).toString('base64')),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=authorization_code&redirect_uri=${redirectURI}&code=${code}`
      }
    )

    return await response.json()
  } catch (error) {
    console.log("Error getting token data")
    console.log(error)
  }
}

function generateRandomString(length) {
  let text = ''
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

async function getPlaylistItems(
  token,
  playlistName,
  playlistId,
  offset
) {
  try {
    return await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&offset=${offset}`,
      {
        method: 'GET',
        headers: {'Authorization': `Bearer ${token}`}
      }
    )
  } catch (error) {
    console.log(error)
  }
}

function logTrack(
  trackNumber,
  trackName,
  trackArtist,
  trackAlbum
) {
  console.log(`Track ${trackNumber} is ${trackName} by ${trackArtist} on ${trackAlbum}`)
}

function logTokenData(tokenData) {
  console.log(tokenData)
  console.log(tokenData['access_token'])
}

function logResponse(response) {
  console.log(response.status)
  console.log(response.statusText)
}

function logResponseBody(body) {
  console.log(body)
}

function createPlaylistsFolder(path = './playlists/') {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path)
  }
}

function saveJSONFile(
  playlistName,
  jsonString
) {
  // Write to a file
  fs.writeFile(
    `./playlists/${playlistName.replace(/\.0/g, '').replace(/'/g, '')}.json`,
    jsonString,
    (error) => {
      if (error) {
        console.error('Error saving file:', error)
      } else {
        console.log('File saved.')
      }
    }
  )
}

app.get('/status', function (request, response) {
  response.status(200).send("Online.")
})

app.get('/callback', async function (request, response) {
  const code = request.query.code || null
  const state = request.query.state || null

  if (state === null) {
    response.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }))
  } else {
    const tokenData = await getTokenData(code)

    response.status(200).json({
      code: code,
      state: state
    })

    await getMyPlaylists(tokenData['access_token'])
  }
})

app.get('/run', function (request, response) {
  const state = generateRandomString(16)
  const scope = 'playlist-read-private'

  response.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: clientId,
      scope: scope,
      redirect_uri: redirectURI,
      state: state
    })
  )
})

async function getMyPlaylists(token){
  try {
    const response = await fetch(
      'https://api.spotify.com/v1/me/playlists?limit=50',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    const body = await response.json()

    console.log(`Number of playlists ${body.items.length}`)

    let count = 1
    for (const playlist of body.items) {
      if (playlistsToBackup.includes(playlist.name)) {
        console.log(`${count} ${playlist.name}`)
        await downloadPlaylist(token, playlist.name, playlist.id)
        count += 1
      }
    }
    console.log(`Number of playlists to backup ${playlistsToBackup.length}`)
  } catch (error) {
    console.log(error)
  }
}

const downloadPlaylist = async (
  token,
  playlistName,
  playlistId
) => {
  try {
    let offset = 0
    let trackNumber = 1
    let tracks = []

    let response = await getPlaylistItems(token, playlistName, playlistId, offset)

    let body = await response.json()
    console.log(`There are ${body.total} tracks in ${playlistName}`)

    for (const track of body.items) {
      // noinspection JSUnresolvedReference
      tracks.push({
        trackNumber: trackNumber,
        trackName: track.track.name,
        artistName: track.track.artists[0].name,
        albumName: track.track.album.name
      })
      trackNumber += 1
    }

    let numberOfAdditionalFetches = Math.floor(body.total / 50)
    if (numberOfAdditionalFetches >= 1) {
      let nextFetchNumber = 1
      while (nextFetchNumber <= numberOfAdditionalFetches) {
        offset = 50 * nextFetchNumber

        response = await getPlaylistItems(token, playlistName, playlistId, offset)

        body = await response.json()

        for (const track of body.items) {
          // noinspection JSUnresolvedReference
          tracks.push({
            trackNumber: trackNumber,
            trackName: track.track.name,
            artistName: track.track.artists[0].name,
            albumName: track.track.album.name
          })
          trackNumber += 1
        }

        nextFetchNumber += 1
      }
    }

    createPlaylistsFolder()

    const jsonString = JSON.stringify({tracks:tracks}, null, 4)  // The last argument is for pretty-printing

    saveJSONFile(
      playlistName.replace(/\.0/g, '').replace(/'/g, ''),
      jsonString
    )
  } catch (error) {
    console.log(error)
  }
}

async function start() {
  console.log('Run on http://localhost:3000/run')
}

app.listen(3000, start)