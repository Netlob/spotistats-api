import {
  Controller,
  Get,
  HttpCode,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserId } from '../../decorators/user.decorator';
// import { AuthGuard } from '../../guards/auth.guard';
import { Response } from '../../interfaces/response';
import { StreamsService } from './streams.service';

@Controller('/streams')
export class StreamsController {
  constructor(private streamsService: StreamsService) {}

  // @UseGuards(AuthGuard)
  // @HttpCode(200)
  // @Get('/')
  // async getStreams(
  //   @UserId() userId,
  //   @Query('before') before,
  //   @Query('after') after,
  //   @Query('limit') limit = 50,
  //   @Query('offset') offset = 0,
  // ): Promise<Response> {
  //   return {
  //     data: await this.streamsService.getStreams(
  //       userId,
  //       before,
  //       after,
  //       limit,
  //       offset,
  //     ),
  //   };
  // }

  // @UseGuards(AuthGuard)
  // @HttpCode(200)
  // @Get('/track/:trackId')
  // async getTrackStreams(
  //   @UserId() userId,
  //   @Param('trackId') trackId,
  //   @Query('before') before,
  //   @Query('after') after,
  //   @Query('limit') limit = 50,
  //   @Query('offset') offset = 0,
  // ): Promise<Response> {
  //   return {
  //     data: await this.streamsService.getTrackStreams(
  //       userId,
  //       trackId,
  //       before,
  //       after,
  //       limit,
  //       offset,
  //     ),
  //   };
  // }

  // @UseGuards(AuthGuard)
  // @HttpCode(200)
  // @Get('/track/:trackId/count')
  // async getTrackCount(
  //   @UserId() userId,
  //   @Param('trackId') trackId,
  //   @Query('before') before,
  //   @Query('after') after,
  // ): Promise<Response> {
  //   return {
  //     data: await this.streamsService.getTrackCount(
  //       userId,
  //       trackId,
  //       before,
  //       after,
  //     ),
  //   };
  // }

  // @UseGuards(AuthGuard)
  // @HttpCode(200)
  // @Get('/artist/:artistId')
  // async getArtistStreams(
  //   @UserId() userId,
  //   @Param('artistId') artistId,
  //   @Query('before') before,
  //   @Query('after') after,
  //   @Query('limit') limit = 50,
  //   @Query('offset') offset = 0,
  // ): Promise<Response> {
  //   return {
  //     data: await this.streamsService.getArtistStreams(
  //       userId,
  //       artistId,
  //       before,
  //       after,
  //       limit,
  //       offset,
  //     ),
  //   };
  // }
}
