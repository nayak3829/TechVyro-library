const POPCOUNT = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4] as const

export function simhashSimilarity(left: string, right: string): number {
  if (left.length !== right.length || !/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) return 0
  let differingBits = 0
  for (let index = 0; index < left.length; index++) {
    differingBits += POPCOUNT[Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16)]
  }
  return 1 - differingBits / (left.length * 4)
}