import React from 'react';
import { TreeProps } from './types';

type NodeProps<T> = {
  item: TreeProps<T>['data'][number];
  onExpand: () => void;
  isExpanded?: boolean;
};

function Node<T>(props: NodeProps<T>): React.JSX.Element {
  const hasChild = props.item.children;
  const hasComponent = props.item.jsxElement ? true : false;

  return (
    <div onClick={props.item.children?.length ? props.onExpand : undefined} draggable onDragStart={props.item.onDrag}>
      {hasComponent ? (
        props.item.jsxElement
      ) : (
        <p className="font-bold uppercase">
          <span className="pr-2">{hasChild ? (props.isExpanded ? '▾ ' : '▸ ') : ''}</span>
          {props.item.name}
        </p>
      )}
    </div>
  );
}

export default Node;
