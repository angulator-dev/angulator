import {
  Rule,
  SchematicContext,
  Tree,
  url,
  apply,
  template,
  mergeWith,
  move,
} from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';

export function query(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const sourceTemplates = url('./files');

    const sourceParametrizedTemplates = apply(sourceTemplates, [
      template({
        ..._options,
        ...strings,
      }),
      // Custom rule to rename files
      (tree: Tree) => {
        tree.visit((path) => {
          if (path.endsWith('.template')) {
            const newPath = path.slice(0, -'.template'.length);
            tree.rename(path, newPath);
          }
        });
        return tree;
      },
      move('src/app/queries'),
    ]);

    return mergeWith(sourceParametrizedTemplates)(tree, _context);
  };
}
