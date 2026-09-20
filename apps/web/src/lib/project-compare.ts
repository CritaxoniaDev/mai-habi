import type { FileMap, ProjectFile } from '@mai-habi/types';

export type FileChangeKind = 'added' | 'removed' | 'modified';
export type LineChangeKind = 'same' | 'added' | 'removed' | 'changed';

export interface LineDiffRow {
  kind: LineChangeKind;
  leftNumber: number | null;
  leftText: string;
  rightNumber: number | null;
  rightText: string;
}

export interface ProjectFileChange {
  path: string;
  kind: FileChangeKind;
  left: ProjectFile | null;
  right: ProjectFile | null;
}

export interface ProjectComparison {
  added: ProjectFileChange[];
  removed: ProjectFileChange[];
  modified: ProjectFileChange[];
  unchanged: number;
}

function textFiles(files: FileMap): Map<string, ProjectFile> {
  return new Map(
    Object.values(files).flatMap((node) =>
      node.type === 'file' ? [[node.path, node]] : [],
    ),
  );
}

export function compareProjectFiles(
  leftFiles: FileMap,
  rightFiles: FileMap,
): ProjectComparison {
  const left = textFiles(leftFiles);
  const right = textFiles(rightFiles);
  const result: ProjectComparison = {
    added: [],
    removed: [],
    modified: [],
    unchanged: 0,
  };
  const paths = [...new Set([...left.keys(), ...right.keys()])].sort((a, b) =>
    a.localeCompare(b),
  );

  for (const path of paths) {
    const before = left.get(path) ?? null;
    const after = right.get(path) ?? null;
    if (!before && after)
      result.added.push({ path, kind: 'added', left: null, right: after });
    else if (before && !after)
      result.removed.push({ path, kind: 'removed', left: before, right: null });
    else if (
      before &&
      after &&
      (before.content !== after.content || before.encoding !== after.encoding)
    )
      result.modified.push({
        path,
        kind: 'modified',
        left: before,
        right: after,
      });
    else result.unchanged += 1;
  }

  return result;
}

type LineOp = { kind: 'same' | 'added' | 'removed'; text: string };

function fallbackOps(left: string[], right: string[]): LineOp[] {
  const operations: LineOp[] = [];
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] === right[index] && left[index] !== undefined) {
      operations.push({ kind: 'same', text: left[index] });
    } else {
      if (left[index] !== undefined)
        operations.push({ kind: 'removed', text: left[index] });
      if (right[index] !== undefined)
        operations.push({ kind: 'added', text: right[index] });
    }
  }
  return operations;
}

/** A bounded line LCS. Large generated files use positional alignment instead. */
function lineOperations(left: string[], right: string[]): LineOp[] {
  if (left.length * right.length > 250_000) return fallbackOps(left, right);

  const width = right.length + 1;
  const matrix = new Uint32Array((left.length + 1) * width);
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const index = row * width + column;
      matrix[index] =
        left[row - 1] === right[column - 1]
          ? matrix[(row - 1) * width + column - 1] + 1
          : Math.max(
              matrix[(row - 1) * width + column],
              matrix[row * width + column - 1],
            );
    }
  }

  const operations: LineOp[] = [];
  let row = left.length;
  let column = right.length;
  while (row > 0 || column > 0) {
    if (row > 0 && column > 0 && left[row - 1] === right[column - 1]) {
      operations.push({ kind: 'same', text: left[row - 1] });
      row -= 1;
      column -= 1;
    } else if (
      row > 0 &&
      (column === 0 ||
        matrix[(row - 1) * width + column] >= matrix[row * width + column - 1])
    ) {
      operations.push({ kind: 'removed', text: left[row - 1] });
      row -= 1;
    } else {
      operations.push({ kind: 'added', text: right[column - 1] });
      column -= 1;
    }
  }

  return operations.reverse();
}

export function createSideBySideDiff(
  leftContent: string,
  rightContent: string,
): LineDiffRow[] {
  const operations = lineOperations(
    leftContent.split('\n'),
    rightContent.split('\n'),
  );
  const rows: LineDiffRow[] = [];
  let leftNumber = 1;
  let rightNumber = 1;

  for (let index = 0; index < operations.length;) {
    const operation = operations[index];
    if (operation.kind === 'same') {
      rows.push({
        kind: 'same',
        leftNumber: leftNumber++,
        leftText: operation.text,
        rightNumber: rightNumber++,
        rightText: operation.text,
      });
      index += 1;
      continue;
    }

    const removed: string[] = [];
    const added: string[] = [];
    while (index < operations.length && operations[index].kind !== 'same') {
      const current = operations[index];
      if (current.kind === 'removed') removed.push(current.text);
      else added.push(current.text);
      index += 1;
    }

    const count = Math.max(removed.length, added.length);
    for (let offset = 0; offset < count; offset += 1) {
      const before = removed[offset];
      const after = added[offset];
      rows.push({
        kind:
          before !== undefined && after !== undefined
            ? 'changed'
            : before !== undefined
              ? 'removed'
              : 'added',
        leftNumber: before === undefined ? null : leftNumber++,
        leftText: before ?? '',
        rightNumber: after === undefined ? null : rightNumber++,
        rightText: after ?? '',
      });
    }
  }

  return rows;
}
