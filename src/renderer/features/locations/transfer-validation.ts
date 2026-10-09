/** Never authorize a transfer with an unresolved or refreshing origin balance. */
export function canTransferQuantity(quantity: number | null, balance: { data?: number | undefined; isFetching?: boolean; isError?: boolean } | undefined): boolean {
  return quantity !== null && Number.isInteger(quantity) && quantity > 0 && !!balance && !balance.isFetching && !balance.isError && balance.data !== undefined && quantity <= balance.data;
}
