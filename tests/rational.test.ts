import { describe, it, expect } from 'vitest';
import { Rational, gcd, lcm } from '../src/rational';

describe('gcd / lcm', () => {
  it('gcd of positives', () => {
    expect(gcd(12n, 18n)).toBe(6n);
    expect(gcd(7n, 13n)).toBe(1n);
    expect(gcd(0n, 5n)).toBe(5n);
  });
  it('gcd handles negatives', () => {
    expect(gcd(-12n, 18n)).toBe(6n);
    expect(gcd(-12n, -18n)).toBe(6n);
  });
  it('lcm', () => {
    expect(lcm(4n, 6n)).toBe(12n);
    expect(lcm(0n, 6n)).toBe(0n);
    expect(lcm(7n, 5n)).toBe(35n);
  });
});

describe('Rational', () => {
  it('normalizes sign and reduces', () => {
    const r = new Rational(4n, -8n);
    expect(r.n).toBe(-1n);
    expect(r.d).toBe(2n);
  });
  it('arithmetic', () => {
    const a = new Rational(1n, 3n);
    const b = new Rational(1n, 6n);
    expect(a.add(b).equals(new Rational(1n, 2n))).toBe(true);
    expect(a.sub(b).equals(new Rational(1n, 6n))).toBe(true);
    expect(a.mul(b).equals(new Rational(1n, 18n))).toBe(true);
    expect(a.div(b).equals(new Rational(2n, 1n))).toBe(true);
  });
  it('zero check and negation', () => {
    expect(Rational.zero().isZero()).toBe(true);
    expect(new Rational(-3n, 4n).isNegative()).toBe(true);
    expect(new Rational(3n, 4n).neg().equals(new Rational(-3n, 4n))).toBe(true);
  });
  it('throws on zero denominator', () => {
    expect(() => new Rational(1n, 0n)).toThrow();
  });
  it('throws on division by zero', () => {
    expect(() => new Rational(1n, 2n).div(Rational.zero())).toThrow();
  });
  it('toString', () => {
    expect(new Rational(3n, 1n).toString()).toBe('3');
    expect(new Rational(3n, 2n).toString()).toBe('3/2');
  });
  it('accepts number literals', () => {
    expect(new Rational(2, 4).equals(new Rational(1n, 2n))).toBe(true);
  });
});
