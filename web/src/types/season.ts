export interface Season {
  _id: string;
  name: string;
  dateRange: {
    from: Date;
    to: Date | null;
  };
  closed?: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
