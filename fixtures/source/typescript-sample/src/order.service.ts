export class OrderService {
  async completeCheckout(userId: number) {
    return {
      userId,
      status: "paid",
      totalAmount: 100
    };
  }
}
