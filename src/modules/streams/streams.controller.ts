import {
  Controller,
  Get,
  HttpCode,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserId } from '../../decorators/user.decorator';
import { AuthGuard } from '../../guards/auth.guard';
import { Response } from '../../interfaces/response';
import { StreamsService } from './streams.service';

@Controller('/streams')
export class StreamsController {
  constructor(private streamsService: StreamsService) {}

  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Get('/')
  async getStreams(
    @UserId() userId: string,
    @Query('before') before: number,
    @Query('after') after: number,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ): Promise<Response> {
    return {
      data: await this.streamsService.getStreams(
        userId,
        before,
        after,
        limit,
        offset,
      ),
    };
  }

  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Get('/count')
  async getCount(
    @UserId() userId: string,
    @Query('before') before: number,
    @Query('after') after: number,
  ): Promise<Response> {
    return {
      data: await this.streamsService.getCount(userId, before, after),
    };
  }

  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Get('/duration')
  async getDuration(
    @UserId() userId: string,
    @Query('before') before: number,
    @Query('after') after: number,
  ): Promise<Response> {
    return {
      data: await this.streamsService.getDuration(userId, before, after),
    };
  }

  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Get('/track/:trackId')
  async getTrackStreams(
    @UserId() userId: string,
    @Param('trackId') trackId: string,
    @Query('before') before: number,
    @Query('after') after: number,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ): Promise<Response> {
    return {
      data: await this.streamsService.getTrackStreams(
        userId,
        trackId,
        before,
        after,
        limit,
        offset,
      ),
    };
  }

  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Get('/track/:trackId/count')
  async getTrackCount(
    @UserId() userId: string,
    @Param('trackId') trackId: string,
    @Query('before') before: number,
    @Query('after') after: number,
  ): Promise<Response> {
    return {
      data: await this.streamsService.getTrackCount(
        userId,
        trackId,
        before,
        after,
      ),
    };
  }

  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Get('/track/:trackId/duration')
  async getTrackDuration(
    @UserId() userId: string,
    @Param('trackId') trackId: string,
    @Query('before') before: number,
    @Query('after') after: number,
  ): Promise<Response> {
    return {
      data: await this.streamsService.getTrackDuration(
        userId,
        trackId,
        before,
        after,
      ),
    };
  }

  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Get('/artist/:artistId')
  async getArtistStreams(
    @UserId() userId: string,
    @Param('artistId') artistId: string,
    @Query('before') before: number,
    @Query('after') after: number,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ): Promise<Response> {
    return {
      data: await this.streamsService.getArtistStreams(
        userId,
        artistId,
        before,
        after,
        limit,
        offset,
      ),
    };
  }

  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Get('/artist/:artistId/count')
  async getArtistCount(
    @UserId() userId: string,
    @Param('artistId') artistId: string,
    @Query('before') before: number,
    @Query('after') after: number,
  ): Promise<Response> {
    return {
      data: await this.streamsService.getArtistCount(
        userId,
        artistId,
        before,
        after,
      ),
    };
  }

  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Get('/artist/:artistId/duration')
  async getArtistDuration(
    @UserId() userId: string,
    @Param('artistId') artistId: string,
    @Query('before') before: number,
    @Query('after') after: number,
  ): Promise<Response> {
    return {
      data: await this.streamsService.getArtistDuration(
        userId,
        artistId,
        before,
        after,
      ),
    };
  }

  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Get('/list/tracks/count')
  async getTracksListCount(
    @UserId() userId: string,
    @Query('ids') trackIds: string,
    @Query('before') before: number,
    @Query('after') after: number,
  ): Promise<Response> {
    return {
      data: await this.streamsService.getTracksListCount(
        userId,
        trackIds.split(','),
        before,
        after,
      ),
    };
  }

  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Get('/list/artists/count')
  async getTrackListCount(
    @UserId() userId: string,
    @Query('ids') trackIds: string,
    @Query('before') before: number,
    @Query('after') after: number,
  ): Promise<Response> {
    return {
      data: await this.streamsService.getArtistsListCount(
        userId,
        trackIds.split(','),
        before,
        after,
      ),
    };
  }
}
