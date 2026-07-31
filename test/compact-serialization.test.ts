import '../src/public/mathlive-ssr';
import { parseLatex } from '../src/core/parser';
import { Atom } from '../src/core/atom-class';
import { _MathEnvironment } from '../src/core/math-environment';

function roundtrip(latex: string): string {
  const atoms = parseLatex(latex, { parseMode: 'math' });
  // Discard verbatim LaTeX so the serializer logic is exercised
  for (const atom of atoms) atom.verbatimLatex = undefined;
  return Atom.serialize(atoms, { defaultMode: 'math' });
}

describe('compact serialization', () => {
  afterEach(() => {
    _MathEnvironment.compactSerialization = true;
  });

  test('compact (default)', () => {
    expect(roundtrip('\\frac{1}{2}')).toBe('\\frac12');
    expect(roundtrip('\\sqrt{2}')).toBe('\\sqrt2');
  });

  test('explicit braces when compactSerialization is false', () => {
    _MathEnvironment.compactSerialization = false;
    expect(roundtrip('\\frac{1}{2}')).toBe('\\frac{1}{2}');
    expect(roundtrip('\\frac{12}{2}')).toBe('\\frac{12}{2}');
    expect(roundtrip('\\sqrt{2}')).toBe('\\sqrt{2}');
    expect(roundtrip('\\sqrt{12}')).toBe('\\sqrt{12}');
    expect(roundtrip('\\sqrt[3]{8}')).toBe('\\sqrt[3]{8}');
  });

  test('`\\sqrt12` is the root of 1, followed by 2', () => {
    // `\sqrt` takes a single mandatory argument, so `\sqrt12` is
    // `\sqrt{1}2`, not `\sqrt{12}`
    expect(roundtrip('\\sqrt12')).toBe('\\sqrt12');
    _MathEnvironment.compactSerialization = false;
    expect(roundtrip('\\sqrt12')).toBe('\\sqrt{1}2');
  });
});
