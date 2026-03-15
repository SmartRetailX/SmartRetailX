import {
  DistroResponseSchema,
  DistroTemplatesResponseSchema,
  TemplateSchema,
} from '@/schemas/response-validation/distro.schema';
import { Distro, DistroTemplate } from '@/types/distro';

export const mapTemplate = (apiTemplate: TemplateSchema): DistroTemplate => {
  return {
    id: apiTemplate._id,
    distroId: apiTemplate.distro,
    version: apiTemplate.version,
    columnMap: apiTemplate.columnMap,
    description: apiTemplate.description,
    currency: apiTemplate.currency,
    defaultCountry: apiTemplate.defaultCountry,
    defaultDsp: apiTemplate.defaultDsp,
    createdBy: apiTemplate.createdBy,
    createdAt: apiTemplate.createdAt,
    updatedBy: apiTemplate?.updatedBy,
    updatedAt: apiTemplate.updatedAt,
  };
};

export const mapTemplates = (apiTemplates: DistroTemplatesResponseSchema): DistroTemplate[] => {
  return apiTemplates.map(mapTemplate);
};

export const mapDistro = (apiDistro: DistroResponseSchema): Distro => {
  return {
    id: apiDistro._id,
    name: apiDistro.name,
    enabled: apiDistro.enabled ?? false,
    image: apiDistro.image,
    color: apiDistro.color,
    defaultTemplate: mapTemplate(apiDistro.template),
    description: apiDistro.description || 'No info available',
    lastImportedAt: apiDistro.lastImportedAt,
    createdBy: apiDistro.createdBy,
    updatedBy: apiDistro.updatedBy,
    createdAt: apiDistro.createdAt,
    updatedAt: apiDistro.updatedAt,
  };
};

export const mapDistros = (apiDistros: DistroResponseSchema[]): Distro[] => {
  return apiDistros.map(mapDistro);
};
