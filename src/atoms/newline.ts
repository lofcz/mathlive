import { Atom } from '../core/atom-class';
import { Box } from '../core/box';
import type { Context } from '../core/context';
import type { CreateAtomOptions, AtomJson, ToLatexOptions } from 'core/types';

export class NewLineAtom extends Atom {
  constructor(options: CreateAtomOptions) {
    super({ type: 'newline', ...options, skipBoundary: true });
  }

  static fromJson(json: AtomJson): NewLineAtom {
    return new NewLineAtom(json as any);
  }

  toJson(): AtomJson {
    return super.toJson();
  }

  render(context: Context): Box {
    const box = new Box(null, {
      classes: 'ML__newline',
      type: 'newline',
    });
    if (this.caret) box.caret = this.caret;
    return this.bind(context, box);
  }

  _serialize(_options: ToLatexOptions): string {
    return '\\\\';
  }
}
