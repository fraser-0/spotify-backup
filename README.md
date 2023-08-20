# Spotify Backup

1 August 2023

An app to back up Spotify playlists into JSON files. 
This app is intended to be run locally.

## Requirements

- Node.js version > 20.0.0
- A Spotify developer application
  - Client ID
  - Client Secret
  - Matching Redirect URI to the one in `.env`
- Update `.env` with your Spotify developer application credentials
- Update `.env` with an array of stringified playlists to back up

## Run

Don't run with `nodemon` because the files that get added will
reload the application and the download will be interrupted.
Either ignore your download directory or run in prod with `npm run prod`.

Once you start the app navigate to http://localhost:3000/run.
On navigation to http://localhost:3000/run the app will fetch
the access token and redirect to the callback URI to display the token.
The playlists will automatically begin to download when navigating 
to the callback URI and you can see the progress in the console.
