import { providerCheckConnection } from '../services/providerClient.js'

async function main() {
  try {
    const res = await providerCheckConnection()
    console.log('PROVIDER_CHECK_RESULT:')
    console.log(JSON.stringify(res, null, 2))
  } catch (err) {
    console.error('PROVIDER_CHECK_ERROR:')
    console.error(err && err.message ? `${err.message}` : String(err))
    if (err && err.payload) console.error('payload:', JSON.stringify(err.payload, null, 2))
    process.exit(1)
  }
}

main()
