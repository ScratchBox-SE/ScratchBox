<p align="center">
    <img alt="ScratchBox" src="public/scratchbox-logo-full.svg">
</p>

---

A WIP project hosting/distribution platform for Scratch Everywhere!

# Deploying

The easiest way to run ScratchBox in production is with Docker.

## Environment variables

| Variable              | Required | Description                                                                                                |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`          | Yes      | Secret used to sign auth session tokens. You should preferably use a long random string.                   |
| `AUTH_PROJECT_ID`     | Yes      | The Scratch project ID used for signing in.                                                                |
| `AUTH_PROJECT_AUTHOR` | Yes      | The username that owns the authentication project above.                                                   |
| `MOUNT`               | Yes      | Directory where uploaded project files/thumbnails and other data is stored. Should be a persistent volume. |
| `DB_URL`              | No       | Path to the SQLite database file. Defaults to `sqlite.db`. Should be a persistent volume.                  |
| `NODE_ENV`            | No       | Set to `production` when deployed (already set in the provided Dockerfile).                                |
| `ENABLE_UNISTORE`     | No       | Set to `true` to turn on the Unistore integration. See [Unistore](#unistore-optional) below.               |

## Using Docker Compose (recommended)

1. Create a `.env` file in the project root with at least:

   ```
   JWT_SECRET=<a long random string>
   AUTH_PROJECT_ID=<your login project id>
   AUTH_PROJECT_AUTHOR=<the project's author username>
   ```

2. Start the app:

   ```
   docker compose up -d --build
   ```

   This builds the image, runs pending database migrations automatically on
   startup, and persists the SQLite database and uploaded files in a Docker
   volume (`scratchbox-data`). The app will be available at
   `http://localhost:3000`.

## Using plain Docker

```
docker build -t scratchbox .

docker run -d \
  --name scratchbox \
  -p 3000:3000 \
  -e JWT_SECRET=<a long random string> \
  -e AUTH_PROJECT_ID=<your Scratch Auth project id> \
  -e AUTH_PROJECT_AUTHOR=<the project's author username> \
  -e DB_URL=/data/sqlite.db \
  -e MOUNT=/data/sb-root \
  -v scratchbox-data:/data \
  scratchbox
```

## First-run setup

A newly created project needs a blank starter project to copy when a user clicks
"Create new project", so you'll need to get a `default-project.sb3` file onto
the root of your `MOUNT` volume (e.g. `/data/default-project.sb3` for the
examples above), and you'll want an admin account so you can promote other users
via the admin dashboard (there's no setup wizard for this yet - sign up normally
through the app first, then insert the `admin` role directly into the database).
How you do both of these depends on how you're running ScratchBox:

**Running on the host directly** - both paths are just regular files/paths on
disk:

```
cp /path/to/default-project.sb3 "$MOUNT/default-project.sb3"

sqlite3 "$DB_URL" "INSERT INTO user_roles (user, role) VALUES ('<your-username>', 'admin');"
```

**Running with plain `docker run`** (as in the example above, with the
`scratchbox-data` volume mounted at `/data`) - use `docker cp` and `docker exec`
against the running container:

```
docker cp /path/to/default-project.sb3 scratchbox:/data/default-project.sb3

docker exec scratchbox sqlite3 /data/sqlite.db "INSERT INTO user_roles (user, role) VALUES ('<your-username>', 'admin');"
```

**Running with Docker Compose** - same idea, but through `docker compose cp`/
`docker compose exec` against the service name (`scratchbox` in the provided
`docker-compose.yml`); `docker compose cp` requires Compose v2.21+, if yours is
older use `docker cp <container-name>` instead (find the name with
`docker compose ps`):

```
docker compose cp /path/to/default-project.sb3 scratchbox:/data/default-project.sb3

docker compose exec scratchbox sqlite3 /data/sqlite.db \
  "INSERT INTO user_roles (user, role) VALUES ('<your-username>', 'admin');"
```

## Unistore (optional)

The Unistore homebrew-store integration (`/api/scratchbox.unistore`,
`/api/scratchbox.t3x`) generates 3DS texture atlases using `tex3ds`, a native
binary from devkitPro's [3dstools](https://github.com/devkitPro/3dstools)
package. It's disabled by default - the app runs fine without it, and the two
Unistore endpoints just respond with 404.

To enable it, you need a `tex3ds` binary on `PATH` _and_ `ENABLE_UNISTORE=true`
set at runtime. The default Dockerfile doesn't include `tex3ds`, since
devkitPro's toolchain is fairly heavy for a feature most deployments won't
need - but you can build against devkitPro's own `devkitarm` image instead,
which already ships `tex3ds`.

**With plain Docker**, pass the build arg at build time and the env var at run
time:

```
docker build --build-arg BASE_IMAGE=devkitpro/devkitarm:latest -t scratchbox .

docker run -d \
  --name scratchbox \
  -p 3000:3000 \
  -e JWT_SECRET=<a long random string> \
  -e AUTH_PROJECT_ID=<your Scratch Auth project id> \
  -e AUTH_PROJECT_AUTHOR=<the project's author username> \
  -e DB_URL=/data/sqlite.db \
  -e MOUNT=/data/sb-root \
  -e ENABLE_UNISTORE=true \
  -v scratchbox-data:/data \
  scratchbox
```

**With Docker Compose**, edit `docker-compose.yml` and uncomment both the
`build.args.BASE_IMAGE` line and the `ENABLE_UNISTORE` environment line, so it
looks like:

```yaml
services:
  scratchbox:
    build:
      context: .
      args:
        BASE_IMAGE: devkitpro/devkitarm:latest
    environment:
      - ENABLE_UNISTORE=true
      # ...the rest of the existing environment entries
```

Then rebuild: `docker compose up -d --build`.

If you're not using Docker, just install `tex3ds` yourself (see devkitPro's
[getting started guide](https://devkitpro.org/wiki/Getting_Started)), make sure
it's on `PATH`, and set `ENABLE_UNISTORE=true`.

# Roadmap

## Pre-Testing

- [x] Auth with Scratch Auth
- [x] Project uploads
- [x] Remember projects (Database)
- [x] Project pages
- [x] Project info
  - [x] Description
  - [x] Platform Support
  - [x] Edit
- [x] API
  - [x] Downloading
  - [x] Fetching project info
  - [x] Search
- [x] Searching
  - [x] Basic text search
  - [x] Hide Private Projects
- [x] Likes

## Testing

- [x] Actually check if the file is a Scratch project.
- [x] Moderation
  - [x] Reports
    - [x] Comments
    - [x] Projects
  - [x] Admin/Mod dashboard
  - [x] Easy way to make people mods/admins
  - [x] Allow mods to edit project info
    - [x] Make them give a reason
  - [x] Allow viewing comment history
- [x] TOS/Rules
- [x] Filtered/sorted search
- [x] Project Pages
  - [x] Thumbnail
  - [x] Markdown Support
- [x] API for user projects
- [x] Account profiles
- [x] Improved Error Handling
- [x] Editor
- [x] Unistore
- [x] Commenting
  - [x] Create comments
  - [x] Edit comments
  - [x] Delete comments
  - [x] Replies

## Post-Testing

- [x] Mobile/Small Screen Support
- [ ] Easy configuration and customizability
- [ ] Multi-`.sb3` projects (for each platform)
- [ ] Desktop App
