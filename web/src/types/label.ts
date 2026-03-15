export interface Label {
  _id: string;
  name: string;
  createdBy: {
    firstName: string;
    lastName: string;
    email: string;
    createdAt: Date;
  };
  updatedBy: {
    firstName: string;
    lastName: string;
    email: string;
    createdAt: Date;
  };
}
