import { HttpException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import * as fs from 'fs';
import ShortUniqueId from 'short-unique-id';
import { CloudStorageService } from '../cloudStorage/cloudStorage.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StreamsService } from '../streams/streams.service';

const importsPath = process.env.IMPORTS_PATH;
@Injectable()
export class ImportService {
  private codeService: _CodeService;

  constructor(
    redisService: RedisService,
    prisma: PrismaService,
    private cloudStorage: CloudStorageService,
    private streamsService: StreamsService,
  ) {
    this.codeService = new _CodeService(redisService, prisma);
  }

  async getCode(user: User) {
    const code = await this.codeService.set(user);
    return code;
  }

  async postCode(body) {
    const code = body?.code;
    if (code == undefined) {
      throw new HttpException('missing code', 400);
    }

    const user = await this.codeService.get(body.code);
    if (!user) throw new HttpException('invalid code', 400);

    return user;
  }

  async listFiles(user) {
    const files = await this.cloudStorage.listFiles(user);

    return {
      ...user,
      imports: files,
    };
  }

  async getDownloadURL(user, params) {
    const fileName = params?.fileName;

    const url = await this.cloudStorage.getDownloadURL(
      `import/${user.id}/${fileName}`,
    );

    return url;
  }

  async upload(files, body) {
    if (files === null || files?.length == 0) {
      throw new HttpException('missing file(s)', 400);
    }

    const code = body?.code;
    if (code == undefined) {
      throw new HttpException('missing code', 400);
    }

    const user = await this.codeService.get(code);
    if (!user) throw new HttpException('invalid code', 400);

    let totalStreams = 0;

    const totalContent: string[][] = [];

    files.forEach((file): void => {
      const validName = /StreamingHistory[0-9][0-9]?.json/g.test(
        file.originalname,
      );
      if (!validName) {
        throw new HttpException(`invalid file: ${file.originalname}`, 400);
      }

      const content = JSON.parse(file.buffer);
      if (content.length > 0 && content.length < 10001) {
        totalStreams += content.length;
        ((content as unknown) as Record<string, unknown>[]).forEach((e) => {
          if (
            Object.keys(e).length == 4 &&
            'endTime' in e &&
            'artistName' in e &&
            'trackName' in e &&
            'msPlayed' in e
          ) {
            e['endTime'] =
              Date.parse((e['endTime'] as string).replace(' ', 'T')) / 10000;
            totalContent.push(Object.values(e) as string[]);
          } else throw new HttpException(`invalid item (${file.name})`, 400);
        });
      } else
        throw new HttpException(
          `invalid file length: ${content.length} (${file.name})`,
          400,
        );
    });

    // TODO: filter dupes from totalContent

    const fileName = `import-${user.id}-${new Date()
      .toJSON()
      .slice(0, 10)}.json`;
    const filePath = `${importsPath}/${fileName}`;
    fs.writeFileSync(filePath, JSON.stringify(totalContent));

    // await this.cloudStorage.uploadFile(user, fileName, filePath);

    this.streamsService.importStreams(filePath);

    // const importedFiles = await this.cloudStorage.listFiles(user);

    // this.codeService.remove(code);

    return {
      user,
      // imports: importedFiles,
      message: `Import of ${totalStreams} streams started. It may take a couple minutes to some hours before they're fully processed and can be seen in the app.`,
    };
  }
}

class _CodeService {
  private _dictionary: string[] = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789'.split('');
  private _uid = new ShortUniqueId({ length: 6, dictionary: this._dictionary });

  constructor(
    private redisService: RedisService,
    private prisma: PrismaService,
  ) {}

  async set(user: User): Promise<string> {
    const code = this._uid();
    if ((await this.redisService.get(this._formatCode(code))) != null) {
      return await this.set(user);
    }
    await this.redisService.set(this._formatCode(code), user.id, {
      ttl: 10 * 60,
    });
    return code;
  }

  async get(code: string): Promise<User> {
    const userId: string = await this.redisService.get(this._formatCode(code));
    if (!userId) return null;
    return await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  }

  async remove(code: string) {
    return await this.redisService.del(this._formatCode(code));
  }

  private _formatCode(code: string) {
    return `import.${code.toUpperCase()}`;
  }
}
