import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const indexPath = path.join(__dirname, '../src/pages/personas/index.tsx')

let content = fs.readFileSync(indexPath, 'utf8')

// Remove agentLog function block
content = content.replace(
  /  function agentLog\([\s\S]*?    \/\/ #endregion\n  \}\n\n/g,
  '',
)

// Remove agentLog(...) calls (multiline)
content = content.replace(/\n\s*agentLog\(\{[\s\S]*?\}\)\n/g, '\n')

// Remove inline debug fetch to ingest server
content = content.replace(
  /\n\s*fetch\('http:\/\/127\.0\.0\.1:7743\/ingest\/[^']+',\{[\s\S]*?\}\)\.catch\(\(\)=>\{\}\);?\n/g,
  '\n',
)
content = content.replace(
  /\n\s*fetch\('http:\/\/127\.0\.0\.1:7743\/ingest\/[^']+', \{[\s\S]*?\}\)\.catch\(\(\) => \{\}\)\n/g,
  '\n',
)

// Remove #region agent log comment lines
content = content.replace(/\s*\/\/ #region agent log\n/g, '')
content = content.replace(/\s*\/\/ #endregion\n/g, '')

fs.writeFileSync(indexPath, content)
console.log('Cleaned debug from index.tsx')
