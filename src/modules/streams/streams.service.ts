import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Cron } from '@nestjs/schedule';
import { ApiClient, User, UserSettings } from '@prisma/client';
import * as fs from 'fs';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
const SpotifyWebApi = require('spotify-web-api-node');

@Injectable()
export class StreamsService {
  tokens: string[] = [];
  clientids: string[] = [];
  clientsecrets: string[] = [];

  constructor(
    private readonly redisService: RedisService,
    private readonly elasticsearchService: ElasticsearchService,
    private prisma: PrismaService,
    private authService: AuthService,
  ) {
    this.setTokens();
    this.syncStreams();
    setInterval(() => this.setTokens(), 45 * 60 * 1000);
  }

  private async setTokens() {
    try {
      const ids = process.env.IMPORT_CLIENT_IDS.split(':');
      const secrets = process.env.IMPORT_CLIENT_SECRETS.split(':');
      for (let i = 0; i < ids.length; i++) {
        const spotifyApi = new SpotifyWebApi({
          clientId: ids[i],
          clientSecret: secrets[i],
        });
        const token = (await spotifyApi.clientCredentialsGrant()).body[
          'access_token'
        ];
        this.tokens.push(token);
        this.clientids.push(ids[i]);
        this.clientsecrets.push(secrets[i]);
      }
      if (this.tokens.length > 9) {
        const count = this.tokens.length - 9;
        this.tokens.splice(0, count);
        this.clientids.splice(0, count);
        this.clientsecrets.splice(0, count);
      }
    } catch {
      setTimeout(() => this.setTokens(), 10 * 1000);
    }
    console.log('tokens updated');
  }

