import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApiClient, User, UserSettings } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
const SpotifyWebApi = require('spotify-web-api-node');

@Injectable()
export class StreamsService {
  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private prisma: PrismaService,
    private authService: AuthService,
  ) {
    this.syncStreams();
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

  // @Cron('0 */100 * * * *')
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

    const streams = recentlyPlayed.map((stream) => {
      const { track, context } = stream;
      const { artists } = track;
      return {
        userId: user.id,
        trackId: track.id,
        artistIds: artists.map((artist) => artist.id),
        contextId: this.getIdFromURI(context?.uri),
        playedMs: track.duration_ms,
        endTime: new Date(stream.played_at).getTime(),
      };
    });
    if (streams?.length > 0) {
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

  // private async getTrack(trackName: string, artistName: string) {
  //   const { body } = await this.elasticsearchService.search({
  //     index: 'tracks',
  //     size: 1,
  //     from: 0,
  //     body: {
  //       query: {
  //         bool: {
  //           must: [
  //             {
  //               term: {
  //                 'name.keyword': this.escapeLucene(trackName),
  //               },
  //             },
  //             {
  //               term: {
  //                 'artistName.keyword': this.escapeLucene(artistName),
  //               },
  //             },
  //           ],
  //         },
  //       },
  //     },
  //   });
  //   if (body.hits.hits.length === 1) {
  //     return this.convertToTrack(body.hits.hits[0]);
  //   } else {
  //     const rand = Math.floor(Math.random() * 9);
  //     const sApi = new SpotifyWebApi({
  //       clientId: this.clientids[rand],
  //       clientSecret: this.clientsecrets[rand],
  //     });
  //     sApi.setAccessToken(this.tokens[rand]);
  //     const track = (
  //       await new SRequest().retryWrapper(
  //         sApi,
  //         `${trackName} artist:${artistName}`,
  //         {
  //           limit: 1,
  //         },
  //       )
  //     )['body'].tracks.items?.[0];

  //     const hasId = !!track?.id;
  //     const body = hasId
  //       ? {
  //           id: track.id,
  //           name: trackName,
  //           artistName: artistName,
  //           artistIds: track.artists.map((artist) => artist.id),
  //           valid: true,
  //         }
  //       : {
  //           name: trackName,
  //           artistName: artistName,
  //           artistIds: [],
  //           valid: false,
  //         };

  //     await this.elasticsearchService.index({
  //       index: 'tracks',
  //       type: 'track',
  //       id: hasId ? track.id : null,
  //       body,
  //     });

  //     return body;
  //   }
  // }

  private escapeLucene(str: string): string {
    return str.replace(/([\!\*\+\&\|\(\)\[\]\{\}\^\~\?\:\"])/g, '\\$1');
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

  private getIdFromURI(uri: string): string {
    try {
      return uri.split(':')[2];
    } catch {
      return null;
    }
  }
}
// class SRequest {
//   retryWrapper = (client, param, args) => {
//     return new Promise((resolve, reject) => {
//       client
//         .searchTracks(param, args)
//         .then((data) => resolve(data))
//         .catch((err) => {
//           if (err.statusCode === 429) {
//             setTimeout(() => {
//               client
//                 .searchTracks(param, args)
//                 .then((data) => resolve(data))
//                 .catch((err) => reject(err));
//             }, parseInt(err.headers['retry-after']) * 1000 + 1000);
//           }
//         });
//     });
//   };
// }
