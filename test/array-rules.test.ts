import {
  convertLatexToMarkup,
  convertLatexToMathMl,
  validateLatex,
} from '../src/public/mathlive-ssr';
import { parseLatex } from '../src/core/parser';
import { Atom } from '../src/core/atom-class';
import { fromJson } from '../src/core/atom';
import { ArrayAtom } from '../src/atoms/array';

function roundtrip(latex: string): string {
  const atoms = parseLatex(latex, { parseMode: 'math' });
  return Atom.serialize(atoms, { defaultMode: 'math' });
}

function parseArray(latex: string): ArrayAtom {
  const atom = parseLatex(latex, { parseMode: 'math' })[0];
  expect(atom).toBeInstanceOf(ArrayAtom);
  return atom as ArrayAtom;
}

function errorCodes(latex: string): string[] {
  return validateLatex(latex).map((x) => x.code);
}

function count(markup: string, cls: string): number {
  return markup.split(cls).length - 1;
}

const LONG_MULTIPLICATION = String.raw`\begin{array}{rrrrr}
 & & 4 & 3 & 8 \\
\times & & & 2 & 4 \\
\hline
 & 1 & 7 & 5 & 2 \\
+ & 8 & 7 & 6 & \phantom{0} \\
\hline
 1 & 0 & 5 & 1 & 2
\end{array}`;

