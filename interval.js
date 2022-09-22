// execute action immediatly, then repeate in the given interval
// retry on failer with exponential backoff
export const intervalRetry = (fn, delay) => {
  let pending
  const retry = count => (pending = fn()
    .catch(async err => {
      await new Promise(s => setTimeout(s, (count ** 2) * 1000))
      return retry(count + 1)
    })
    .finally(() => pending = undefined)
  )
  setInterval(() => pending || retry(0), delay)
  return retry(0)
}
