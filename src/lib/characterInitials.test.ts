import { describe, expect, it } from 'vitest';
import { characterInitials } from './characterInitials';

describe('characterInitials', () => {
  it('combines the first letter of the first and last words', () => {
    expect(characterInitials('Jon Snow')).toBe('JS');
    expect(characterInitials('Daenerys Targaryen')).toBe('DT');
  });

  it('uses the first and last of more than two words', () => {
    expect(characterInitials('Eddard Stark of Winterfell')).toBe('EW');
  });

  it('takes the first two letters of a single-word name', () => {
    expect(characterInitials('Arya')).toBe('AR');
  });

  it('uppercases the result', () => {
    expect(characterInitials('arya')).toBe('AR');
  });

  it('collapses extra whitespace', () => {
    expect(characterInitials('  Jon   Snow  ')).toBe('JS');
  });

  it('falls back to "?" for an empty name', () => {
    expect(characterInitials('')).toBe('?');
    expect(characterInitials('   ')).toBe('?');
  });
});
