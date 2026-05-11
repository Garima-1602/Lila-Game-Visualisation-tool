import fs from 'fs/promises'
import path from 'path'

const cwd = process.cwd()
const target = path.resolve(cwd, 'player_data')
const sourceArg = process.argv[2]

const candidates = []
if (sourceArg) {
  candidates.push(path.resolve(cwd, sourceArg))
}
candidates.push(path.resolve(cwd, '../../player_data'))
candidates.push(path.resolve(cwd, '../../player_data (1)'))
candidates.push(path.resolve(cwd, '../../player_data (1)/player_data'))
candidates.push(path.resolve(cwd, '../player_data'))
candidates.push(path.resolve(cwd, '../player_data (1)'))
candidates.push(path.resolve(cwd, '../player_data (1)/player_data'))

async function exists(pathToCheck) {
  try {
    await fs.access(pathToCheck)
    return true
  } catch {
    return false
  }
}

async function main() {
  for (const source of candidates) {
    if (await exists(source)) {
      console.log(`Syncing player data from ${source}`)
      await fs.rm(target, { recursive: true, force: true })
      await fs.cp(source, target, { recursive: true })
      console.log(`Player data synced to ${target}`)
      return
    }
  }

  console.error('No player_data source folder found.')
  console.error('Checked these locations:')
  for (const source of candidates) {
    console.error(`  ${source}`)
  }
  process.exit(1)
}

main().catch((error) => {
  console.error('Failed to sync player data:', error)
  process.exit(1)
})
