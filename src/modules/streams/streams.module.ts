import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { AuthModule } from '../auth/auth.module';
import { StreamsController } from './streams.controller';
import { StreamsService } from './streams.service';

@Module({
  imports: [
    // AuthModule,
    ElasticsearchModule.register({
      node: process.env.ELASTIC_URL,
    }),
  ],
  controllers: [StreamsController],
  providers: [StreamsService],
})
export class StreamsModule {}
