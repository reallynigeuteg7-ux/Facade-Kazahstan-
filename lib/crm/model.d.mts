export type CleanLead = {
  name: string;
  phone: string;
  product: string;
  size: string;
  quantity: string;
  finish: string;
  drawing: string;
  city: string;
  deadline: string;
  next_action: string;
  due_date: string;
  stage: string;
  amount: number;
  drawing_spec?: string;
  search_text: string;
  [key: string]: string | number | undefined;
};
export const stages: Array<{ id: string; label: string; color: string }>;
export function cleanLead(input: unknown): CleanLead;
export function fromAnswers(
  answers: unknown,
  drawingSpec?: unknown,
): CleanLead & { drawing_spec: string };
export function validRequestId(id: unknown): id is string;
