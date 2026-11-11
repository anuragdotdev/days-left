import { describe, expect, it } from 'vitest';
import { dayPhase } from './calendar';

const TODAY = '2026-11-11';
const DEADLINE = '2026-12-31';

describe('dayPhase', () => {
  it('marks days before today as past', () => {
    expect(dayPhase('2026-11-10', TODAY, DEADLINE)).toBe('past');
    expect(dayPhase('2026-01-01', TODAY, DEADLINE)).toBe('past');
    expect(dayPhase('2025-12-31', TODAY, DEADLINE)).toBe('past');
  });

  it('marks today as today', () => {
    expect(dayPhase(TODAY, TODAY, DEADLINE)).toBe('today');
  });

  it('marks days between today and the deadline as active', () => {
    expect(dayPhase('2026-11-12', TODAY, DEADLINE)).toBe('active');
    expect(dayPhase('2026-12-01', TODAY, DEADLINE)).toBe('active');
    expect(dayPhase('2026-12-30', TODAY, DEADLINE)).toBe('active');
  });

  it('includes the deadline itself in the active window', () => {
    expect(dayPhase(DEADLINE, TODAY, DEADLINE)).toBe('active');
  });

  it('marks days after the deadline as beyond', () => {
    expect(dayPhase('2027-01-01', TODAY, DEADLINE)).toBe('beyond');
    expect(dayPhase('2027-06-15', TODAY, DEADLINE)).toBe('beyond');
  });

  it('keeps days struck through when the deadline is already in the past', () => {
    const pastDeadline = '2026-06-01';
    expect(dayPhase('2026-05-31', TODAY, pastDeadline)).toBe('past');
    expect(dayPhase('2026-06-01', TODAY, pastDeadline)).toBe('past');
    expect(dayPhase('2026-06-02', TODAY, pastDeadline)).toBe('past');
    expect(dayPhase('2026-11-11', TODAY, pastDeadline)).toBe('today');
    expect(dayPhase('2026-11-12', TODAY, pastDeadline)).toBe('beyond');
  });

  it('marks every day active when the deadline is today', () => {
    expect(dayPhase('2026-11-10', TODAY, TODAY)).toBe('past');
    expect(dayPhase(TODAY, TODAY, TODAY)).toBe('today');
    expect(dayPhase('2026-11-12', TODAY, TODAY)).toBe('beyond');
  });
});
