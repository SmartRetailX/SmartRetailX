import {
  BadRequestException,
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  type VoiceChatInputMode,
  type VoiceChatSessionDto,
  type VoiceLanguageCode,
} from '@smart-retail-x/shared-types';
import type { Request } from 'express';

import { VoiceService } from './voice.service';

@ApiTags('Voice')
@Controller('v1/voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  private getUser(
    req: Request & { user?: { id?: string; email?: string; name?: string; role?: string } },
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Authenticated user is required');
    }
    return req.user;
  }

  @Get('chat/session')
  @ApiOperation({ summary: 'Get chat session and history for authenticated user' })
  @ApiResponse({ status: 200, description: 'Chat session retrieved successfully' })
  async getSession(
    @Req() req: Request & { user?: { id?: string; email?: string; name?: string; role?: string } },
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<VoiceChatSessionDto> {
    const user = this.getUser(req);
    return this.voiceService.getSession(user.id!, limit);
  }

  @Post('chat/exchange')
  @ApiOperation({ summary: 'Persist a completed voice/text exchange to the chat history' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['channel', 'language', 'userText', 'assistantText'],
      properties: {
        channel: { type: 'string', enum: ['voice', 'text'] },
        language: { type: 'string', example: 'si-LK' },
        userText: { type: 'string' },
        assistantText: { type: 'string' },
        transcription: { type: 'string' },
        userAudioUrl: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Exchange persisted successfully' })
  async saveExchange(
    @Req() req: Request & { user?: { id?: string; email?: string; name?: string; role?: string } },
    @Body()
    body: {
      channel?: string;
      language?: string;
      userText?: string;
      assistantText?: string;
      transcription?: string;
      userAudioUrl?: string | null;
    },
  ): Promise<{ ok: boolean }> {
    const user = this.getUser(req);

    const channel = (body.channel === 'voice' ? 'voice' : 'text') as VoiceChatInputMode;
    const language = (body.language?.trim() || 'si-LK') as VoiceLanguageCode;
    const userText = body.userText?.trim() ?? '';
    const assistantText = body.assistantText?.trim() ?? '';

    if (!userText && !assistantText) {
      throw new BadRequestException('userText or assistantText is required');
    }

    await this.voiceService.saveExchange({
      userId: user.id!,
      channel,
      language,
      userText,
      assistantText,
      transcription: body.transcription?.trim(),
      userAudioUrl: body.userAudioUrl ?? null,
    });

    return { ok: true };
  }
}
