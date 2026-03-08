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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  type VoiceAssistantIntent,
  type VoiceChatDto,
  type VoiceChatResponseDto,
  type VoiceChatSessionDto,
  type VoiceUserContext,
  type VoiceUserRole,
} from '@smart-retail-x/shared-types';
import type { Request } from 'express';

import { VoiceService } from './voice.service';

@ApiTags('Voice')
@Controller('v1/voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  private getUser(req: Request & { user?: { id?: string; email?: string; name?: string; role?: string } }) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Authenticated user is required');
    }

    return req.user;
  }

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

  @Get('chat/session')
  @ApiOperation({
    summary: 'Get chat session and history for authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Chat session retrieved successfully' })
  async getSession(
    @Req() req: Request & { user?: { id?: string; email?: string; name?: string; role?: string } },
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<VoiceChatSessionDto> {
    const user = this.getUser(req);
    return this.voiceService.getSession(user.id!, limit);
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
    if (!file?.buffer?.length && !dto.transcriptText?.trim()) {
      throw new BadRequestException('Either audio file or transcriptText is required');
    }

    const user = this.getUser(req);
    const resolvedRole = (dto.userRole || user.role || 'guest') as VoiceUserRole;
    const userContext: VoiceUserContext = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: resolvedRole,
    };
    const intents = this.parseIntents(dto.intents);

    return this.voiceService.chatWithAudio(file, dto, user.id!, userContext, intents);
  }

  @Post('chat/text')
  @ApiOperation({
    summary: 'Process text chat message and persist response',
    description: 'Accepts user text, forwards to agent, and stores user/assistant messages.',
  })
  @ApiResponse({ status: 201, description: 'Text chat processed successfully' })
  async chatText(
    @Body() dto: Partial<VoiceChatDto> & { text?: string },
    @Req() req: Request & { user?: { id?: string; email?: string; name?: string; role?: string } },
  ): Promise<VoiceChatResponseDto> {
    const user = this.getUser(req);
    const text = dto.text?.trim();
    if (!text) {
      throw new BadRequestException('text is required');
    }

    const resolvedRole = (dto.userRole || user.role || 'guest') as VoiceUserRole;
    const userContext: VoiceUserContext = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: resolvedRole,
    };
    const intents = this.parseIntents(dto.intents);

    return this.voiceService.chatWithText(text, dto, user.id!, userContext, intents);
  }
}
