import type { ParseMode, Style } from '../public/core-types';

import { Box } from '../core/box';
import { Context } from '../core/context';
import { latexCommand } from '../core/tokenizer';
import type { AtomJson, ToLatexOptions } from 'core/types';
import { Atom } from '../core/atom-class';
import { PromptAtom } from './prompt';
import { PlaceholderAtom } from './placeholder';

/**
 * A locked, atomic fill-in-the-blank hole.
 *
 * Unlike `\placeholder[id][locked]{…}`, this command has a dedicated
 * serialization (`\blank{answer}`) so host apps can treat blanks as a
 * first-class token. Rendered as a compact dashed box so it stays
 * readable inside fractions and scripts.
 */
export class BlankAtom extends PromptAtom {
  constructor(
    body?: readonly Atom[],
    options?: {
      mode?: ParseMode;
      style?: Style;
    }
  ) {
    super(undefined, undefined, true, body, options);
    this.command = '\\blank';
    this.captureSelection = true;
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

    const content = isEffectivelyEmpty
      ? new PlaceholderAtom({
          mode: this.mode,
          style: this.style,
        }).render(parentContext)
      : Atom.createBox(parentContext, this.body);

    if (!content) return null;

    const result = new Box(content, {
      type: 'ord',
      classes: 'ML__blank',
      isSelected: this.isSelected,
    });
    result.setStyle('display', 'inline-block');
    result.setStyle('padding-left', 0.18, 'em');
    result.setStyle('padding-right', 0.18, 'em');
    result.height = content.height;
    result.depth = content.depth;

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
