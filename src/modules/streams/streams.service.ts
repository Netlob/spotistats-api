import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { AuthService } from '../auth/auth.service';
// import { PrismaService } from '../prisma/prisma.service';
const SpotifyWebApi = require('spotify-web-api-node');
const { promisify } = require('util');
const { resolve } = require('path');
const fs = require('fs');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

@Injectable()
export class StreamsService {
  spotifyApi: any;
  tokens: string[] = [];
  clientids: string[] = [];
  clientsecrets: string[] = [];
  constructor(
    private readonly elasticsearchService: ElasticsearchService, // private prisma: PrismaService, // private authService: AuthService,
  ) {
    // this.syncStreams();
    this.getTokens();
  }

  private async getTokens() {
    await this.setTokens();
    setInterval(this.setTokens, 55 * 60 * 1000);
    this.migrateStreams(0, 150);
    this.migrateStreams(150, 300);
    this.migrateStreams(300, 450);
    this.migrateStreams(450, 600);
    this.migrateStreams(600, 750);
    this.migrateStreams(750, 850);
  }

  private async setTokens() {
    const ids = process.env.TEST_ID.split(':');
    const secrets = process.env.TEST_SECRET.split(':');
    for (let i = 0; i < ids.length; i++) {
      this.spotifyApi = new SpotifyWebApi({
        clientId: ids[i],
        clientSecret: secrets[i],
      });
      const token = (await this.spotifyApi.clientCredentialsGrant()).body[
        'access_token'
      ];
      this.tokens.push(token);
      this.clientids.push(ids[i]);
      this.clientsecrets.push(secrets[i]);
      this.spotifyApi.setAccessToken(token);
    }
    if (this.tokens.length > 9) {
      console.log('splucing');
      this.tokens.splice(0, 9);
      this.clientids.splice(0, 9);
      this.clientsecrets.splice(0, 9);
    }
  }

  async getStreams(userId, before, after, limit, offset) {
    const query = {
      index: 'streams',
      size: limit,
      from: offset,
      body: {
        query: {
          bool: {
            must: [
              {
                match_phrase: {
                  userId,
                },
              },
            ],
          },
        },
      },
    };
    if (before && after) {
      query.body.query.bool.must.push({
        // @ts-ignore
        range: {
          endTime: {
            lte: before,
            gte: after,
          },
        },
      });
    }
    const { body } = await this.elasticsearchService.search(query);
    return body.hits.hits.map(this.convertToStream);
  }

  async getTrackStreams(userId, trackId, before, after, limit, offset) {
    const query = {
      index: 'streams',
      size: limit,
      from: offset,
      body: {
        query: {
          bool: {
            must: [
              {
                match_phrase: {
                  userId,
                },
              },
              {
                match_phrase: {
                  trackId,
                },
              },
            ],
          },
        },
      },
    };
    if (before && after) {
      query.body.query.bool.must.push({
        // @ts-ignore
        range: {
          endTime: {
            lte: before,
            gte: after,
          },
        },
      });
    }
    const { body } = await this.elasticsearchService.search(query);
    return body.hits.hits.map(this.convertToStream);
  }

  async getTrackCount(userId, trackId, before, after) {
    const query = {
      index: 'streams',
      body: {
        query: {
          bool: {
            must: [
              {
                match_phrase: {
                  userId,
                },
              },
              {
                match_phrase: {
                  trackId,
                },
              },
            ],
          },
        },
      },
    };
    if (before && after) {
      query.body.query.bool.must.push({
        // @ts-ignore
        range: {
          endTime: {
            lte: before,
            gte: after,
          },
        },
      });
    }
    const { body } = await this.elasticsearchService.count(query);
    return body.count;
  }

  async getArtistStreams(userId, artistId, before, after, limit, offset) {
    const query = {
      index: 'streams',
      size: limit,
      from: offset,
      body: {
        query: {
          bool: {
            must: [
              {
                match_phrase: {
                  userId,
                },
              },
              {
                match_phrase: {
                  artistId,
                },
              },
            ],
          },
        },
      },
    };
    if (before && after) {
      query.body.query.bool.must.push({
        // @ts-ignore
        range: {
          endTime: {
            lte: before,
            gte: after,
          },
        },
      });
    }
    const { body } = await this.elasticsearchService.search(query);
    return body.hits.hits.map(this.convertToStream);
  }

