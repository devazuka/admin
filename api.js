import { Customer, Visit, Payment, Product } from "./data.js"
import { R } from './response.js'

// GET /api/all
export const GET_api_all = async ({ params, session }) =>
  new R(
    JSON.stringify({
      customer: Customer,
      visit: Visit,
      payment: Payment,
      product: Product,
    }),
    { headers: { "content-type": "application/json" } }
  )
