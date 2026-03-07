import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DocsController } from './docs.controller';
import { SwaggerDocumentService } from './swagger-document.service';

@Module({
  imports: [AuthModule],
  controllers: [DocsController],
  providers: [SwaggerDocumentService],
  exports: [SwaggerDocumentService],
})
export class DocsModule {}
