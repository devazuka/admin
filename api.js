import { Customer, Visit, Payment, Product, Pass } from "./data.js"

// GET /api/all
export const GET_api_all = async ({ params, session }) =>
  new R(
    JSON.stringify({
      customer: Customer,
      visit: Visit,
      payment: Payment,
      product: Product,
      pass: Pass,
    }),
    { headers: { "content-type": "application/json" } }
  )