  async getStreams(
    userId: string,
    before: number,
    after: number,
    limit: number,
    offset: number,
  ) {
    const query = {
      index: 'streams',
      size: limit,
      from: offset,
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  'userId.keyword': this.escapeLucene(userId),
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

  async getCount(userId: string, before: number, after: number) {
    const query = {
      index: 'streams',
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  'userId.keyword': this.escapeLucene(userId),
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

  async getDuration(userId: string, before: number, after: number) {
    const query = {
      index: 'streams',
      size: 0,
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  'userId.keyword': this.escapeLucene(userId),
                },
              },
            ],
          },
        },
        aggs: {
          total_duration: { sum: { field: 'playedMs' } },
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
    return body.aggregations.total_duration.value;
  }

  async getTrackStreams(
    userId: string,
    trackId: string,
    before: number,
    after: number,
    limit: number,
    offset: number,
  ) {
    const query = {
      index: 'streams',
      size: limit,
      from: offset,
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  'userId.keyword': this.escapeLucene(userId),
                },
              },
              {
                match_phrase: {
                  trackId: this.escapeLucene(trackId),
                },
              },
            ],
          },
        },
      },
    };
    if (before && after) {
      console.log(userId, trackId, before, after, limit, offset);
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

  async getTrackCount(
    userId: string,
    trackId: string,
    before: number,
    after: number,
  ) {
    const query = {
      index: 'streams',
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  'userId.keyword': this.escapeLucene(userId),
                },
              },
              {
                match_phrase: {
                  trackId: this.escapeLucene(trackId),
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

  async getTracksListCount(
    userId: string,
    trackIds: string[],
    before: number,
    after: number,
  ) {
    const result = {};
    await Promise.all(
      trackIds.map(async (trackId) => {
        const query = {
          index: 'streams',
          body: {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      'userId.keyword': this.escapeLucene(userId),
                    },
                  },
                  {
                    match_phrase: {
                      trackId: this.escapeLucene(trackId),
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
        result[trackId] = body.count;
      }),
    );
    return result;
  }

  async getArtistsListCount(
    userId: string,
    artistIds: string[],
    before: number,
    after: number,
  ) {
    const result = {};
    await Promise.all(
      artistIds.map(async (artistId) => {
        const query = {
          index: 'streams',
          body: {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      'userId.keyword': this.escapeLucene(userId),
                    },
                  },
                  {
                    match: {
                      artistIds: this.escapeLucene(artistId),
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
        result[artistId] = body.count;
      }),
    );
    return result;
  }

  async getTrackDuration(
    userId: string,
    trackId: string,
    before: number,
    after: number,
  ) {
    const query = {
      index: 'streams',
      size: 0,
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  'userId.keyword': this.escapeLucene(userId),
                },
              },
              {
                match_phrase: {
                  trackId: this.escapeLucene(trackId),
                },
              },
            ],
          },
        },
        aggs: {
          total_duration: { sum: { field: 'playedMs' } },
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
    return body.aggregations.total_duration.value;
  }

  async getArtistStreams(
    userId: string,
    artistId: string,
    before: number,
    after: number,
    limit: number,
    offset: number,
  ) {
    const query = {
      index: 'streams',
      size: limit,
      from: offset,
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  'userId.keyword': this.escapeLucene(userId),
                },
              },
              {
                match: {
                  artistIds: this.escapeLucene(artistId),
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

  async getArtistCount(
    userId: string,
    artistId: string,
    before: number,
    after: number,
  ) {
    const query = {
      index: 'streams',
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  'userId.keyword': this.escapeLucene(userId),
                },
              },
              {
                match: {
                  artistIds: this.escapeLucene(artistId),
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

  async getArtistDuration(
    userId: string,
    artistId: string,
    before: number,
    after: number,
  ) {
    const query = {
      index: 'streams',
      size: 0,
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  'userId.keyword': this.escapeLucene(userId),
                },
              },
              {
                match: {
                  artistIds: this.escapeLucene(artistId),
                },
              },
            ],
          },
        },
        aggs: {
          total_duration: { sum: { field: 'playedMs' } },
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
    return body.aggregations.total_duration.value;
  }

  @Cron('0 */100 * * * *')
  private async syncStreams() {
    console.time('Streamsync');
    const users = await this.prisma.user.findMany({
      where: {
        isPlus: true,
        disabled: false,
      },
      include: {
        settings: true,
        apiClient: true,
      },
    });

    for (let i = 0; i < users.length; i++) {
      const dbUser = users[i];
      await this.saveStreams(dbUser);
    }
    console.timeEnd('Streamsync');
  }

  private async saveStreams(
    dbUser: User & {
      settings: UserSettings;
      apiClient: ApiClient;
    },
  ) {
    const user = await this.authService.getToken(dbUser);
    const spotifyApi = new SpotifyWebApi();
    spotifyApi.setAccessToken(user.settings.accessToken);

    const latestStream = await this.getLatestStream(user.id);
    const query = {
      limit: 50,
    };
    if (latestStream?.endTime > 0) query['after'] = latestStream?.endTime;

    const recentlyPlayed = (await spotifyApi.getMyRecentlyPlayedTracks(query))
      .body.items;

    const tracks: any = [];

    const streams = recentlyPlayed.map((stream: any) => {
      const { track, context } = stream;
      const { artists } = track;

      tracks.push({
        id: track.id,
        name: track.name,
        artistName: artists[0].name,
        artistIds: track.artists.map((artist: any) => artist.id),
        valid: true,
      });

      const endTime = new Date(stream.played_at);
      // endTime.setSeconds(0, 0);

      return {
        userId: user.id,
        trackId: track.id,
        trackName: track.name,
        artistIds: artists.map((artist: any) => artist.id),
        contextId: this.getIdFromURI(context?.uri),
        playedMs: track.duration_ms,
        endTime: endTime.getTime(),
        type: 'sync',
      };
    });
    if (streams?.length > 0) {
      const body = streams.flatMap((doc: any) => [
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
    if (tracks?.length > 0) {
      const body = tracks.flatMap((doc: any) => [
        {
          index: {
            _index: 'tracks',
            _type: 'track',
            _id: doc.id,
          },
        },
        doc,
      ]);

      await this.elasticsearchService.bulk({
        body,
      });
    }
  }

  private async getLatestStream(userId: string) {
    const query = {
      index: 'streams',
      size: 1,
      body: {
        query: {
          term: {
            'userId.keyword': this.escapeLucene(userId),
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

  public async importStreams(file: string) {
    if (!file.endsWith('.json')) return;
    const id = file
      .split('/')
      .splice(-1)[0]
      .match(/import-(.*)-.*-.*-.*.json/)[1];
    console.time(id);

    const streams1 = JSON.parse(fs.readFileSync(file).toString()).filter(
      (value: any, index: number, self: any[]) => self.indexOf(value) === index,
    );

    const isTechnicalFile =
      'ts' in streams1[0] &&
      'ms_played' in streams1[0] &&
      'master_metadata_track_name' in streams1[0] &&
      'spotify_track_uri' in streams1[0];

    const streams = [];
    const failed = [];

    if (isTechnicalFile) {
      const idsToGet = new Set();
      for (let i = 0; i < streams1.length; i++) {
        const stream = streams1[i];
        const trackid = this.getIdFromURI(stream?.spotify_track_uri);

        if (
          !trackid ||
          !stream.spotify_track_uri ||
          !stream.master_metadata_track_name ||
          !stream.ms_played ||
          !stream.offline_timestamp
        ) {
          continue;
        }

        const track = await this.getTrackById(trackid);

        if (track) {
          streams.push({
            userId: id,
            trackId: trackid,
            trackName: track.name,
            artistIds: track.artistIds,
            contextId: null,
            playedMs: stream.ms_played,
            endTime: stream.offline_timestamp,
          });
        } else {
          idsToGet.add(trackid);

          streams.push({
            userId: id,
            trackId: trackid,
            trackName: stream.master_metadata_track_name,
            artistIds: null,
            contextId: null,
            playedMs: stream.ms_played,
            endTime: stream.offline_timestamp,
          });
        }
      }

      const trackIds: string[] = Array.from(idsToGet) as string[];
      for (let i = 0; i < trackIds.length; i = i + 50) {
        const ids = trackIds.slice(i, i + 50);
        const tracks = await this.getTracksList(ids);
        for (let j = 0; j < tracks.length; j++) {
          const track = tracks[j];
          streams.forEach((stream) => {
            if (stream.trackId === track.id) {
              stream.artistIds = track.artists.map((artist: any) => artist.id);
              stream.trackName = track.name;
            }
          });
        }
      }
    } else {
      for (let i = 0; i < streams1.length; i++) {
        try {
          const stream = streams1[i];
          if (failed.indexOf(`${stream[2]}-${stream[1]}`) > -1) continue;
          let track: any;
          if (!track) track = await this.getTrack(stream[2], stream[1]);

          if (!track || track.valid != true) {
            failed.push(`${stream[2]}-${stream[1]}`);
            continue;
          }

          streams.push({
            userId: id,
            trackId: track.id,
            trackName: track.name,
            artistIds: track.artistIds,
            contextId: null,
            playedMs: stream[3],
            endTime: stream[0] * 1000,
            type: 'StreamingHistory.json',
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
    console.timeLog(id);
    if (streams?.length > 0) {
      // @ts-ignore
      const body = streams.flatMap((doc: any) => [
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

    fs.unlinkSync(file);
    console.timeEnd(id);
  }

  private async getTrack(trackName: string, artistName: string) {
    const cached = await this.redisService.get(`${trackName}-${artistName}`);
    if (
      cached &&
      typeof cached === 'object' &&
      'id' in cached &&
      'name' in cached &&
      'artistIds' in cached
    ) {
      return cached;
    }
    const { body } = await this.elasticsearchService.search({
      index: 'tracks',
      size: 1,
      from: 0,
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  'name.keyword': this.escapeLucene(trackName),
                },
              },
              {
                term: {
                  'artistName.keyword': this.escapeLucene(artistName),
                },
              },
            ],
          },
        },
      },
    });
    if (body.hits.hits.length === 1) {
      const track = this.convertToTrack(body.hits.hits[0]);
      this.redisService.set(track.id, track, { ttl: 0 });
      return track;
    } else {
      const rand = Math.floor(Math.random() * 9);
      const spotifyApi = new SpotifyWebApi({
        clientId: this.clientids[rand],
        clientSecret: this.clientsecrets[rand],
      });
      spotifyApi.setAccessToken(this.tokens[rand]);
      const track = (
        await new SRequest().retryWrapper(
          spotifyApi,
          RequestTypes.SearchTracks,
          `${trackName} artist:${artistName}`,
          {
            limit: 1,
          },
        )
      )['body'].tracks.items?.[0];

      const hasId = !!track?.id;
      const body = hasId
        ? {
            id: track.id,
            name: trackName,
            artistName: artistName,
            artistIds: track.artists.map((artist: any) => artist.id),
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

      this.redisService.set(`${trackName}-${artistName}`, body, { ttl: 0 });
      if (hasId) this.redisService.set(track.id, body, { ttl: 0 });

      return body;
    }
  }

  private async getTrackById(trackId: string) {
    const cached = await this.redisService.get(trackId);
    if (
      cached &&
      typeof cached === 'object' &&
      'id' in cached &&
      'name' in cached &&
      'artistIds' in cached
    ) {
      return cached;
    }
    const { body } = await this.elasticsearchService.search({
      index: 'tracks',
      size: 1,
      from: 0,
      body: {
        query: {
          term: {
            _id: trackId,
          },
        },
      },
    });
    if (body.hits.hits.length === 1) {
      const track = this.convertToTrack(body.hits.hits[0]);
      this.redisService.set(track.id, track, { ttl: 0 });
      return track;
    } else {
      return null;
    }
  }

  private async getTracksList(trackIds: string[]) {
    const rand = Math.floor(Math.random() * 9);
    const spotifyApi = new SpotifyWebApi({
      clientId: this.clientids[rand],
      clientSecret: this.clientsecrets[rand],
    });
    spotifyApi.setAccessToken(this.tokens[rand]);
    const tracks = (
      await new SRequest().retryWrapper(
        spotifyApi,
        RequestTypes.Tracks,
        trackIds,
        {},
      )
    )['body']?.tracks;

    const body = tracks
      .map((track) => {
        const body = {
          id: track.id,
          name: track.name,
          artistName: track.artists[0].name,
          artistIds: track.artists.map((artist: any) => artist.id),
          valid: true,
        };
        this.redisService.set(track.id, body, { ttl: 0 });
        return body;
      })
      .flatMap((doc: any) => [
        {
          index: {
            _index: 'tracks',
            _type: 'track',
            _id: doc.id,
          },
        },
        doc,
      ]);

    await this.elasticsearchService.bulk({
      body,
    });

    return tracks;
  }

  private escapeLucene(str: string): string {
    return str.replace(/([\!\*\+\&\|\(\)\[\]\{\}\^\~\?\:\"])/g, '\\$1');
  }

  private convertToStream(obj: any) {
    return {
      id: obj._id,
      ...obj._source,
    };
  }

  private convertToTrack(obj: any) {
    if (!('id' in obj._source)) obj._source.id = obj._id;
    return obj._source;
  }

  private getIdFromURI(uri: string): string {
    try {
      return uri.split(':')[2];
    } catch {
      return null;
    }
  }
}

const RequestTypes = {
  AudioFeatures: 'AudioFeatures',
  ManyAudioFeatures: 'ManyAudioFeatures',
  Album: 'Album',
  Albums: 'Albums',
  Artist: 'Artist',
  Artists: 'Artists',
  Tracks: 'Tracks',
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
      case RequestTypes.Tracks:
        return client.getTracks(param);
      default:
        return new Promise((r) => r({ body: undefined }));
    }
  };

  retryWrapper = (client, type, param, args) => {
    return new Promise((resolve, reject) => {
      this.request(client, type, param, args)
        .then((data) => resolve(data))
        .catch((err) => {
          if (err.statusCode === 429) {
            setTimeout(() => {
              this.request(client, type, param, args)
                .then((data) => resolve(data))
                .catch((err) => reject(err));
            }, parseInt(err.headers['retry-after']) * 1000 + 1000);
          }
          console.log(err);
        });
    });
  };
}
