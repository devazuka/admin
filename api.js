// POST /api
import { Customer, Visit, Payment, Product, Pass } from "./data.js"

export const GET_all = async ({ params, session }) =>
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


console.log(JSON.parse(
  JSON.stringify({
  customer: Customer,
  visit: Visit,
  payment: Payment,
  product: Product,
  pass: Pass,
}))
)
