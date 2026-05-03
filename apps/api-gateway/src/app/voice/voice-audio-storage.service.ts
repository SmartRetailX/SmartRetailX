import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@smart-retail-x/config';
import { createHash } from 'crypto';

@Injectable()
export class VoiceAudioStorageService {
  private readonly logger = new Logger(VoiceAudioStorageService.name);

  constructor(private readonly configService: ConfigService) {}

  async uploadVoiceAudio(params: {
    buffer: Buffer;
    mimeType?: string;
    userId: string;
    sessionId: string;
  }): Promise<string | null> {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      return null;
    }

    try {
      const mimeType = params.mimeType || 'audio/webm';
      const dataUri = `data:${mimeType};base64,${params.buffer.toString('base64')}`;
      const publicId = `voice/${params.userId}/${params.sessionId}/${Date.now()}`;
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signatureBase = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = createHash('sha1').update(signatureBase).digest('hex');
      const body = new URLSearchParams({
        file: dataUri,
        api_key: apiKey,
        timestamp,
        signature,
        public_id: publicId,
        resource_type: 'video',
      });

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        },
      );

      if (!response.ok) {
        const reason = await response.text();
        this.logger.warn(`Cloudinary upload failed: HTTP ${response.status} ${reason}`);
        return null;
      }

      const payload = (await response.json()) as { secure_url?: string };
      return payload.secure_url || null;
    } catch (error) {
      this.logger.warn(`Cloudinary upload error: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}
