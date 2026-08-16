import type { ParseMode, Style } from '../public/core-types';

import { Box } from '../core/box';
import { Context } from '../core/context';
import { latexCommand } from '../core/tokenizer';
import type { AtomJson, ToLatexOptions } from 'core/types';
import { Atom } from '../core/atom-class';
import { PlaceholderAtom } from './placeholder';

/**
 * A locked fill-in-the-blank hole that serializes as `\blank{answer}`.
 *
 * In the editor it renders as a function: `blank(answer)`. That keeps the
 * argument attached to the command (unlike an unknown `\blank` plus a
 * leftover `4`) and stays readable inside fractions.
 */
export class BlankAtom extends Atom {
  constructor(
    body?: readonly Atom[],
    options?: {
      mode?: ParseMode;
      style?: Style;
    }
  ) {
    super({
      type: 'mop',
      mode: options?.mode ?? 'math',
      style: options?.style,
      command: '\\blank',
      isFunction: true,
      captureSelection: true,
      body,
    });
  }

  static fromJson(json: AtomJson): BlankAtom {
    return new BlankAtom(json.body, json as any);
  }

  render(parentContext: Context): Box | null {
    const context = new Context({ parent: parentContext });

    const isEffectivelyEmpty =
      !this.body ||
      this.body.length === 0 ||
      this.body.every((atom) => atom.type === 'first');

    const arg = isEffectivelyEmpty
      ? new PlaceholderAtom({
          mode: this.mode,
          style: this.style,
        }).render(parentContext)
      : Atom.createBox(parentContext, this.body);

    const name = new Box('blank', {
      type: 'op',
      mode: 'math',
      maxFontSize: context.scalingFactor,
      style: { variant: 'main', variantStyle: 'up' },
      isSelected: this.isSelected,
      letterShapeStyle: context.letterShapeStyle,
    });
    const open = new Box('(', {
      type: 'open',
      isSelected: this.isSelected,
      maxFontSize: context.scalingFactor,
    });
    const close = new Box(')', {
      type: 'close',
      isSelected: this.isSelected,
      maxFontSize: context.scalingFactor,
    });

    const result = new Box([name, open, arg, close], {
      type: 'ord',
      classes: 'ML__blank',
      isSelected: this.isSelected,
    });

    if (this.caret) result.caret = this.caret;

    const withSupSub = this.attachSupsub(parentContext, { base: result });
    return this.bind(context, withSupSub);
  }

  _serialize(options: ToLatexOptions): string {
    const value = this.bodyToLatex(options) ?? '';
    if (options.skipPlaceholders) return value;
    return latexCommand('\\blank', value);
  }
}