  // @Cron('0 */100 * * * *')
  // private async syncStreams() {
  //   console.time('Streamsync');
  //   const users = await this.prisma.user.findMany({
  //     where: {
  //       isPlus: true,
  //       disabled: false,
  //     },
  //     select: {
  //       id: true,
  //       settings: true,
  //       apiClient: true,
  //     },
  //   });

  //   for (let i = 0; i < users.length; i++) {
  //     const dbUser = users[i];
  //     await this.saveStreams(dbUser);
  //   }
  //   console.timeEnd('Streamsync');
  // }

  // private async saveStreams(dbUser) {
  //   const user = await this.authService.getToken(dbUser);
  //   const spotifyApi = new SpotifyWebApi();
  //   spotifyApi.setAccessToken(user.settings.accessToken);

  //   const latestStream = await this.getLatestStream(user.id);
  //   const query = {
  //     limit: 50,
  //   };
  //   if (latestStream?.endTime > 0) query['after'] = latestStream?.endTime;

  //   const recentlyPlayed = (await spotifyApi.getMyRecentlyPlayedTracks(query))
  //     .body.items;

  //   const streams = recentlyPlayed.map((stream) => {
  //     const { track, context } = stream;
  //     const { artists } = track;
  //     return {
  //       userId: user.id,
  //       trackId: track.id,
  //       artistIds: artists.map((artist) => artist.id),
  //       contextId: this.getIdFromURI(context.uri),
  //       playedMs: track.duration_ms,
  //       endTime: new Date(stream.played_at).getTime(),
  //     };
  //   });
  //   if (streams?.length > 0) {
  //     const body = streams.flatMap((doc) => [
  //       { index: { _index: 'streams' } },
  //       doc,
  //     ]);

  //     await this.elasticsearchService.bulk({
  //       body,
  //     });
  //   }
  // }

  private async getLatestStream(userId) {
    const query = {
      index: 'streams',
      size: 1,
      body: {
        query: {
          match_phrase: {
            userId,
          },
        },
        from: 0,
        size: 1,
        sort: [
          {
            endTime: {
              order: 'desc',
            },
          },
        ],
      },
    };
    const { body } = await this.elasticsearchService.search(query);
    return body.hits.hits.map(this.convertToStream)?.[0];
  }

  private convertToStream(obj) {
    return {
      id: obj._id,
      ...obj._source,
    };
  }

  private convertToTrack(obj) {
    return obj._source;
  }

  private getIdFromURI(uri) {
    return uri.split(':')[2];
  }

  private async migrateStreams(start, end) {
    //@ts-ignore
    const files = (await getFiles('./gcp')).filter((a) => a.endsWith('.json'));

    const filesIds = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = file.split('/').slice(-2)[0];
      if (!filesIds[id]) filesIds[id] = [];
      filesIds[id].push(file);
    }

