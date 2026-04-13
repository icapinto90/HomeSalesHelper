import { buildApp } from './app'
import { env } from './config/env'
import { logger } from './utils/logger'

async function main(): Promise<void> {
  const app = await buildApp()
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  logger.info(`Server listening on port ${env.PORT}`)
}

main().catch((err) => {
  logger.error(err, 'Fatal startup error')
  process.exit(1)
})
