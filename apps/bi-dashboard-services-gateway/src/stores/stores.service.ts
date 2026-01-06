import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  async getStores(query: any) {
    const { active, city } = query;
    const where: any = {};

    if (active !== undefined && active !== 'undefined') {
      where.active = active === 'true' || active === true;
    }
    if (city && city !== 'undefined') {
      where.city = { contains: city, mode: 'insensitive' };
    }

    const stores = await this.prisma.store.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: {
        stores: stores.map(s => ({
          id: s.id,
          name: s.name,
          nameSi: s.nameSi,
          address: s.address,
          city: s.city,
          phone: s.phone,
          manager: s.manager,
          active: s.active,
          openingHours: s.openingHours,
          latitude: s.latitude,
          longitude: s.longitude,
          createdAt: s.createdAt,
        })),
      },
    };
  }
}
