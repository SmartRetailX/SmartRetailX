import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  type VoiceAssistantIntent,
  type VoiceChatDto,
  type VoiceChatResponseDto,
  type VoiceUserContext,
  type VoiceUserRole,
} from '@smart-retail-x/shared-types';
import type { Request } from 'express';

import { VoiceService } from './voice.service';

@ApiTags('Voice')
@Controller('v1/voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  private parseIntents(rawIntents: unknown): VoiceAssistantIntent[] {
    if (Array.isArray(rawIntents)) {
      return rawIntents as VoiceAssistantIntent[];
    }

    if (typeof rawIntents === 'string' && rawIntents.trim().length > 0) {
      return rawIntents
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean) as VoiceAssistantIntent[];
    }

    return ['offers', 'order_history', 'buying_suggestions', 'prices', 'product_search'];
  }

  @Post('chat')
  @ApiOperation({
    summary: 'Process Sinhala voice chat',
    description:
      'Accepts audio via multipart/form-data, transcribes with Whisper, and returns Sinhala AI response.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['audio'],
      properties: {
        audio: { type: 'string', format: 'binary' },
        language: { type: 'string', example: 'si-LK', default: 'si-LK' },
        sessionId: { type: 'string', example: 'session-123' },
        userId: { type: 'string', example: 'user-123' },
        userRole: { type: 'string', example: 'customer' },
        transcriptText: { type: 'string', example: 'මට සිංහල පිළිබඳව විස්තර ලබා දෙන්න' },
        intents: {
          type: 'string',
          example: 'offers,order_history,buying_suggestions,prices,product_search',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Voice chat processed successfully' })
  @UseInterceptors(FileInterceptor('audio'))
  async chat(
    @UploadedFile() file: { buffer: Buffer; mimetype?: string } | undefined,
    @Body() dto: Partial<VoiceChatDto>,
    @Req() req: Request & { user?: { id?: string; email?: string; name?: string; role?: string } },
  ): Promise<VoiceChatResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Audio file is required');
    }

    const resolvedRole = (dto.userRole || req.user?.role || 'guest') as VoiceUserRole;
    const userContext: VoiceUserContext = {
      id: dto.userId || req.user?.id,
      email: req.user?.email,
      name: req.user?.name,
      role: resolvedRole,
    };
    const intents = this.parseIntents(dto.intents);

    return this.voiceService.chatWithAudio(file, dto, userContext, intents);
  }
}
