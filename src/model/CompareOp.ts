export const CompareOp = {
  Lt: '<',
  Lte: '<=',
  Eq: '==',
  Neq: '!=',
  Gte: '>=',
  Gt: '>',
} as const

export type CompareOp = (typeof CompareOp)[keyof typeof CompareOp]

export const COMPARE_OP_LABELS: Record<CompareOp, string> = {
  '<': 'less than',
  '<=': 'less than or equal',
  '==': 'equals',
  '!=': 'not equals',
  '>=': 'greater than or equal',
  '>': 'greater than',
}

export const ALL_COMPARE_OPS: CompareOp[] = ['<', '<=', '==', '!=', '>=', '>']
