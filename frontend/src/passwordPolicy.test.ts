import { isStrongPassword, passwordPolicyHelper } from './passwordPolicy.js'

function assertEqual(actual: boolean, expected: boolean, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${actual}, want ${expected}`)
  }
}

assertEqual(isStrongPassword('ChangeMe123!'), true, 'strong password')
assertEqual(isStrongPassword('short1A'), false, 'short password')
assertEqual(isStrongPassword('lowercase123'), false, 'missing uppercase')
assertEqual(isStrongPassword('UPPERCASE123'), false, 'missing lowercase')
assertEqual(isStrongPassword('NoDigitsHere'), false, 'missing digit')

if (!passwordPolicyHelper.includes('10')) {
  throw new Error('password policy helper should mention length')
}
