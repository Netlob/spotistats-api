import { Module } from '@nestjs/common';
import { StreamsModule } from '../streams/streams.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [StreamsModule],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
