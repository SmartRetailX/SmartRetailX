export const RoyaltyImportTemplateHeaders: {
  name: string;
  type: string;
  required: boolean;
}[] = [
  {
    name: 'ISRC',
    type: 'isrc',
    required: false,
  },
  {
    name: 'UPC',
    type: 'upc',
    required: false,
  },
  {
    name: 'Title',
    type: 'title',
    required: false,
  },
  {
    name: 'Release Title',
    type: 'releaseTitle',
    required: false,
  },
  {
    name: 'Mix',
    type: 'mix',
    required: false,
  },
  {
    name: 'Catalog No',
    type: 'catalogNo',
    required: false,
  },
  {
    name: 'Artist',
    type: 'artist',
    required: false,
  },
  {
    name: 'Earnings',
    type: 'earnings',
    required: true,
  },
  {
    name: 'Retailer',
    type: 'dsp',
    required: false,
  },
  {
    name: 'Country Code',
    type: 'countryCode',
    required: false,
  },
  {
    name: 'Streams',
    type: 'streams',
    required: false,
  },
  {
    name: 'Downloads',
    type: 'downloads',
    required: false,
  },
  {
    name: 'Creations',
    type: 'creations',
    required: false,
  },
  {
    name: 'Sales',
    type: 'sales',
    required: false,
  },
];
