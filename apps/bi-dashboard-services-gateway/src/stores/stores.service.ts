import { Injectable } from '@nestjs/common';

@Injectable()
export class StoresService {
  async getStores(_query: any) {
    return {
      success: true,
      data: { stores: [] },
    };
  }
}
