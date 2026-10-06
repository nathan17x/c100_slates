# C100 Slates

Web UI for sending slate images to the 8 delay players on Lawo/Arkona C100 units.

- **Left:** add C100s by IP address. Each card shows its 8 players, the video standard and colorspace used for encoding, and a reachability dot.
- **Right:** image library. Drop or upload PNG/JPG/etc. Images are letterboxed to the device's resolution when sent.
- **Send:** drag an image onto a player, or click a player and pick an image.
- **Saved states tab:** snapshot which image is on any set of players, across any C100s, and put them all back with **Apply**. Tick *Apply this state when the container restarts* to re-send it automatically on boot. Unreachable players are retried for about 9 minutes, in case the C100s come up after the host.

Everything (devices, images, saved states) is stored in `./data` next to `docker-compose.yml`, so it survives container rebuilds and host reboots. Set `DATA_PATH` to store it elsewhere, e.g. `DATA_PATH=/srv/c100-slates docker compose up -d`.

## Deploy

```bash
git clone <this repo> c100-slates
cd c100-slates
docker compose up -d --build
```

Open `http://<host>:3000`. To use a different port, run `PORT=8080 docker compose up -d`, or put `PORT=8080` in a `.env` file next to `docker-compose.yml`.

The container needs HTTP (port 80) access to the C100s, so the Docker host must be on the same network.

To update:

```bash
git pull && docker compose up -d --build
```

## How it works

Sending an image runs the same conversion as `upload_batch.js` on the server: RGB → 10-bit YCbCr (BT.2020/2100/709/601) → BID frame (JSON header + packed 4:2:2). It then sends a `PUT` to `http://<ip>/delayhandler/video?action=write&handler=<0-7>&store=frame`. Uploads to the same C100 run one at a time.

## Develop

```bash
npm install
npm run dev
```

Data is written to `./data` (set `DATA_DIR` to change it).
