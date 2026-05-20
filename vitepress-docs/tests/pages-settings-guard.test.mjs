import assert from 'node:assert/strict'
import test from 'node:test'

import { collectPagesDeploymentIssues } from '../scripts/verify-pages-config.mjs'

test('feature branch reports legacy Pages mode and missing preview branch policy', () => {
  const issues = collectPagesDeploymentIssues({
    branchName: 'feature/daily-public-fetch-pilot',
    pagesSite: {
      build_type: 'legacy',
      source: {
        branch: 'main',
        path: '/docs'
      }
    },
    environmentPolicies: {
      'github-pages': ['main']
    }
  })

  assert.deepEqual(issues, [
    'GitHub Pages build_type 当前为 legacy（source: main:/docs），必须切换为 workflow。',
    '环境 github-pages-preview 缺少允许 feature/* 的 deployment branch policy。'
  ])
})

test('lab branch reports missing lab branch policy on github-pages environment', () => {
  const issues = collectPagesDeploymentIssues({
    branchName: 'lab',
    pagesSite: {
      build_type: 'workflow',
      source: {
        branch: 'main',
        path: '/docs'
      }
    },
    environmentPolicies: {
      'github-pages': ['main']
    }
  })

  assert.deepEqual(issues, ['环境 github-pages 缺少允许 lab 的 deployment branch policy。'])
})

test('configured repository passes the guard for supported branches', () => {
  const environmentPolicies = {
    'github-pages': ['main', 'lab'],
    'github-pages-preview': ['feature/*']
  }

  assert.deepEqual(
    collectPagesDeploymentIssues({
      branchName: 'main',
      pagesSite: {
        build_type: 'workflow',
        source: {
          branch: 'main',
          path: '/docs'
        }
      },
      environmentPolicies
    }),
    []
  )

  assert.deepEqual(
    collectPagesDeploymentIssues({
      branchName: 'lab',
      pagesSite: {
        build_type: 'workflow',
        source: {
          branch: 'main',
          path: '/docs'
        }
      },
      environmentPolicies
    }),
    []
  )

  assert.deepEqual(
    collectPagesDeploymentIssues({
      branchName: 'feature/daily-public-fetch-pilot',
      pagesSite: {
        build_type: 'workflow',
        source: {
          branch: 'main',
          path: '/docs'
        }
      },
      environmentPolicies
    }),
    []
  )
})