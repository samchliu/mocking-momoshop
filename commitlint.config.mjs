/**
 * Conventional commits + one SDD rule:
 * `feat` / `fix` must reference the knowledge they implement (REQ / BR / ADR / ARCH / API / OPS),
 * e.g. `feat(search): sort results by price (REQ-001#AC2, BR-002#R3)`.
 */
const KNOWLEDGE_ID = /\b(REQ|BR|ADR|ARCH|API|OPS|CR)-\d{3}\b/

const config = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'knowledge-reference': ({ type, header, body, footer }) => {
          if (!['feat', 'fix'].includes(type ?? '')) return [true]
          const text = [header, body, footer].filter(Boolean).join('\n')
          return [
            KNOWLEDGE_ID.test(text),
            'feat/fix commits must reference a knowledge ID, e.g. (REQ-001#AC2) or (BR-002#R5)',
          ]
        },
      },
    },
  ],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'scope-empty': [0],
    // 中文 commit message 沒有大小寫概念，開著會被誤判
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
    'knowledge-reference': [2, 'always'],
  },
}

export default config
