import {
  ExpenseCategoriesApiResponse,
  ExpenseCategoryApiResponse,
} from '@/schemas/response-validation/expense-category.response';
import { ExpenseCategory } from '@/types/expense';

function mapUserRef(
  ref: { _id: string; email?: string; name?: string } | string | undefined | null,
) {
  if (!ref) return undefined;
  if (typeof ref === 'string') return { id: ref, email: '' };
  return { id: ref._id, email: ref.email ?? '' };
}

export function mapExpenseCategory(raw: ExpenseCategoryApiResponse): ExpenseCategory {
  return {
    id: raw._id,
    name: raw.name,
    description: raw.description,
    color: raw.color,
    createdBy: mapUserRef(raw.createdBy),
    updatedBy: mapUserRef(raw.updatedBy),
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
  };
}

export function mapExpenseCategories(raw: ExpenseCategoriesApiResponse): ExpenseCategory[] {
  return raw.map(mapExpenseCategory);
}