    const ids = Object.keys(filesIds);
    if (end > ids.length) end = ids.length;
    for (let i = start; i < end; i++) {
      const id = ids[i];
      const idFiles = filesIds[id];

      const streams1 = new Set();
      for (let j = 0; j < idFiles.length; j++) {
        JSON.parse(fs.readFileSync(idFiles[j]).toString()).forEach((a) =>
          streams1.add(a),
        );
      }

      console.log('length', streams1.size);
      const streams = [];
      const failed = [];

      for (
        let it = streams1.values(), stream = null;
        (stream = it.next().value);

      ) {
        if (failed.indexOf(`${stream[2]} - ${stream[1]}`) > -1) continue;
        const track = await this.getTrack(stream[2], stream[1]);

        if (!track || track.valid != true) {
          failed.push(`${stream[2]} - ${stream[1]}`);
          continue;
        }
        streams.push({
          userId: id,
          trackId: track.id,
          artistIds: track.artistIds,
          contextId: null,
          playedMs: stream[3],
          endTime: stream[0] * 1000,
        });
      }
      if (streams?.length > 0) {
        // @ts-ignore
        const body = streams.flatMap((doc) => [
          {
            index: {
              _index: 'streams',
              _type: 'stream',
              _id: `${doc.userId}-${doc.endTime - doc.playedMs}`,
            },
          },
          doc,
        ]);

        await this.elasticsearchService.bulk({
          body,
        });
      }
    }
  }

  private async getTrack(trackName, artistName) {
    const { body } = await this.elasticsearchService.search({
      index: 'tracks',
      size: 1,
      from: 0,
      body: {
        query: {
          bool: {
            must: [
              {
                match_phrase: {
                  name: trackName,
                },
              },
              {
                match_phrase: {
                  artistName,
                },
              },
            ],
          },
        },
      },
    });
    if (body.hits.hits.length === 1) {
      return this.convertToTrack(body.hits.hits[0]);
    } else {
      const rand = Math.floor(Math.random() * 9);
      const sApi = new SpotifyWebApi({
        clientId: this.clientids[rand],
        clientSecret: this.clientsecrets[rand],
      });
      sApi.setAccessToken(this.tokens[rand]);
      const track = (
        await new SRequest().retryWrapper(
          sApi,
          RequestTypes.SearchTracks,
          `${trackName} artist:${artistName}`,
          {
            limit: 1,
          },
        )
      )['body'].tracks.items?.[0];

      // console.log(
      //   rand,
      //   this.clientids[rand],
      //   track?.id ? 'added new track' : 'failed new track',
      //   track?.id ? track.name : trackName,
      // );
      const hasId = !!track?.id;
      const body = hasId
        ? {
            id: track.id,
            name: trackName,
            artistName: artistName,
            artistIds: track.artists.map((artist) => artist.id),
            valid: true,
          }
        : {
            name: trackName,
            artistName: artistName,
            artistIds: [],
            valid: false,
          };

      await this.elasticsearchService.index({
        index: 'tracks',
        type: 'track',
        id: hasId ? track.id : null,
        body,
      });

      return body;
    }
  }
}

async function getFiles(dir) {
  const subdirs = await readdir(dir);
  const files = await Promise.all(
    subdirs.map(async (subdir) => {
      const res = resolve(dir, subdir);
      return (await stat(res)).isDirectory() ? getFiles(res) : res;
    }),
  );
  // @ts-ignore
  return files.reduce((a, f) => a.concat(f), []);
}

const RequestTypes = {
  AudioFeatures: 'AudioFeatures',
  ManyAudioFeatures: 'ManyAudioFeatures',
  Album: 'Album',
  Albums: 'Albums',
  Artist: 'Artist',
  Artists: 'Artists',
  SearchTracks: 'SearchTracks',
};

class SRequest {
  request = (client, type, param, args) => {
    switch (type) {
      case RequestTypes.Albums:
        return client.getAlbums(param);
      case RequestTypes.ManyAudioFeatures:
        return client.getAudioFeaturesForTracks(param);
      case RequestTypes.SearchTracks:
        return client.searchTracks(param, args);
      case RequestTypes.Artists:
        return client.getArtists(param);
      default:
        return new Promise((r) => r({ body: undefined }));
    }
  };

  /**
   * This wrapper is to prevent against 429 errors.
   * @param {*} client
   * @param {*} type
   * @param {*} param
   */
  retryWrapper = (client, type, param, args) => {
    console.log('Searching for', param);
    return new Promise((resolve, reject) => {
      this.request(client, type, param, args)
        .then((data) => resolve(data))
        .catch((err) => {
          // If we get a 'too many requests' error then wait and retry
          if (err.statusCode === 429) {
            setTimeout(() => {
              this.request(client, type, param, args)
                .then((data) => resolve(data))
                .catch((err) => reject(err));
            }, parseInt(err.headers['retry-after']) * 1000 + 1000);
            console.log(
              'Waiting',
              err.headers['retry-after'],
              'seconds with accessToken ',
              client.getCredentials().accessToken,
            );
          }
        });
    });
  };
}
