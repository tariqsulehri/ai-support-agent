import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  extractLead,
  stripLead,
  stripEndCall,
  displayText,
  hasRequiredLead,
  userWantsToEnd,
  assistantClosed,
} from '../lib/ai/lead-tokens'

describe('Lead Token Parser & Sanitizer', () => {
  it('extracts complete lead object from assistant token', () => {
    const raw =
      'Thank you! [LEAD:{"name":"Alice Smith","email":"alice@example.com","phone":"+1234567890","company":"Acme Inc","country":"United States","purpose":"Customer support"}]'
    const lead = extractLead(raw)

    assert.ok(lead)
    assert.equal(lead.name, 'Alice Smith')
    assert.equal(lead.email, 'alice@example.com')
    assert.equal(lead.phone, '+1234567890')
    assert.equal(lead.company, 'Acme Inc')
    assert.equal(lead.country, 'United States')
  })

  it('normalizes string "null" values to actual nulls', () => {
    const raw = '[LEAD:{"name":"Bob","email":"null","phone":null,"company":"","country":"UK"}]'
    const lead = extractLead(raw)

    assert.ok(lead)
    assert.equal(lead.name, 'Bob')
    assert.equal(lead.email, null)
    assert.equal(lead.phone, null)
    assert.equal(lead.company, null)
    assert.equal(lead.country, 'UK')
  })

  it('strips lead and end-call tokens for clean user display', () => {
    const raw = '[END_CALL] Thank you for calling us! Have a wonderful day. [LEAD:{"name":"Test"}]'
    const withoutLead = stripLead(raw)
    assert.ok(!withoutLead.includes('[LEAD:'))
    assert.ok(withoutLead.includes('[END_CALL]'))

    const withoutEndCall = stripEndCall(raw)
    assert.ok(!withoutEndCall.includes('[END_CALL]'))
    assert.ok(withoutEndCall.includes('[LEAD:'))

    const clean = displayText(raw)
    assert.equal(clean, 'Thank you for calling us! Have a wonderful day.')
    assert.ok(!clean.includes('[END_CALL]'))
    assert.ok(!clean.includes('[LEAD:'))
  })

  it('correctly checks required lead completeness', () => {
    assert.equal(
      hasRequiredLead({
        name: 'Alice',
        email: 'alice@example.com',
        phone: '123456',
        country: 'US',
      }),
      true
    )

    assert.equal(
      hasRequiredLead({
        name: 'Alice',
        email: 'alice@example.com',
        phone: null,
        country: 'US',
      }),
      false
    )
  })

  it('detects user intent to end conversation', () => {
    assert.equal(userWantsToEnd('Thank you, goodbye!'), true)
    assert.equal(userWantsToEnd("No that's all, thank you"), true)
    assert.equal(userWantsToEnd('Tell me more about pricing'), false)
  })

  it('detects assistant closing phrases', () => {
    assert.equal(assistantClosed('Have a great day ahead!'), true)
    assert.equal(assistantClosed('Our team will reach out to you shortly.'), true)
    assert.equal(assistantClosed('What service are you looking for?'), false)
  })
})
