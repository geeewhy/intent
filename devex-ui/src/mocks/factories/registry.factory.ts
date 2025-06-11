// devex-ui/src/mocks/factories/registry.factory.ts

export function makeCommandRegistry() {
  return [
    {
      type: "CreateUser",
      domain: "user",
      description: "Creates a new user in the system",
      schema: {
        type: "object",
        title: "CreateUser",
        properties: {
          userId: { type: "string" },
          email: { type: "string", format: "email" },
          name: { type: "string" }
        },
        required: ["userId", "email"]
      }
    },
    {
      type: "PlaceOrder",
      domain: "order",
      description: "Places a new order",
      schema: {
        type: "object",
        title: "PlaceOrder",
        properties: {
          orderId: { type: "string" },
          userId: { type: "string" },
          total: { type: "number" }
        },
        required: ["orderId", "userId"]
      }
    },
    {
      type: "ProcessPayment",
      domain: "payment",
      description: "Processes a payment for an order",
      schema: {
        type: "object",
        title: "ProcessPayment",
        properties: {
          paymentId: { type: "string" },
          orderId: { type: "string" },
          amount: { type: "number" }
        },
        required: ["paymentId", "orderId"]
      }
    },
    {
      type: "UpdateUser",
      domain: "user",
      description: "Updates user details",
      schema: {
        type: "object",
        title: "UpdateUser",
        properties: {
          userId: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" }
        },
        required: ["userId"]
      }
    },
    {
      type: "CreateProduct",
      domain: "catalog",
      description: "Creates a new product",
      schema: {
        type: "object",
        title: "CreateProduct",
        properties: {
          productId: { type: "string" },
          name: { type: "string" },
          price: { type: "number" }
        },
        required: ["productId", "name"]
      }
    },
    {
      type: "CancelOrder",
      domain: "order",
      description: "Cancels an existing order",
      schema: {
        type: "object",
        title: "CancelOrder",
        properties: {
          orderId: { type: "string" },
          reason: { type: "string" }
        },
        required: ["orderId"]
      }
    },
    {
      type: "ProcessRefund",
      domain: "payment",
      description: "Processes a refund for a payment",
      schema: {
        type: "object",
        title: "ProcessRefund",
        properties: {
          refundId: { type: "string" },
          paymentId: { type: "string" },
          amount: { type: "number" }
        },
        required: ["refundId", "paymentId"]
      }
    },
    {
      type: "UpdateInventory",
      domain: "inventory",
      description: "Updates inventory levels for a product",
      schema: {
        type: "object",
        title: "UpdateInventory",
        properties: {
          productId: { type: "string" },
          quantity: { type: "number" }
        },
        required: ["productId"]
      }
    }
  ];
}