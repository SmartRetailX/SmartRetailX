import { Inject, Injectable, Logger } from '@nestjs/common';
import type { VoiceChatResponseDto } from '@smart-retail-x/shared-types';

import {
  VOICE_CAPABILITIES,
  type VoiceCapability,
  type VoiceCapabilityContext,
  type VoiceCapabilityMode,
} from './voice-capability.interface';

@Injectable()
export class VoiceCapabilityDispatcherService {
  private readonly logger = new Logger(VoiceCapabilityDispatcherService.name);
  private readonly sortedCapabilities: readonly VoiceCapability[];

  constructor(@Inject(VOICE_CAPABILITIES) capabilities: VoiceCapability[]) {
    this.sortedCapabilities = [...capabilities].sort((a, b) => a.priority - b.priority);
  }

  async dispatch(context: VoiceCapabilityContext, mode: VoiceCapabilityMode): Promise<VoiceChatResponseDto | null> {
    for (const capability of this.sortedCapabilities) {
      const result = await capability.handle(context, mode);
      if (!result) {
        continue;
      }

      this.logger.debug(`Capability matched: ${capability.id} (${mode})`);
      return result;
    }

    return null;
  }
}
