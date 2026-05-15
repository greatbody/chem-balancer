// Exact rational arithmetic using BigInt — required for chemistry balancing
// to avoid floating-point drift in Gaussian elimination.

export class Rational {
  readonly n: bigint; // numerator
  readonly d: bigint; // denominator, always > 0

  constructor(n: bigint | number, d: bigint | number = 1n) {
    let bn = typeof n === 'bigint' ? n : BigInt(n);
    let bd = typeof d === 'bigint' ? d : BigInt(d);
    if (bd === 0n) throw new Error('Rational denominator cannot be zero');
    if (bd < 0n) {
      bn = -bn;
      bd = -bd;
    }
    const g = gcd(abs(bn), bd);
    this.n = bn / g;
    this.d = bd / g;
  }

  static zero(): Rational {
    return new Rational(0n, 1n);
  }
  static one(): Rational {
    return new Rational(1n, 1n);
  }

  isZero(): boolean {
    return this.n === 0n;
  }
  isNegative(): boolean {
    return this.n < 0n;
  }

  add(o: Rational): Rational {
    return new Rational(this.n * o.d + o.n * this.d, this.d * o.d);
  }
  sub(o: Rational): Rational {
    return new Rational(this.n * o.d - o.n * this.d, this.d * o.d);
  }
  mul(o: Rational): Rational {
    return new Rational(this.n * o.n, this.d * o.d);
  }
  div(o: Rational): Rational {
    if (o.n === 0n) throw new Error('Division by zero');
    return new Rational(this.n * o.d, this.d * o.n);
  }
  neg(): Rational {
    return new Rational(-this.n, this.d);
  }
  equals(o: Rational): boolean {
    return this.n === o.n && this.d === o.d;
  }

  toString(): string {
    return this.d === 1n ? this.n.toString() : `${this.n}/${this.d}`;
  }
}

export function gcd(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a === 0n ? 1n : a;
}

export function lcm(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n;
  return abs(a / gcd(a, b) * b);
}

export function abs(a: bigint): bigint {
  return a < 0n ? -a : a;
}