describe('ARRAY HORIZONTAL RULES', () => {
  test('\\hline in the middle of an array is not an error', () => {
    expect(errorCodes(LONG_MULTIPLICATION)).toEqual([]);
    const markup = convertLatexToMarkup(LONG_MULTIPLICATION);
    expect(markup).not.toContain('ML__error');
    expect(count(markup, 'ML__hline')).toBe(2);
  });

  test('rules are attached to the row they precede', () => {
    const array = parseArray(LONG_MULTIPLICATION);
    expect(array.rowCount).toBe(5);
    expect(array.rowRules).toHaveLength(6);
    expect(array.rowRules.map((x) => x.length)).toEqual([0, 0, 1, 0, 1, 0]);
    expect(array.rowRules[2]).toEqual([{ style: 'solid' }]);
  });

  test('a trailing \\hline is drawn below the last row', () => {
    const array = parseArray(
      String.raw`\begin{array}{|c|c|} \hline a & b \\ \hline c & d \\ \hline \end{array}`
    );
    // The empty row after the last `\\` is dropped (TeX behavior)...
    expect(array.rowCount).toBe(2);
    // ...but its rule survives, below the last row.
    expect(array.rowRules.map((x) => x.length)).toEqual([1, 1, 1]);
  });

  test('consecutive rules (\\hline\\hline) are all kept', () => {
    const array = parseArray(
      String.raw`\begin{array}{cc} \hline\hline a & b \\ \hline \hline c & d \end{array}`
    );
    expect(array.rowRules.map((x) => x.length)).toEqual([2, 2, 0]);
  });

  test('\\hdashline is a dashed rule', () => {
    const array = parseArray(
      String.raw`\begin{array}{cc} 1 & 2 \\ \hdashline 3 & 4 \end{array}`
    );
    expect(array.rowRules[1]).toEqual([{ style: 'dashed' }]);
    const markup = convertLatexToMarkup(
      String.raw`\begin{array}{cc} 1 & 2 \\ \hdashline 3 & 4 \end{array}`
    );
    expect(count(markup, 'ML__hdashline')).toBe(1);
    expect(markup).toContain('dashed');
  });

  test('\\cline{i-j} is a partial rule with 0-based columns', () => {
    const array = parseArray(
      String.raw`\begin{array}{ccc} 1 & 2 & 3 \\ \cline{1-2} 4 & 5 & 6 \\ \cline{3} 7 & 8 & 9 \end{array}`
    );
    expect(array.rowRules[1]).toEqual([{ style: 'solid', from: 0, to: 1 }]);
    expect(array.rowRules[2]).toEqual([{ style: 'solid', from: 2, to: 2 }]);
  });

  test('\\cline is drawn in each spanned column and the gaps between them', () => {
    const markup = convertLatexToMarkup(
      String.raw`\begin{array}{ccc} 1 & 2 & 3 \\ \cline{1-2} 4 & 5 & 6 \end{array}`
    );
    // 2 columns + 1 gap
    expect(count(markup, 'ML__hline')).toBe(3);
  });

  test('rules work in every tabular environment', () => {
    for (const latex of [
      String.raw`\begin{pmatrix} 1 & 2 \\ \hline 3 & 4 \end{pmatrix}`,
      String.raw`\begin{bmatrix} 1 & 2 \\ \hline 3 & 4 \end{bmatrix}`,
      String.raw`\begin{cases} 1 & x \\ \hline 0 & y \end{cases}`,
      String.raw`\begin{aligned} a &= b \\ \hline c &= d \end{aligned}`,
      String.raw`\begin{matrix} 1 \\ \hline 2 \end{matrix}`,
      String.raw`\begin{array}{cc} 1 & 2 \\[4pt] \hline 3 & 4 \end{array}`,
    ]) {
      expect(errorCodes(latex)).toEqual([]);
      expect(count(convertLatexToMarkup(latex), 'ML__hline')).toBe(1);
    }
  });

  test('\\hline outside a row start is still an error, as in LaTeX', () => {
    expect(errorCodes(String.raw`a \hline b`)).toEqual(['unknown-command']);
    expect(
      errorCodes(
        String.raw`\begin{array}{cc} 1 & 2 \hline \\ 3 & 4 \end{array}`
      )
    ).toEqual(['unknown-command']);
  });

  test('an invalid \\cline argument is reported', () => {
    expect(
      errorCodes(
        String.raw`\begin{array}{cc} 1 & 2 \\ \cline{x} 3 & 4 \end{array}`
      )
    ).toEqual(['missing-argument']);
  });

  test.each([
    String.raw`\begin{array}{rr}a & b\\ \hline c & d\end{array}`,
    String.raw`\begin{array}{rr}\hline a & b\\ \hline c & d\\ \hline \end{array}`,
    String.raw`\begin{array}{rr}\hline \hline a & b\\ \hdashline c & d\end{array}`,
    String.raw`\begin{array}{ccc}1 & 2 & 3\\ \cline{1-2} 4 & 5 & 6\\ \cline{3-3} 7 & 8 & 9\end{array}`,
    String.raw`\begin{pmatrix}1 & 2\\ \hline 3 & 4\end{pmatrix}`,
  ])('serialization roundtrips %s', (latex) => {
    expect(roundtrip(latex)).toBe(latex);
  });

  test('rules survive a JSON roundtrip', () => {
    const array = parseArray(
      String.raw`\begin{array}{cc} \hline 1 & 2 \\ \cline{2-2} 3 & 4 \\ \hline \end{array}`
    );
    const copy = fromJson(array.toJson()) as ArrayAtom;
    expect(copy).toBeInstanceOf(ArrayAtom);
    expect(copy.rowRules).toEqual(array.rowRules);
    expect(Atom.serialize([copy], { defaultMode: 'math' })).toBe(
      Atom.serialize([array], { defaultMode: 'math' })
    );
  });

  test('adding and removing rows keeps rules attached', () => {
    const array = parseArray(
      String.raw`\begin{array}{cc} a & b \\ \hline c & d \\ \hline \end{array}`
    );
    array.addRowBefore(1);
    expect(array.rowCount).toBe(3);
    // The rule that was above `c & d` is still above it
    expect(array.rowRules.map((x) => x.length)).toEqual([0, 0, 1, 1]);

    array.removeRow(2);
    expect(array.rowCount).toBe(2);
    // Dropping `c & d` drops the rule above it; the bottom rule remains
    expect(array.rowRules.map((x) => x.length)).toEqual([0, 0, 1]);
  });

  test('adding and removing columns keeps \\cline spans in sync', () => {
    const array = parseArray(
      String.raw`\begin{array}{ccc} 1 & 2 & 3 \\ \cline{2-3} 4 & 5 & 6 \end{array}`
    );
    array.addColumnBefore(0);
    expect(array.rowRules[1]).toEqual([{ style: 'solid', from: 2, to: 3 }]);
    array.removeColumn(3);
    expect(array.rowRules[1]).toEqual([{ style: 'solid', from: 2, to: 2 }]);
    array.removeColumn(2);
    expect(array.rowRules[1]).toEqual([]);
  });

  test('MathML exports rules between rows', () => {
    expect(
      convertLatexToMathMl(
        String.raw`\begin{array}{cc} 1 & 2 \\ \hline 3 & 4 \\ 5 & 6 \\ \hdashline 7 & 8 \end{array}`
      )
    ).toContain('rowlines="solid none dashed"');
  });
});

describe('ADDITIONAL STANDARD COMMANDS', () => {
  test.each([
    String.raw`a\negmedspace b`,
    String.raw`a\negthickspace b`,
    String.raw`a\allowbreak b\nobreak c`,
    String.raw`\clap{x}`,
    String.raw`\mathclap{x}`,
    String.raw`\hbox{some text}`,
  ])('%s is not an error', (latex) => {
    expect(errorCodes(latex)).toEqual([]);
    expect(convertLatexToMarkup(latex)).not.toContain('ML__error');
  });

  test.each([
    String.raw`a\negmedspace b`,
    String.raw`a\negthickspace b`,
    String.raw`\clap{x}`,
    String.raw`\hbox{some text}`,
  ])('%s roundtrips', (latex) => {
    expect(roundtrip(latex)).toBe(latex);
  });
});
