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

describe('fraction serialization', () => {
  afterEach(() => {
    _MathEnvironment.compactFractionSerialization = true;
  });

  test('compact (default)', () => {
    expect(roundtrip('\\frac{1}{2}')).toBe('\\frac12');
  });

  test('explicit braces when compactFractionSerialization is false', () => {
    _MathEnvironment.compactFractionSerialization = false;
    expect(roundtrip('\\frac{1}{2}')).toBe('\\frac{1}{2}');
    expect(roundtrip('\\frac{12}{2}')).toBe('\\frac{12}{2}');
  });
});
