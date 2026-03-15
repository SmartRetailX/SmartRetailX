import { MergePreviewResponse } from '@/schemas/response-validation/payee-merge.schema';
import { PayeeMergePreview } from '@/types/payee';

export function mapPayeeMergePreview(response: MergePreviewResponse): PayeeMergePreview {
  return {
    masterPayee: {
      id: response.masterPayee.id,
      name: response.masterPayee.name,
      email: response.masterPayee.email || 'Not provided',
      type: response.masterPayee.type,
      image: response.masterPayee.image,
      address: response.masterPayee.paymentInfo?.address || {},
      preferredCurrency: response.masterPayee.paymentInfo?.preferredCurrency,
      aliases: response.masterPayee.aliases,
      contractsCount: response.masterPayee.contractsCount,
      totalRemainingObligations: response.masterPayee.totalRemainingObligations || 0,
      payableRoyalties: response.masterPayee.payableRoyalties || 0,
    },
    mergePayee: {
      id: response.mergePayee.id,
      name: response.mergePayee.name,
      email: response.mergePayee.email || 'Not provided',
      type: response.mergePayee.type,
      image: response.mergePayee.image,
      address: response.mergePayee.paymentInfo?.address || {},
      preferredCurrency: response.mergePayee.paymentInfo?.preferredCurrency,
      aliases: response.mergePayee.aliases,
      contractsCount: response.mergePayee.contractsCount,
      totalRemainingObligations: response.mergePayee.totalRemainingObligations || 0,
      payableRoyalties: response.mergePayee.payableRoyalties || 0,
    },
    impact: {
      contracts: response.impact.contractsToUpdate.map((contract) => ({
        id: contract.id,
        isrc: contract.isrc,
        label: {
          id: contract.label._id,
          name: contract.label.name,
        },
        payeeCount: contract.payeeCount,
        releaseDate: contract.releaseDate,
        releaseTitle: contract.releaseTitle,
        upc: contract.upc,
        image: contract.image,
      })),
      expenses: response.impact.expensesToUpdate.map((expenseItem) => ({
        expense: {
          id: expenseItem.expense._id,
          amount: expenseItem.expense.amount,
          payee: {
            id: expenseItem.expense.payee._id,
            email: expenseItem.expense.payee.email,
            name: expenseItem.expense.payee.name,
          },
          label: {
            id: expenseItem.expense.label._id,
            name: expenseItem.expense.label.name,
          },
          reference: expenseItem.expense.reference || 'No reference',
          status: expenseItem.expense.status,
        },
        totalOwed: expenseItem.totalOwed,
        totalPaid: expenseItem.totalPaid,
        remainingAmount: expenseItem.remainingAmount,
      })),
      totalRemainingObligations: response.impact.totalRemainingObligations,
      linkedPayeesCount: response.impact.linkedPayeesCount,
    },
  };
}
