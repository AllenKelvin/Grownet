// Sync the service catalog from the provider so the app has data to show on first load.

import { syncServices } from '../controllers/catalogController.js'
import { PROVIDER_API_TYPE } from '../config/index.js'

export async function seedDatabase() {
  try {
    // Sync services (idempotent) for whichever provider type is configured.
    await syncServices(
      { body: {} },
      { json: () => {}, status: () => ({ json: () => {} }) },
    )
    console.log('[seed] services synced')
  } catch (err) {
    console.warn('[seed] seed skipped:', err.message)
  }
}
