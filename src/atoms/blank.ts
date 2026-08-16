import type { ParseMode, Style } from '../public/core-types';

import { Box } from '../core/box';
import { Context } from '../core/context';
import { latexCommand } from '../core/tokenizer';
import type { AtomJson, ToLatexOptions } from 'core/types';
import { Atom } from '../core/atom-class';
import { PromptAtom } from './prompt';

/**
 * A locked, atomic fill-in-the-blank hole.
 *
 * Unlike `\placeholder[id][locked]{…}`, this command has a dedicated
 * serialization (`\blank{answer}`) so host apps can treat blanks as a
 * first-class token.
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
    const result = super.render(parentContext);
    if (!result) return null;
    result.classes = result.classes
      ? `${result.classes} ML__blank`
      : 'ML__blank';
    result.setStyle('margin-left', 0.12, 'em');
    result.setStyle('margin-right', 0.12, 'em');
    return result;
  }

  _serialize(options: ToLatexOptions): string {
    const value = this.bodyToLatex(options) ?? '';
    if (options.skipPlaceholders) return value;
    return latexCommand('\\blank', value);
  }
}
