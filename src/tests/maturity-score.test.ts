import test from 'node:test'
import assert from 'node:assert/strict'
import './setup'
import { calculateMaturityScore } from '../lib/ai/maturity-score'

test('Maturity Score & Star Rating Calculator', async (t) => {
  await t.test('calculates 5-star rating for enterprise mature / won leads', () => {
    const result = calculateMaturityScore({
      status: 'won',
      leadQuality: 'hot',
      urgency: 'high',
      sentiment: 'positive',
      lead: {
        name: 'Jane Doe',
        email: 'jane@enterprise.com',
        phone: '+1-555-0199',
        company: 'Acme Corp',
        purpose: 'Enterprise voice deployment',
      },
      messageCount: 12,
    })

    assert.equal(result.score, 5)
    assert.equal(result.stars, 5)
    assert.ok(result.points >= 6.5)
    assert.equal(result.label, 'Enterprise Mature')
  })

  await t.test('calculates 4-star rating for high intent sales-ready leads', () => {
    const result = calculateMaturityScore({
      status: 'qualified',
      leadQuality: 'warm',
      urgency: 'high',
      sentiment: 'positive',
      lead: {
        name: 'John Smith',
        email: 'john@startup.io',
      },
      messageCount: 3,
    })

    assert.equal(result.score, 4)
    assert.equal(result.stars, 4)
    assert.ok(result.points >= 4.5 && result.points < 6.5)
    assert.equal(result.label, 'High Intent / Sales Ready')
  })

  await t.test('calculates 3-star rating for qualified prospects', () => {
    const result = calculateMaturityScore({
      status: 'reviewing',
      leadQuality: 'warm',
      urgency: 'medium',
      sentiment: 'neutral',
      lead: {
        name: 'Alex Rivera',
        email: 'alex@work.com',
      },
      messageCount: 2,
    })

    assert.equal(result.score, 3)
    assert.equal(result.stars, 3)
    assert.ok(result.points >= 3.0 && result.points < 4.5)
    assert.equal(result.label, 'Qualified Prospect')
  })

  await t.test('calculates 2-star rating for active discovery leads', () => {
    const result = calculateMaturityScore({
      status: 'contacted',
      leadQuality: 'warm',
      urgency: 'low',
      sentiment: 'neutral',
      lead: {
        email: 'visitor@unknown.com',
      },
      messageCount: 2,
    })

    assert.equal(result.score, 2)
    assert.equal(result.stars, 2)
    assert.ok(result.points >= 1.5 && result.points < 3.0)
    assert.equal(result.label, 'Active Discovery')
  })

  await t.test('calculates 1-star rating for initial cold inquiries', () => {
    const result = calculateMaturityScore({
      status: 'new',
      leadQuality: 'cold',
      urgency: 'low',
      sentiment: 'negative',
      lead: {},
      messageCount: 1,
    })

    assert.equal(result.score, 1)
    assert.equal(result.stars, 1)
    assert.ok(result.points < 1.5)
    assert.equal(result.label, 'Initial Inquiry')
  })

  await t.test('handles empty inputs without throwing and clamps minimum score to 1', () => {
    const result = calculateMaturityScore({})

    assert.equal(result.score, 1)
    assert.equal(result.stars, 1)
    assert.equal(result.label, 'Initial Inquiry')
  })
})
