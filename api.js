import { getById } from './atoms.js'
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

// GET /api/customer/merge
export const GET_api_customer_merge = async ({ params }) => {
  const source = getById(params.get('source'))
  const target = getById(params.get('target'))
  if (!Customer.is(source) || !Customer.is(target)) {
    throw Error('both source & target must be Customers')
  }
  source.update({ alias: target._id })
}
