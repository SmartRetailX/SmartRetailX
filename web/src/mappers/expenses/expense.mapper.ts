import {
  ExpenseDetailResponse,
  ExpenseListItemResponse,
} from '@/schemas/expenses/expense.response';
import { Expense, ExpenseListItem } from '@/types/expense';
import { Label } from '@/types/label';
import { Payee } from '@/types/payee';

export const mapExpenseListItem = (data: ExpenseListItemResponse): ExpenseListItem => {
  return {
    _id: data._id,
    amount: data.amount,
    dateReceived: data.dateReceived ? new Date(data.dateReceived) : undefined,
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
    reference: data.reference || undefined,
    status: data.status,
    payeeName: data.payeeName,
    labelName: data.labelName,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    category: {
      id: data.category._id,
      name: data.category.name,
      description: data.category.description,
      color: data.category.color,
      createdBy:
        typeof data.category.createdBy === 'string'
          ? { id: data.category.createdBy, email: '' }
          : { id: data.category.createdBy._id, email: data.category.createdBy.email },
      updatedBy: data.category.updatedBy
        ? typeof data.category.updatedBy === 'string'
          ? { id: data.category.updatedBy, email: '' }
          : { id: data.category.updatedBy._id, email: data.category.updatedBy.email }
        : undefined,
      createdAt: new Date(data.category.createdAt),
      updatedAt: new Date(data.category.updatedAt),
    },
    payee: data.payee,
    label: data.label,
    items: data.items,
  };
};

export const mapExpenseDetail = (data: ExpenseDetailResponse): Expense => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapPayee = (payeeData: any): Payee => ({
    ...payeeData,
    createdAt: new Date(payeeData.createdAt || new Date()),
    updatedAt: new Date(payeeData.updatedAt || new Date()),
    image: payeeData.image || '',
    meta: payeeData.meta || {},
    internalPayee: payeeData.internalPayee || false,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapLabel = (labelData: any): Label => ({
    ...labelData,
    createdAt: new Date(labelData.createdAt || new Date()),
    updatedAt: new Date(labelData.updatedAt || new Date()),
    createdBy:
      typeof labelData.createdBy === 'string'
        ? {
            firstName: '',
            lastName: '',
            email: '',
            createdAt: new Date(),
          }
        : labelData.createdBy,
    updatedBy:
      typeof labelData.updatedBy === 'string'
        ? {
            firstName: '',
            lastName: '',
            email: '',
            createdAt: new Date(),
          }
        : labelData.updatedBy,
  });

  return {
    _id: data._id,
    amount: data.amount,
    dateReceived: data.dateReceived ? new Date(data.dateReceived) : undefined,
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
    reference: data.reference || undefined,
    status: data.status,
    payeeName: data.payeeName,
    labelName: data.labelName,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    category: {
      id: data.category._id,
      name: data.category.name,
      description: data.category.description,
      color: data.category.color,
      createdBy:
        typeof data.category.createdBy === 'string'
          ? { id: data.category.createdBy, email: '' }
          : { id: data.category.createdBy._id, email: data.category.createdBy.email },
      updatedBy: data.category.updatedBy
        ? typeof data.category.updatedBy === 'string'
          ? { id: data.category.updatedBy, email: '' }
          : { id: data.category.updatedBy._id, email: data.category.updatedBy.email }
        : undefined,
      createdAt: new Date(data.category.createdAt),
      updatedAt: new Date(data.category.updatedAt),
    },
    payee: mapPayee(data.payee),
    label: mapLabel(data.label),
    items: data.items.map((item) => ({
      contract: item.contract,
      amount: item.amount,
      details: item.details,
      payees: item.payees.map((p) => ({
        payee: mapPayee(p.payee),
        amount: p.amount,
        rule:
          p.rules && p.rules[0]
            ? {
                value: p.rules[0].value,
              }
            : { value: 0 },
        condition: p.condition,
      })),
    })),
    createdBy: data.createdBy,
    updatedBy: { _id: '', email: '' },
  } as unknown as Expense;
};
