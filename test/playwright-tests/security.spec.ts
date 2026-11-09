import { test, expect } from '@playwright/test';
import type { MathfieldElement } from '../../src/public/mathfield-element';

const payloads = [
  String.raw`\text{<img src=x onerror=globalThis.__mathXss=1>}`,
  String.raw`\enclose{updiagonalstrike}[shadow="x onmouseover=globalThis.__mathXss=1//"]{x}`,
  String.raw`\enclose{updiagonalstrike}[shadow="x"onmouseover="globalThis.__mathXss=1//"]{x}`,
  String.raw`\enclose{updiagonalarrow}[mathcolor="red"onmouseover="globalThis.__mathXss=1//"]{x}`,
];

for (const tag of ['math-field', 'math-span', 'math-div']) {
  test(`${tag} keeps stored LaTeX out of HTML attributes and elements`, async ({
    page,
  }) => {
    await page.goto('/dist/playwright-test-page/');
    await page.evaluate(async () => {
      await customElements.whenDefined('math-field');
    });

    for (const latex of payloads) {
      // Store and reload the serialized value, as consumers do when editing
      // an existing equation. Use the public APIs, without a createHTML hook.
      await page.evaluate(
        ({ tag, latex }) => {
          const field = document.createElement(
            'math-field'
          ) as MathfieldElement;
          document.body.append(field);
          field.setValue(latex);
          localStorage.setItem('security-latex', field.getValue());
          field.remove();
          localStorage.setItem('security-tag', tag);
        },
        { tag, latex }
      );
      await page.reload();
      await page.evaluate(async () => {
        const tag = localStorage.getItem('security-tag')!;
        await customElements.whenDefined(tag);
        const element = document.createElement(tag);
        element.id = 'security-math';
        document.body.append(element);
        const latex = localStorage.getItem('security-latex')!;
        if (tag === 'math-field') (element as MathfieldElement).setValue(latex);
        else {
          element.textContent = latex;
          (element as HTMLElement & { render(): void }).render();
        }
      });
      const equation = page.locator('#security-math');
      await expect(equation.locator('.ML__latex')).toBeVisible();
      const result = await equation.evaluate((element) => {
        const roots = [element, element.shadowRoot].filter(
          Boolean
        ) as ParentNode[];
        const nodes = roots.flatMap((root) =>
          Array.from(root.querySelectorAll('*'))
        );
        for (const node of nodes)
          node.dispatchEvent(new MouseEvent('mouseover'));
        return {
          executed: Boolean((globalThis as any).__mathXss),
          handlers: nodes.flatMap((node) =>
            Array.from(node.attributes)
              .filter((attr) => /^on/i.test(attr.name))
              .map((attr) => attr.name)
          ),
          images: nodes.filter((node) => node.tagName.toLowerCase() === 'img')
            .length,
        };
      });
      expect(result).toEqual({ executed: false, handlers: [], images: 0 });
      await equation.evaluate((element) => element.remove());
    }
  });
}

test('enclosures preserve SVG shadows and stroke styling', async ({ page }) => {
  await page.goto('/dist/playwright-test-page/');
  await page.evaluate(async () => {
    await customElements.whenDefined('math-field');
    (document.querySelector('#mf-1') as MathfieldElement).setValue(
      String.raw`\enclose{updiagonalstrike}[shadow="auto",2px dashed red]{x}`
    );
  });
  const svg = page.locator('#mf-1 .ML__latex svg');
  await expect(svg).toHaveAttribute('stroke', 'red');
  await expect(svg).toHaveAttribute('stroke-width', '2px');
  await expect(svg).toHaveAttribute('stroke-dasharray', '5,5');
  expect(
    await svg.evaluate((node) => (node as SVGElement).style.filter)
  ).toContain('drop-shadow(');
  expect(
    await svg.evaluate((node) => (node as SVGElement).style.filter)
  ).not.toContain('auto');
});
