export interface DistroTemplate {
  id: string;
  distroId: string;
  version: number;
  columnMap: Record<string, string>; // Maps field names to column-header format (e.g., "M-Optional ISRC")
  description?: string;
  currency?: string;
  defaultCountry?: string;
  defaultDsp?: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface Distro {
  id: string;
  name: string;
  image?: string;
  defaultTemplate: DistroTemplate;
  color?: string;
  description?: string;
  enabled: boolean;
  lastImportedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

// Distro without populated defaultTemplate
export interface DistroWithoutTemplate extends Omit<Distro, 'defaultTemplate'> {
  defaultTemplate: string;
}
